import { Injectable } from '@angular/core';

import { App } from '../components/app/app';
import { Platform } from '../platform/platform';

declare var window;

/**
 * @internal
 * @name NativeSync
 */

@Injectable()
export class NativeSync {
  _actionQueue: Array<any> = [];

  constructor(platform: Platform, app: App) {
    platform.ready().then(() => {
      this._sendMessages();

      if(window.IonicNativeUI) {
        window.IonicNativeUI.onNavPop((info) => {
          console.log('Inside Ionic: Nav Pop', info);
          app.getRootNav().pop();
        }, (err) => {
          console.error('Inside Ionic: Unable to nav pop', err);
        });
      }
    });
  }

  _sendMessages() {
    if(!window.IonicNativeUI) { return; }

    for(let message of this._actionQueue) {
      console.log('Ionic JS - NativeSync._sendMessages - action', message.actionName, message.args);
      window.IonicNativeUI.action(() => {}, (err) => {}, message.actionName, message.args);
    }

    this._actionQueue = [];
  }

  action(actionName: string, args: any) {
    this._actionQueue.push({
      actionName: actionName,
      args: args
    });

    this._sendMessages();
  }

}
