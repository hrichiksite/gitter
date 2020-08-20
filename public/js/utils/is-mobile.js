'use strict';

let bodyHasMobileClass;

/** Returns true if the page is showing mobile template (.mobile CSS class on body) */
module.exports = () => {
  if (bodyHasMobileClass === undefined) {
    bodyHasMobileClass = document.body.classList.contains('mobile');
  }

  return bodyHasMobileClass;
};
