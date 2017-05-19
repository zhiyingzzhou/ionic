import { Component, Optional, ElementRef, EventEmitter, Input, Output, Renderer, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgControl } from '@angular/forms';

import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import { App } from '../app/app';
import { Config } from '../../config/config';
import { Content, ContentDimensions, ScrollEvent } from '../content/content';
import { PointerCoordinates, hasPointerMoved, pointerCoord }  from '../../util/dom';
import { DomController } from '../../platform/dom-controller';
import { Form, IonicFormInput } from '../../util/form';
import { BaseInput } from '../../util/base-input';
import { UIEventManager } from '../../gestures/ui-event-manager';
import { isString, isTrueProperty, assert } from '../../util/util';
import { Item } from '../item/item';
import { Platform } from '../../platform/platform';


/**
 * @name Input
 * @description
 *
 * `ion-input` is meant for text type inputs only, such as `text`,
 * `password`, `email`, `number`, `search`, `tel`, and `url`. Ionic
 * still uses an actual `<input type="text">` HTML element within the
 * component, however, with Ionic wrapping the native HTML input
 * element it's better able to handle the user experience and
 * interactivity.
 *
 * Similarly, `<ion-textarea>` should be used in place of `<textarea>`.
 *
 * An `ion-input` is **not** used for non-text type inputs, such as a
 * `checkbox`, `radio`, `toggle`, `range`, `select`, etc.
 *
 * Along with the blur/focus events, `input` support all standard text input
 * events like `keyup`, `keydown`, `keypress`, `input`,etc. Any standard event
 * can be attached and will function as expected.
 *
 * @usage
 * ```html
 * <ion-list>
 *   <ion-item>
 *     <ion-label color="primary">Inline Label</ion-label>
 *     <ion-input placeholder="Text Input"></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-label color="primary" fixed>Fixed Label</ion-label>
 *     <ion-input type="tel" placeholder="Tel Input"></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-input type="number" placeholder="Number Input with no label"></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-label color="primary" stacked>Stacked Label</ion-label>
 *     <ion-input type="email" placeholder="Email Input"></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-label color="primary" stacked>Stacked Label</ion-label>
 *     <ion-input type="password" placeholder="Password Input"></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-label color="primary" floating>Floating Label</ion-label>
 *     <ion-input></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-input placeholder="Clear Input" clearInput></ion-input>
 *   </ion-item>
 *
 *   <ion-item>
 *     <ion-textarea placeholder="Enter a description"></ion-textarea>
 *   </ion-item>
 * </ion-list>
 * ```
 *
 * @demo /docs/demos/src/input/
 */
@Component({
  selector: 'ion-input,ion-textarea',
  template:
  '<input #input *ngIf="!_isTextarea" class="text-input" ' +
    '[(ngModel)]="value" ' +
    '(blur)="_fireBlur()" ' +
    '(focus)="_fireFocus()" ' +
    '(keydown)="onKeydown($event)" ' +
    '[type]="type" ' +
    '[placeholder]="placeholder" ' +
    '[disabled]="disabled" ' +
    '[readonly]="readonly">' +

  '<textarea #input *ngIf="_isTextarea" class="text-input" ' +
    '[(ngModel)]="value" ' +
    '(blur)="_fireBlur()" ' +
    '(focus)="_fireFocus()" ' +
    '(keydown)="onKeydown($event)" ' +
    '[placeholder] = "placeholder" ' +
    '[disabled] = "disabled" ' +
    '[readonly] = "readonly"></textarea>' +

  '<input [type]="type" aria-hidden="true" next-input *ngIf="_useAssist">' +
  '<button ion-button clear [hidden]="!clearInput" type="button" class="text-input-clear-icon" (click)="clearTextInput()" (mousedown)="clearTextInput()" tabindex="-1"></button>',
  encapsulation: ViewEncapsulation.None,
})
export class TextInput extends BaseInput<string> implements IonicFormInput {

