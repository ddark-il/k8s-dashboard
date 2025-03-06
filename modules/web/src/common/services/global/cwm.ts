import {HttpClient, HttpParams, HttpHeaders, HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {SecretDetail} from '@api/root.api';
import { StringMap } from '@api/root.shared';
import {lastValueFrom} from 'rxjs';
import {AlertDialogComponent, AlertDialogConfig} from '../../dialogs/alert/dialog';
import {MatDialog} from '@angular/material/dialog';
import {AsKdError} from '@common/errors/errors';

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
  private readonly matDialog_: MatDialog

  private headerDict  = {
    'Content-Type': 'application/json',
    'Authorization': '',
  }
  
  constructor(private readonly http_: HttpClient) {
    this.getProviderSecret().then(d => {
      this.spec_url = atob(d.data["url"]).trim()
      this.spec_cpu = atob(d.data["cpu"]).trim()
      this.spec_ram = atob(d.data["ram"]).trim()
      this.spec_password = atob(d.data["password"]).trim()
      this.spec_billing = atob(d.data["billingCycle"]).trim()
      this.spec_disk = atob(d.data["disk0size"]).trim()
      this.spec_os =  atob(d.data["imageid"]).trim()
      this.spec_dc = atob(d.data["zone"]).trim()
      this.spec_traffic =  atob(d.data["trafficpackage"]).trim()

      this.getProviderToken(atob(d.data["apiClientId"]).trim(),atob(d.data["apiSecret"]).trim()).then(tkn =>{
        this.headerDict.Authorization = `Bearer ${tkn["authentication"]}`
      })
    }
    )
  }

  private getProviderSecret(params?: HttpParams) {
    return lastValueFrom(this.http_.get<SecretDetail>(`api/v1/secret/kube-system/provider-guest-secret`, {params}));
  }

  private getProviderToken(client:string,api_key:string) {
    return lastValueFrom(this.http_.post<StringMap>(
       `https://${this.spec_url}/service/authenticate`,
       {
        "clientId": client,
        "secret": api_key
       },
       {headers: new HttpHeaders(this.headerDict)}
    ));
  }

  deployNode(name: string, isprivate: boolean) {
    console.log(isprivate)
    return lastValueFrom(this.http_.post<StringMap>(
        `https://${this.spec_url}/service/server`,
        {
          "disk_src_0": this.spec_os,
          "datacenter": this.spec_dc,
          "name": name,
          "cpu": this.spec_cpu,
          "ram": this.spec_ram,
          "password": this.spec_password,
          "billing": this.spec_billing,
          "network_name_0": "wan",
          "traffic": this.spec_traffic,
          "disk_size_0": this.spec_disk,
          "power": true
        },
        {headers: new HttpHeaders(this.headerDict)}
     ));
  }
}

