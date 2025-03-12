// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {IConfig} from '@api/root.ui';
import {CONFIG_DI_TOKEN} from '../../../index.config';
import {AlertDialogComponent, AlertDialogConfig} from '../../dialogs/alert/dialog';
import {CWM} from '@common/services/global/cwm';

@Injectable()
export class CreateNode {
  private isDeployInProgress_ = false;

  constructor(
    private readonly matDialog_: MatDialog,
    private readonly cwm_: CWM,
    @Inject(CONFIG_DI_TOKEN) private readonly CONFIG: IConfig
  ) {}

  async deploy(prefix: string, count: number): Promise<Object> {
    for (let index = 1; index < count+1; index++) {
      this.cwm_.deployNode(`${prefix}-${index.toString().padStart(2, '0')}`)
        .then()
        .catch((err) => {
          console.log(err)
          this.reportError_(`${err.name}`,err.error["error"])
        });
    }
    return 0;
  }

  isDeployDisabled(): boolean {
    return this.isDeployInProgress_;
  }

  private reportError_(title: string, message: string): void {
    const configData: AlertDialogConfig = {
      title,
      message,
      confirmLabel: 'OK',
    };
    this.matDialog_.open(AlertDialogComponent, {data: configData});
  }
}
