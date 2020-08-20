'use strict';

let bodyHasMobileEmbeddedClass;

/**
 *  Returns true if the page is embedded in native mobile app.
 * (.mobile-embedded CSS class on body was added there during
 * generating assets in build-scripts/render-embedded-chat.js)
 */
module.exports = () => {
  if (bodyHasMobileEmbeddedClass === undefined) {
    bodyHasMobileEmbeddedClass = document.body.classList.contains('mobile-embedded');
  }

  return bodyHasMobileEmbeddedClass;
};
