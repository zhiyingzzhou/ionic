import { Directive, ElementRef, Input, HostListener, Optional, Renderer } from '@angular/core';

import { Config } from '../../config/config';
import { MenuController } from '../app/menu-controller';
import { Navbar } from '../toolbar/navbar';
import { Toolbar } from '../toolbar/toolbar';
import { ViewController } from '../../navigation/view-controller';

/**
 * @name MenuToggle
 * @description
 * The `menuToggle` directive can be placed on any button to toggle a menu open or closed.
 * If it is added to the [NavBar](../../navbar/NavBar) of a page, the button will only appear
 * when the page it's in is currently a root page. See the [Menu Navigation Bar Behavior](../Menu#navigation-bar-behavior)
 * docs for more information.
 *
 *
 * @usage
 *
 * A simple `menuToggle` button can be added using the following markup:
 *
 * ```html
 * <ion-button menuToggle>Toggle Menu</ion-button>
 * ```
 *
 * To toggle a specific menu by its id or side, give the `menuToggle`
 * directive a value.
 *
 * ```html
 * <ion-button menuToggle="right">Toggle Right Menu</ion-button>
 * ```
 *
 * If placing the `menuToggle` in a navbar or toolbar, it should be
 * placed as a child of the `<ion-navbar>` or `<ion-toolbar>`, and not in
 * the `<ion-buttons>` element:
 *
 * ```html
 * <ion-header>
 *
 *   <ion-navbar>
 *     <ion-buttons start>
 *       <ion-button>
 *         <ion-icon name="contact"></ion-icon>
 *       </ion-button>
 *     </ion-buttons>
 *     <ion-button menuToggle>
 *       <ion-icon name="menu"></ion-icon>
 *     </ion-button>
 *     <ion-title>
 *       Title
 *     </ion-title>
 *     <ion-buttons end>
 *       <ion-button (click)="doClick()">
 *         <ion-icon name="more"></ion-icon>
 *       </ion-button>
 *     </ion-buttons>
 *   </ion-navbar>
 *
 * </ion-header>
 * ```
 *
 * Similar to `<ion-buttons>`, the `menuToggle` can be positioned using
 * `start`, `end`, `left`, or `right`:
 *
 * ```html
 * <ion-toolbar>
 *   <ion-button menuToggle right>
 *     <ion-icon name="menu"></ion-icon>
 *   </ion-button>
 *   <ion-title>
 *     Title
 *   </ion-title>
 *   <ion-buttons end>
 *     <ion-button (click)="doClick()">
 *       <ion-icon name="more"></ion-icon>
 *     </ion-button>
 *   </ion-buttons>
 * </ion-toolbar>
 * ```
 *
 * See the [Toolbar API docs](../../toolbar/Toolbar) for more information
 * on the different positions.
 *
 * @demo /docs/demos/src/menu/
 * @see {@link /docs/components#menus Menu Component Docs}
 * @see {@link ../../menu/Menu Menu API Docs}
 */
@Directive({
  selector: '[menuToggle]',
  host: {
    '[hidden]': 'isHidden'
  }
})
export class MenuToggle {

  /**
   * @hidden
   */
  @Input() menuToggle: string;

  /**
   * @hidden
   */
  private _inNavbar: boolean;

  /**
   * @hidden
   */
  private _inToolbar: boolean;

  constructor(
    private _menu: MenuController,
    private _elementRef: ElementRef,
    private _config: Config,
    private _renderer: Renderer,
    @Optional() private _viewCtrl: ViewController,
    @Optional() private _navbar: Navbar,
    @Optional() private _toolbar: Toolbar
  ) {
    this._inNavbar = !!_navbar;
    this._inToolbar = !!(_toolbar || _navbar);
  }

  ngAfterContentInit() {
    const nativeEle = this._elementRef.nativeElement;
    const mode = this._config.get('mode');

    if (nativeEle.tagName === 'ION-BUTTON' && this._inToolbar) {
      this._renderer.setElementAttribute(nativeEle, 'button-type', 'bar-button');
      this._renderer.setElementClass(nativeEle, `bar-button-menutoggle`, true);
      this._renderer.setElementClass(nativeEle, `bar-button-menutoggle-${mode}`, true);
    }
  }

  /**
  * @hidden
  */
  @HostListener('click')
  toggle() {
    const menu = this._menu.get(this.menuToggle);
    menu && menu.toggle();
  }

  /**
  * @hidden
  */
  get isHidden() {
    const menu = this._menu.get(this.menuToggle);
    if (this._inNavbar && this._viewCtrl) {
      if (!menu || !menu._canOpen()) {
        return true;
      }

      if (this._viewCtrl.isFirst()) {
        // this is the first view, so it should always show
        return false;
      }

      if (menu) {
        // this is not the root view, so see if this menu
        // is configured to still be enabled if it's not the root view
        return !menu.persistent;
      }
    }
    return false;
  }

}
