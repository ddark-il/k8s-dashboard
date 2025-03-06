import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ProvisionList, SecretDetail} from '@api/root.api';
import {StringMap} from '@api/root.shared';
import {lastValueFrom} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';


@Injectable()
export class CWM {

  private spec_url :string
  private spec_cpu :string
  private spec_ram :string
  private spec_password :string
  private spec_billing :string
  private spec_disk :string
  private spec_os :string
  private spec_dc :string
  private spec_traffic :string
  private spec_clientId :string
  private spec_apiKey :string
  private spec_masterIP :string
  private readonly matDialog_: MatDialog

  constructor(private readonly http_: HttpClient) {
    this.getProviderSecret().then(d => {
      this.spec_url = atob(d.data["url"]).trim()
      this.spec_cpu = atob(d.data["cpu"]).trim()
      this.spec_ram = atob(d.data["ram"]).trim()
      this.spec_password = d.data["password"].trim()
      this.spec_billing = atob(d.data["billingCycle"]).trim()
      this.spec_disk = atob(d.data["disk0size"]).trim()
      this.spec_os =  atob(d.data["imageid"]).trim()
      this.spec_dc = atob(d.data["zone"]).trim()
      this.spec_traffic =  atob(d.data["trafficpackage"]).trim()
      this.spec_masterIP = atob(d.data["ip0"]).trim()
      this.spec_clientId = d.data["apiClientId"].trim()
      this.spec_apiKey = d.data["apiSecret"].trim()
    }
    )
  }

  private getProviderSecret(params?: HttpParams) {
    return lastValueFrom(this.http_.get<SecretDetail>(`api/v1/secret/kube-system/provider-guest-secret`, {params}));
  }

  getQueue(){
    return this.http_.get<ProvisionList>(`/provision/queue`, {responseType: 'json'});
  }

  deployNode(name: string) {
    return lastValueFrom(this.http_.post<StringMap>(
        `/provision/create`,
        {
          "spec": {
            "disk_src_0": this.spec_os,
            "datacenter": this.spec_dc,
            "name": name,
            "cpu": this.spec_cpu,
            "ram": this.spec_ram,
            "billing": this.spec_billing,
            "network_name_0": "wan",
            "network_ip_0": "auto",
            "traffic": this.spec_traffic,
            "disk_size_0": this.spec_disk,
            "power": true
          },
          "secrets": {
            "url": this.spec_url,
            "masterIP": this.spec_masterIP,
            "password": this.spec_password,
            "apiClientId": this.spec_clientId,
            "apiSecret": this.spec_apiKey,
          }
        }
     ));
  }
}