  _autoFocusAssist: string;
  _clearInput: boolean = false;
  _clearOnEdit: boolean;
  _didBlurAfterEdit: boolean;
  _readonly: boolean = false;
  _keyboardHeight: number;
  _type: string = 'text';
  _scrollData: ScrollData;
  _isTextarea: boolean = false;
  _clone: boolean;
  _onDestroy: Subject<any> = new Subject();

  /**
   * @input {boolean} If true, a clear icon will appear in the input when there is a value. Clicking it clears the input.
   */
  @Input()
  get clearInput() {
    return this._clearInput;
  }
  set clearInput(val: any) {
    this._clearInput = (!this._isTextarea && isTrueProperty(val));
  }

  /**
   * @input {string} The type of control to display. The default type is text. Possible values are: `"text"`, `"password"`, `"email"`, `"number"`, `"search"`, `"tel"`, or `"url"`.
   */
  @Input()
  get type() {
    return this._type;
  }
  set type(val: any) {
    if (this._isTextarea) {
      return;
    }
    this._type = 'text';
    if (isString(val)) {
      val = val.toLowerCase();
      if (ALLOWED_TYPES.indexOf(val) >= 0) {
        this._type = val;
      }
    }
  }

  /**
   * @input {boolean} If true, the user cannot modify the value.
   */
  @Input()
  get readonly() {
    return this._readonly;
  }
  set readonly(val: boolean) {
    this._readonly = isTrueProperty(val);
  }

  /**
   * @input {boolean} If true, the value will be cleared after focus upon edit. Defaults to `true` when `type` is `"password"`, `false` for all other types.
   */
  @Input()
  get clearOnEdit() {
    return this._clearOnEdit;
  }
  set clearOnEdit(val: any) {
    this._clearOnEdit = isTrueProperty(val);
  }

  /**
   * @hidden
   */
  @ViewChild('input') _native: ElementRef;

  /**
   * @input {string} Instructional text that shows before the input has a value.
   */
  @Input() autocomplete: string = '';

  /**
   * @input {string} Instructional text that shows before the input has a value.
   */
  @Input() autocorrect: string = '';

  /**
   * @input {string} Instructional text that shows before the input has a value.
   */
  @Input() placeholder: string = '';

  /**
   * @input {any} The minimum value, which must not be greater than its maximum (max attribute) value.
   */
  @Input() min: number|string;

  /**
   * @input {any} The maximum value, which must not be less than its minimum (min attribute) value.
   */
  @Input() max: number|string;

  /**
   * @input {any} Works with the min and max attributes to limit the increments at which a value can be set.
   */
  @Input() step: number|string;


  constructor(
    config: Config,
    private _plt: Platform,
    private form: Form,
    private _app: App,
    elementRef: ElementRef,
    renderer: Renderer,
    @Optional() private _content: Content,
    @Optional() private item: Item,
    @Optional() public ngControl: NgControl,
    private _dom: DomController
  ) {
    super(config, elementRef, renderer,
      elementRef.nativeElement.tagName === 'ION-TEXTAREA' ? 'textarea' : 'input', '', form, item, ngControl);

    this.autocomplete = config.get('autocomplete', 'off');
    this.autocorrect = config.get('autocorrect', 'off');
    this._autoFocusAssist = config.get('autoFocusAssist', 'delay');
    this._keyboardHeight = config.getNumber('keyboardHeight');
    this._isTextarea = elementRef.nativeElement.tagName === 'ION-TEXTAREA';

    const useAssist = config.getBoolean('scrollAssist', false);
    if (useAssist) {
      this._enableScrollAssist();
    }

    const usePadding = config.getBoolean('scrollPadding', useAssist);
    if (usePadding && _content) {
      this._enableScrollPadding();
    }

    const blurring = config.getBoolean('inputBlurring', false);
    if (blurring) {
      this._enableInputBlurring();
    }

    const blurOnScroll = config.getBoolean('blurOnFocus', false);
    if (blurOnScroll && _content) {
      this._enableBlurOnScrolling();
    }
  }

