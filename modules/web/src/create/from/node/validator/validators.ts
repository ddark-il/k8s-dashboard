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

import {UntypedFormControl} from '@angular/forms';

export class FormValidators {
  /**
   * Checks that a name begins and ends with a lowercase letter
   * and contains nothing but lowercase letters and hyphens ("-")
   * (leading and trailing spaces are ignored by default)
   */
  static namePattern(control: UntypedFormControl): {[key: string]: object} {
    if (control.value) {
      const namePattern = new RegExp('^[a-z]([-a-z0-9]*[a-z0-9])?$');
      const result = namePattern.test(control.value);
      return result ? null : {namePattern: {value: control.value}};
    }
    return null;
  }

  /**
   * Returns true if given value is a correct integer value, false otherwise.
   * When value is undefined or empty then it is considered as correct value in order
   * to not conflict with other validations like 'required'.
   */
  static isInteger(control: UntypedFormControl): {[key: string]: object} {
    const value = control.value;
    if (value) {
      const result = (Number(value) === value && value % 1 === 0) || !value;
      return result ? null : {kdValidInteger: {value: control.value}};
    }
    return null;
  }
}
