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


import {ICanDeactivate} from '@common/interfaces/candeactivate';
import {AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {CreateNode} from '@common/services/create/node';
import {HistoryService} from '@common/services/global/history';
import {Component, OnInit} from '@angular/core';
import {FormValidators} from './validator/validators';
import {Router} from '@angular/router';
import {NAMESPACE_STATE_PARAM} from '@common/params/params';
import {NamespaceService} from '@common/services/global/namespace';

@Component({
  selector: 'kd-create-from-node',
  templateUrl: './template.html',
  styleUrls: ['./style.scss'],
})
export class CreateFromNodeComponent extends ICanDeactivate implements OnInit {
  form: UntypedFormGroup;
  private created_ = false;
  readonly nameMaxLength = 24;
  

  constructor(
    private readonly create_: CreateNode,
    private readonly history_: HistoryService,
    private readonly fb_: UntypedFormBuilder,
    private readonly router_: Router,
    private readonly namespace_: NamespaceService,
  ) {
    super();
  }


  get nodePrefix(): AbstractControl {
    return this.form.get('nodePrefix');
  }

  get nodeCount(): AbstractControl {
    return this.form.get('nodeCount');
  }

  get isPrivate(): AbstractControl {
    return this.form.get('isPrivate');
  }

  ngOnInit(): void {
    this.form = this.fb_.group({
      nodePrefix: ['', Validators.compose([Validators.required, FormValidators.namePattern])],
      nodeCount: [1, Validators.compose([Validators.required, FormValidators.isInteger])],
      isPrivate: [false],
    });
  }

  isCreateDisabled(): boolean {
    return !this.form.valid || this.create_.isDeployDisabled();
  }

  create(): void {
    this.create_.deploy(this.nodePrefix.value, this.nodeCount.value, this.isPrivate.value).then(() => {
      this.created_ = true;
      this.router_.navigate(['overview'], {
        queryParams: {[NAMESPACE_STATE_PARAM]: this.namespace_.current()},
      });
    });
  }

  cancel(): void {
    this.history_.goToPreviousState('overview');
  }

  canDeactivate(): boolean {
    return this.form.pristine || this.created_;
  }
}