  /**
   * @hidden
   */
  ngOnInit() {
    // By default, password inputs clear after focus when they have content
    if (this.clearOnEdit !== false && this.type === 'password') {
      this.clearOnEdit = true;
    }
    const ionInputEle: HTMLElement = this._elementRef.nativeElement;

    if (ionInputEle.hasAttribute('autofocus')) {
      // the ion-input element has the autofocus attributes
      const nativeInputEle: HTMLElement = this._native.nativeElement;
      ionInputEle.removeAttribute('autofocus');
      switch (this._autoFocusAssist) {
        case 'immediate':
          // config says to immediate focus on the input
          // works best on android devices
          nativeInputEle.focus();
          break;
        case 'delay':
          // config says to chill out a bit and focus on the input after transitions
          // works best on desktop
          this._plt.timeout(() => nativeInputEle.focus(), 650);
          break;
      }
      // traditionally iOS has big issues with autofocus on actual devices
      // autoFocus is disabled by default with the iOS mode config
    }
  }

  /**
   * @hidden
   */
  ngOnDestroy() {
    super.ngOnDestroy();
    this._onDestroy.next(true);
    this._onDestroy = null;
  }

  /**
   * @hidden
   */
  initFocus() {
    this.setFocus();
  }

  /**
   * @hidden
   */
  setFocus() {
    // let's set focus to the element
    // but only if it does not already have focus
    if (this.isFocus()) {
      this._native.nativeElement.focus();
    }
  }


  /**
   * @hidden
   */
  onKeydown(ev: any) {
    if (ev && this._clearOnEdit) {
      this.checkClearOnEdit(ev.target.value);
    }
  }

  /**
   * @hidden
   */
  _inputFocusChanged(hasFocus: boolean) {
    if (this._item) {
      this._item.setElementClass('input-has-focus', hasFocus);
    }

    // If clearOnEdit is enabled and the input blurred but has a value, set a flag
    if (this._clearOnEdit && !hasFocus && this.hasValue()) {
      this._didBlurAfterEdit = true;
    }
  }

  /**
   * @hidden
   */
  clearTextInput() {
    this.value = '';
  }

  /**
  * Check if we need to clear the text input if clearOnEdit is enabled
  * @hidden
  */
  checkClearOnEdit(inputValue: string) {
    if (!this._clearOnEdit) {
      return;
    }

    // Did the input value change after it was blurred and edited?
    if (this._didBlurAfterEdit && this.hasValue()) {
      // Clear the input
      this.clearTextInput();
    }

    // Reset the flag
    this._didBlurAfterEdit = false;
  }

  _enableInputBlurring() {
    console.debug('Input: enableInputBlurring');

    const self = this;
    let unrefBlur: Function;
    this.ionFocus.subscribe(() => {
      // automatically blur input if:
      // 1) this input has focus
      // 2) the newly tapped document element is not an input
      const plt = self._plt;
      unrefBlur = plt.registerListener(plt.doc(), 'touchend', (ev: TouchEvent) => {
        const tapped = <HTMLElement>ev.target;
        const ele = self._native.nativeElement;
        if (tapped && ele) {
          if (tapped.tagName !== 'INPUT' && tapped.tagName !== 'TEXTAREA' && !tapped.classList.contains('input-cover')) {
            ele.blur();
          }
        }
      }, { capture: true, zone: false });
    });

    this.ionBlur.subscribe(() => {
      unrefBlur && unrefBlur();
    });
  }

  _enableScrollPadding() {
    console.debug('Input: enableScrollPadding');

    this.ionFocus.subscribe(() => {
      this._dom.write(() => {
        this._plt.doc().body.scrollTop = 0;
      });
      const content = this._content;

      // add padding to the bottom of the scroll view (if needed)
      content.addScrollPadding(this._scrollData.scrollPadding);
      content.clearScrollPaddingFocusOut();
    });
  }

