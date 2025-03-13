from flask import Flask, Response, request
import threading
import time
import base64
import uuid
import json
import requests
import paramiko

app = Flask(__name__)
thread_event = threading.Event()

queue_array = []
provider_token = {
    "authentication" : "",
    "expires": 0
}

def decode_data():
    for item in queue_array:
        if not "status" in item.keys():
            print(item)
            item["secrets"]["password"] = base64.b64decode(item["secrets"]["password"]).decode("ascii").rstrip()
            item["secrets"]["apiClientId"] = base64.b64decode(item["secrets"]["apiClientId"]).decode("ascii").rstrip()
            item["secrets"]["apiSecret"] = base64.b64decode(item["secrets"]["apiSecret"]).decode("ascii").rstrip()
            item["received"] = int(time.time())
            item["status"] = 1

def get_provider_token(item):
    if int(time.time()) > provider_token["expires"]:
        headers = {
        "content-type": "application/json"
        }
        payload = {
            "clientId" : item["secrets"]["apiClientId"],
            "secret" : item["secrets"]["apiSecret"]
        }
        token =  json.loads(requests.request("post", "https://"+item["secrets"]["url"]+"/service/authenticate", headers=headers, data=json.dumps(payload)).text)
        provider_token["authentication"] = token["authentication"]
        provider_token["expires"] = int(token["expires"])
    return provider_token

def send_deploy_to_provider(token,item):
    headers = {
        "content-type": "application/json",
        "Authorization": "Bearer "+token["authentication"]
    }
    payload = {
            "disk_src_0": item["spec"]["disk_src_0"],
            "datacenter": item["spec"]["datacenter"],
            "name": item["spec"]["name"],
            "cpu": item["spec"]["cpu"],
            "ram": item["spec"]["ram"],
            "billing": item["spec"]["billing"],
            "network_name_0": item["spec"]["network_name_0"],
            "network_ip_0": item["spec"]["network_ip_0"],
            "traffic": item["spec"]["traffic"],
            "disk_size_0": item["spec"]["disk_size_0"],
            "power": item["spec"]["power"],
            "password": item["secrets"]["password"]
    }
    return requests.request("post", "https://"+item["secrets"]["url"]+"/service/server", headers=headers, data=json.dumps(payload))

def get_servers_list(token,item):
    headers = {
        "content-type": "application/json",
        "Authorization": "Bearer "+token["authentication"]
    }
    return requests.request("get", "https://"+item["secrets"]["url"]+"/service/servers", headers=headers)

def get_server_data(token,item):
    headers = {
        "content-type": "application/json",
        "Authorization": "Bearer "+token["authentication"]
    }
    return requests.request("get", "https://"+item["secrets"]["url"]+"/service/server/"+item["server_id"], headers=headers)

def send_requests_to_provider():
    for item in queue_array:
        if "status" in item.keys():
            if item["status"] == 1:
                deploy = json.loads(send_deploy_to_provider(get_provider_token(item),item).text)
                print(deploy)
                item["request_id"] = deploy[0]
                item["status"] = 3

def update_provider_data():
    for item in queue_array:
        if "status" in item.keys():
            if item["status"] == 3:
                response = json.loads(get_servers_list(get_provider_token(item),item).text)
                for server in response:
                    if server["name"] == item["spec"]["name"]:
                        item["server_id"] = server["id"]
                        item["status"] = 4
                        print(item["server_id"])
            if item["status"] == 4:
                response = json.loads(get_server_data(get_provider_token(item),item).text)
                item["spec"]["network_name_0"] = response["networks"][0]["network"]
                item["spec"]["network_ip_0"] = response["networks"][0]["ips"][0]
                item["status"] = 5

def get_connection_ip(item):
    return item["spec"]["network_ip_0"]


def connect_to_nodes():
    for item in queue_array:
        if "status" in item.keys():
            if item["status"] == 5:
                ssh_client = paramiko.SSHClient()
                try:
                    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    ssh_client.connect(get_connection_ip(item), username="root", password=item["secrets"]["password"])
                    item["status"] = 6
                    stdin, stdout, stderr = ssh_client.exec_command("snap install microk8s --classic --channel=1.32")
                    print(stdout.readlines())
                    item["status"] = 7
                    stdin, stdout, stderr = ssh_client.exec_command("microk8s addons repo remove core")
                    stdin, stdout, stderr = ssh_client.exec_command("microk8s addons repo add core-fork https://github.com/ddark-il/microk8s-core-addons.git")
                    ssh_client.close()     
                except Exception as err:
                    print(f"Unexpected {err=}, {type(err)=}")
                    ssh_client.close()

def get_join_cmd():
    for item in queue_array:
        if "status" in item.keys():
            if item["status"] == 7:
                ssh_client = paramiko.SSHClient()
                try:
                    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    ssh_client.connect(item["secrets"]["masterIP"], username="root", password=item["secrets"]["password"])
                    stdin, stdout, stderr = ssh_client.exec_command("microk8s add-node | grep worker | grep microk8s")
                    item["join_cmd"] = stdout.readlines()[0].strip()
                    print(item["join_cmd"])
                    item["status"] = 8
                except Exception as err:
                    print(f"Unexpected {err=}, {type(err)=}")
                    ssh_client.close()

def join_nodes():
    for item in queue_array:
        if "status" in item.keys():
            if item["status"] == 8:
                ssh_client = paramiko.SSHClient()
                try:
                    ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    ssh_client.connect(get_connection_ip(item), username="root", password=item["secrets"]["password"])
                    stdin, stdout, stderr = ssh_client.exec_command(item["join_cmd"])
                    print(stdout.readlines())
                    item["status"] = 9
                except Exception as err:
                    print(f"Unexpected {err=}, {type(err)=}")
                    ssh_client.close()


def parseStatus(status):
    if status == 1:
        return "Request received"
    elif status == 3:
        return "Node creation request sent to cloud provider"
    elif status == 4:
        return "Node created"
    elif status == 5:
        return "Network information acquired"
    elif status == 6:
        return "Provisioning Kubernetes node"
    elif status == 7:
        return "Node provisioned, requesting join token"
    elif status == 8:
        return "Joining the cluster"
    elif status == 9:
        return "Finished"
    else:
        return "Status unknown"

def processQueue():
    while thread_event.is_set():
        decode_data()
        send_requests_to_provider()
        update_provider_data()
        connect_to_nodes()
        get_join_cmd()
        join_nodes()
        time.sleep(5)

@app.route('/')
def index():
    return 'Nothing here'

@app.route('/provision/create',methods=["POST"])
def create():
    queue_array.append(request.json)
    return Response(status=200)

@app.route('/provision/queue')
def queue():
    response_map = {
        "listMeta":{
            "totalItems": len(queue_array)
        },
        "nodes":[]
    }
    for item in queue_array:
        if "received" in item.keys():
            node_item = {
                "objectMeta": {
                    "uid": str(uuid.uuid4()),
                    "name": item["spec"]["name"]
                },
                "created": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(item["received"])),
                "status": parseStatus(item["status"]),
                "error": ""
            }
            response_map["nodes"].append(node_item)
    return Response(json.dumps(response_map),mimetype='application/json')

if __name__ == "__main__":
    thread_event.set()
    thread = threading.Thread(target=processQueue)
    thread.start()
    app.run(host='0.0.0.0' , port=5000)