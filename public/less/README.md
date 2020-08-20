//  ______     __     ______   ______   ______     ______   
// /\  ___\   /\ \   /\__  _\ /\__  _\ /\  ___\   /\  == \  
// \ \ \__ \  \ \ \  \/_/\ \/ \/_/\ \/ \ \  __\   \ \  __<  
//  \ \_____\  \ \_\    \ \_\    \ \_\  \ \_____\  \ \_\ \_\
//   \/_____/   \/_/     \/_/     \/_/   \/_____/   \/_/ /_/

/**
 * GITTER.IM Styles <3
 *
 * Contents
 * =========
 *
 * Notes                Read'em.
 * App Structure        A hierarchical view of the application.
 * Imports              All the libraries and other stylesheet files.
 * CSS Reset            Resets the styling in order to standardize it.
 * UI Levels            Used to separate `z-index`es more manageably.
 * Type                 Defines all font related styles.
 * Color                Contains the colors.
 * Elements             Defines styling for UI components.
 * Media Queries        Styles for larger screens. Should be mobile first.
 *
 * Author: Walter Carvalho 2014.
 * Inspired by: https://github.com/csswizardry/CSS-Guidelines#css-document-anatomy
 */

/**
  * Notes
  *
  * We're trying to follow the BEM (Block, Element, Modifier) methodology for writing maintanable CSS.
  * Please follow this method. If you want to know more about BEM, read this:
  *
  * http://www.integralist.co.uk/posts/maintainable-css-with-bem/ or ask for help. Thanks! :)
  *
  * ** IMPORTANT! **
  * Always use BEM.
  * Always add modifiers by extending an existing class.
  * Always use `em` as the standard unit.
  * Always use `%` for flexible sizing (responsive).
  * Try to use double spaces to separate classes in HTML. (Optional, but it really helps readability).
  * TODO: Always use the prefix `js-` for webhooks in HTML classes. e.g. <div class='chat-item__content  js-example-webhook'>.
  */

/* App Structure */
/**
  • App
      • Menu
      • Chat
          • ChatAlerts
          • ChatHeader
          • ChatArea
              • ChatItem
          • ChatInput
          • ChatToolBar
  */

/* Imports */

/* CSS Reset */
@import 'reset.css'; // Eric Meyer's Reset CSS v2.0 - http://cssreset.com
*, *:before, *:after { box-sizing: border-box; } // Paul Irish's Box Sizing Tip - http://www.paulirish.com/2012/box-sizing-border-box-ftw/


/* Type */
@type: 'Open Sans', 'HelveticaNeue', sans-serif;
@type_size: 1em;
@type_base: #444;

@type_light: lighten(@type_base, 10%);
@type_dark: darken(@type_base, 10%);

/* Color */
// @base =
// @primary =
// @secondary =
// @warning =
// @danger =
// @success =

/* Elements */
@import 'menu.less';
@import 'chat.less';
@import 'toolbar.less';
@import 'chat-item.less';
@import 'welcome-tips.less';

/* Media Queries */
// @media only screen and (min-width: 50em) {

// }