  _enableBlurOnScrolling() {
    console.debug('Input: enableBlurOnScrolling');

    const self = this;
    const content = this._content;

    content.ionScrollStart
      .takeUntil(this._onDestroy)
      .subscribe(() => scrollHideFocus(true));

    content.ionScrollEnd
      .takeUntil(this._onDestroy)
      .subscribe(() => scrollHideFocus(false));

    this.ionBlur.subscribe(() => hideFocus(false));

    function scrollHideFocus(shouldHideFocus: boolean) {
      assert(self._content, 'content must be valid');

      // do not continue if there's no nav, or it's transitioning
      if (self.isFocus()) {
        // if it does have focus, then do the dom write
        self._dom.write(() => hideFocus(shouldHideFocus));
      }
    }

    function hideFocus(shouldHideFocus: boolean) {
      const platform = self._plt;
      const focusedInputEle = self._native.nativeElement;
      console.debug(`native-input, hideFocus, shouldHideFocus: ${shouldHideFocus}, input value: ${focusedInputEle.value}`);

      if (shouldHideFocus) {
        cloneInputComponent(platform, focusedInputEle);
        (<any>focusedInputEle.style)[platform.Css.transform] = 'scale(0)';

      } else {
        removeClone(platform, focusedInputEle);
      }
    }

  }

