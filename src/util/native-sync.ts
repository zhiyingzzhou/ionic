import { Injectable } from '@angular/core';

import { Platform } from '../platform/platform';

declare var window;

/**
 * @internal
 * @name NativeSync
 */

@Injectable()
export class NativeSync {

  actionPerformed(actionName: string, args: any) {
    console.info('NativeSync: ', actionName, args);
    return new Promise((resolve, reject) => {
      if(window.IonicNativeUI) {
        window.IonicNativeUI.action((resp) => {
          resolve(resp);
        }, (err) => {
          reject(err);
        }, actionName, args);
      }
    });
  }

}
