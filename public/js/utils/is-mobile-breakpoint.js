'use strict';

function isMobileBreakpoint() {
  // Keep this in sync with the `@left-menu-mobile-breakpoint-width` in `trp3Vars.less`
  return window.matchMedia('(max-width: 900px)').matches;
}

module.exports = isMobileBreakpoint;