  _enableScrollAssist() {
    console.debug('Input: enableScrollAssist');

    const self = this;
    let coord: PointerCoordinates;
    let relocated: boolean = false;
    const clone = this._config.getBoolean('inputCloning', false);
    const events = new UIEventManager(this._plt);
    events.pointerEvents({
      element: this.getNativeElement(),
      pointerDown: pointerDown,
      pointerUp: pointerUp,
      capture: true,
      zone: false
    });

    this._onDestroy.subscribe(() => events.destroy());

    function pointerDown(ev: any) {
      if (self._app.isEnabled()) {
        coord = pointerCoord(ev);
        return true;
      }
      return false;
    }

    function pointerUp(ev: any) {
      if (!self._app.isEnabled()) {
        // the app is actively doing something right now
        // don't try to scroll in the input
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      assert(coord, 'coord must be valid');
      const endCoord = pointerCoord(ev);

      // focus this input if the pointer hasn't moved XX pixels
      // and the input doesn't already have focus
      if (!hasPointerMoved(8, coord, endCoord) && !self.isFocus()) {
        ev.preventDefault();
        ev.stopPropagation();

        // begin the input focus process
        initFocus();
      }
      coord = null;
    }

    function initFocus() {
      // begin the process of setting focus to the inner input element
      const content = self._content;
      console.debug(`input-base, initFocus(), scrollView: ${!!content}`);

      // not inside of a scroll view, just focus it
      if (!content) {
        self.setFocus();
        return;
      }
      // this input is inside of a scroll view
      // find out if text input should be manually scrolled into view
      const app = self._app;

      // get container of this input, probably an ion-item a few nodes up
      let ele: HTMLElement = self._elementRef.nativeElement;
      ele = <HTMLElement>ele.closest('ion-item,[ion-item]') || ele;

      const scrollData = self._scrollData = getScrollData(ele.offsetTop, ele.offsetHeight, content.getContentDimensions(), self._keyboardHeight, self._plt.height());
      if (Math.abs(scrollData.scrollAmount) < 4) {
        // the text input is in a safe position that doesn't
        // require it to be scrolled into view, just set focus now
        self.setFocus();

        // all good, allow clicks again
        app.setEnabled(true);
        return;
      }

      // manually scroll the text input to the top
      // do not allow any clicks while it's scrolling
      const scrollDuration = getScrollAssistDuration(scrollData.scrollAmount);
      app.setEnabled(false, scrollDuration);

      if (clone) {
        // temporarily move the focus to the focus holder so the browser
        // doesn't freak out while it's trying to get the input in place
        // at this point the native text input still does not have focus
        beginFocus(true, scrollData.inputSafeY);
      }

      // let's now set focus to the actual native element
      // at this point it is safe to assume the browser will not attempt
      // to scroll the input into view itself (screwing up headers/footers)
      self.setFocus();

      // scroll the input into place
      content.scrollTo(0, scrollData.scrollTo, scrollDuration, () => {
        console.debug(`input-base, scrollTo completed, scrollTo: ${scrollData.scrollTo}, scrollDuration: ${scrollDuration}`);
        if (clone) {
          // the scroll view is in the correct position now
          // give the native text input focus
          beginFocus(false, 0);
        }

        // all good, allow clicks again
        app.setEnabled(true);
      });
    }

    function beginFocus(shouldFocus: boolean, inputRelativeY: number) {
      if (relocated === shouldFocus) {
        return;
      }
      relocated = shouldFocus;

      const focusedInputEle = this._native.nativeElement;
      if (shouldFocus) {
        // this platform needs the input to be cloned
        // this allows for the actual input to receive the focus from
        // the user's touch event, but before it receives focus, it
        // moves the actual input to a location that will not screw
        // up the app's layout, and does not allow the native browser
        // to attempt to scroll the input into place (messing up headers/footers)
        // the cloned input fills the area of where native input should be
        // while the native input fakes out the browser by relocating itself
        // before it receives the actual focus event
        cloneInputComponent(this._plt, focusedInputEle);

        // move the native input to a location safe to receive focus
        // according to the browser, the native input receives focus in an
        // area which doesn't require the browser to scroll the input into place
        (<any>focusedInputEle.style)[this._plt.Css.transform] = `translate3d(-9999px,${inputRelativeY}px,0)`;
        focusedInputEle.style.opacity = '0';

      } else {
        removeClone(this._plt, focusedInputEle);
      }
    }

  }

}



/**
 * @name TextArea
 * @description
 *
 * `ion-textarea` is used for multi-line text inputs. Ionic still
 * uses an actual `<textarea>` HTML element within the component;
 * however, with Ionic wrapping the native HTML text area element, Ionic
 * is able to better handle the user experience and interactivity.
 *
 * Note that `<ion-textarea>` must load its value from the `value` or
 * `[(ngModel)]` attribute. Unlike the native `<textarea>` element,
 * `<ion-textarea>` does not support loading its value from the
 * textarea's inner content.
 *
 * When requiring only a single-line text input, we recommend using
 * `<ion-input>` instead.
 *
 * @usage
 * ```html
 *  <ion-item>
 *    <ion-label>Comments</ion-label>
 *    <ion-textarea></ion-textarea>
 *  </ion-item>
 *
 *  <ion-item>
 *    <ion-label stacked>Message</ion-label>
 *    <ion-textarea [(ngModel)]="msg"></ion-textarea>
 *  </ion-item>
 *
 *  <ion-item>
 *    <ion-label floating>Description</ion-label>
 *    <ion-textarea></ion-textarea>
 *  </ion-item>
 *
 * <ion-item>
 *    <ion-label>Long Description</ion-label>
 *    <ion-textarea rows="6" placeholder="enter long description here..."></ion-textarea>
 *  </ion-item>
 * ```
 *
 * @demo /docs/demos/src/textarea/
 */


const SCROLL_ASSIST_SPEED = 0.3;
const ALLOWED_TYPES = ['password', 'email', 'number', 'search', 'tel', 'url', 'date', 'month', 'time', 'week'];


/**
 * @hidden
 */
export function getScrollData(inputOffsetTop: number, inputOffsetHeight: number, scrollViewDimensions: ContentDimensions, keyboardHeight: number, plaformHeight: number) {
  // compute input's Y values relative to the body
  const inputTop = (inputOffsetTop + scrollViewDimensions.contentTop - scrollViewDimensions.scrollTop);
  const inputBottom = (inputTop + inputOffsetHeight);

  // compute the safe area which is the viewable content area when the soft keyboard is up
  const safeAreaTop = scrollViewDimensions.contentTop;
  const safeAreaHeight = (plaformHeight - keyboardHeight - safeAreaTop) / 2;
  const safeAreaBottom = safeAreaTop + safeAreaHeight;

  // figure out if each edge of teh input is within the safe area
  const inputTopWithinSafeArea = (inputTop >= safeAreaTop && inputTop <= safeAreaBottom);
  const inputTopAboveSafeArea = (inputTop < safeAreaTop);
  const inputTopBelowSafeArea = (inputTop > safeAreaBottom);
  const inputBottomWithinSafeArea = (inputBottom >= safeAreaTop && inputBottom <= safeAreaBottom);
  const inputBottomBelowSafeArea = (inputBottom > safeAreaBottom);

  /*
  Text Input Scroll To Scenarios
  ---------------------------------------
  1) Input top within safe area, bottom within safe area
  2) Input top within safe area, bottom below safe area, room to scroll
  3) Input top above safe area, bottom within safe area, room to scroll
  4) Input top below safe area, no room to scroll, input smaller than safe area
  5) Input top within safe area, bottom below safe area, no room to scroll, input smaller than safe area
  6) Input top within safe area, bottom below safe area, no room to scroll, input larger than safe area
  7) Input top below safe area, no room to scroll, input larger than safe area
  */

  const scrollData: ScrollData = {
    scrollAmount: 0,
    scrollTo: 0,
    scrollPadding: 0,
    inputSafeY: 0
  };

  if (inputTopWithinSafeArea && inputBottomWithinSafeArea) {
    // Input top within safe area, bottom within safe area
    // no need to scroll to a position, it's good as-is
    return scrollData;
  }

  // looks like we'll have to do some auto-scrolling
  if (inputTopBelowSafeArea || inputBottomBelowSafeArea || inputTopAboveSafeArea) {
    // Input top or bottom below safe area
    // auto scroll the input up so at least the top of it shows

    if (safeAreaHeight > inputOffsetHeight) {
      // safe area height is taller than the input height, so we
      // can bring up the input just enough to show the input bottom
      scrollData.scrollAmount = Math.round(safeAreaBottom - inputBottom);

    } else {
      // safe area height is smaller than the input height, so we can
      // only scroll it up so the input top is at the top of the safe area
      // however the input bottom will be below the safe area
      scrollData.scrollAmount = Math.round(safeAreaTop - inputTop);
    }

    scrollData.inputSafeY = -(inputTop - safeAreaTop) + 4;

    if (inputTopAboveSafeArea && scrollData.scrollAmount > inputOffsetHeight) {
      // the input top is above the safe area and we're already scrolling it into place
      // don't let it scroll more than the height of the input
      scrollData.scrollAmount = inputOffsetHeight;
    }
  }

  // figure out where it should scroll to for the best position to the input
  scrollData.scrollTo = (scrollViewDimensions.scrollTop - scrollData.scrollAmount);

  // when auto-scrolling, there also needs to be enough
  // content padding at the bottom of the scroll view
  // always add scroll padding when a text input has focus
  // this allows for the content to scroll above of the keyboard
  // content behind the keyboard would be blank
  // some cases may not need it, but when jumping around it's best
  // to have the padding already rendered so there's no jank
  scrollData.scrollPadding = keyboardHeight;

  // var safeAreaEle: HTMLElement = (<any>window).safeAreaEle;
  // if (!safeAreaEle) {
  //   safeAreaEle = (<any>window).safeAreaEle  = document.createElement('div');
  //   safeAreaEle.style.cssText = 'position:absolute; padding:1px 5px; left:0; right:0; font-weight:bold; font-size:10px; font-family:Courier; text-align:right; background:rgba(0, 128, 0, 0.8); text-shadow:1px 1px white; pointer-events:none;';
  //   document.body.appendChild(safeAreaEle);
  // }
  // safeAreaEle.style.top = safeAreaTop + 'px';
  // safeAreaEle.style.height = safeAreaHeight + 'px';
  // safeAreaEle.innerHTML = `
  //   <div>scrollTo: ${scrollData.scrollTo}</div>
  //   <div>scrollAmount: ${scrollData.scrollAmount}</div>
  //   <div>scrollPadding: ${scrollData.scrollPadding}</div>
  //   <div>inputSafeY: ${scrollData.inputSafeY}</div>
  //   <div>scrollHeight: ${scrollViewDimensions.scrollHeight}</div>
  //   <div>scrollTop: ${scrollViewDimensions.scrollTop}</div>
  //   <div>contentHeight: ${scrollViewDimensions.contentHeight}</div>
  //   <div>plaformHeight: ${plaformHeight}</div>
  // `;

  return scrollData;
}

function getScrollAssistDuration(distanceToScroll: number) {
  distanceToScroll = Math.abs(distanceToScroll);
  const duration = distanceToScroll / SCROLL_ASSIST_SPEED;
  return Math.min(400, Math.max(150, duration));
}

function cloneInputComponent(plt: Platform, srcNativeInputEle: HTMLInputElement) {
  // given a native <input> or <textarea> element
  // find its parent wrapping component like <ion-input> or <ion-textarea>
  // then clone the entire component
  const srcComponentEle = <HTMLElement>srcNativeInputEle.closest('ion-input,ion-textarea');
  if (srcComponentEle) {
    // DOM READ
    var srcTop = srcComponentEle.offsetTop;
    var srcLeft = srcComponentEle.offsetLeft;
    var srcWidth = srcComponentEle.offsetWidth;
    var srcHeight = srcComponentEle.offsetHeight;

    // DOM WRITE
    // not using deep clone so we don't pull in unnecessary nodes
    var clonedComponentEle = <HTMLElement>srcComponentEle.cloneNode(false);
    clonedComponentEle.classList.add('cloned-input');
    clonedComponentEle.setAttribute('aria-hidden', 'true');
    clonedComponentEle.style.pointerEvents = 'none';
    clonedComponentEle.style.position = 'absolute';
    clonedComponentEle.style.top = srcTop + 'px';
    clonedComponentEle.style.left = srcLeft + 'px';
    clonedComponentEle.style.width = srcWidth + 'px';
    clonedComponentEle.style.height = srcHeight + 'px';

    var clonedNativeInputEle = <HTMLInputElement>srcNativeInputEle.cloneNode(false);
    clonedNativeInputEle.value = srcNativeInputEle.value;
    clonedNativeInputEle.tabIndex = -1;

    clonedComponentEle.appendChild(clonedNativeInputEle);
    srcComponentEle.parentNode.appendChild(clonedComponentEle);

    srcComponentEle.style.pointerEvents = 'none';
  }

  (<any>srcNativeInputEle.style)[plt.Css.transform] = 'scale(0)';
}

function removeClone(plt: Platform, srcNativeInputEle: HTMLElement) {
  const srcComponentEle = <HTMLElement>srcNativeInputEle.closest('ion-input,ion-textarea');
  if (srcComponentEle && srcComponentEle.parentElement) {
    var clonedInputEles = srcComponentEle.parentElement.querySelectorAll('.cloned-input');
    for (var i = 0; i < clonedInputEles.length; i++) {
      clonedInputEles[i].parentNode.removeChild(clonedInputEles[i]);
    }

    srcComponentEle.style.pointerEvents = '';
  }
  (<any>srcNativeInputEle.style)[plt.Css.transform] = '';
  srcNativeInputEle.style.opacity = '';
}


export interface ScrollData {
  scrollAmount: number;
  scrollTo: number;
  scrollPadding: number;
  inputSafeY: number;
}
