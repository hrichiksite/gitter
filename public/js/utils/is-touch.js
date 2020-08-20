'use strict';

/** detects whether the device supports touch events, copied from https://stackoverflow.com/a/4819886/606571 */
module.exports = () => {
  // eslint-disable-next-line no-undef
  if ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch)) {
    return true;
  }

  const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
  // include the 'heartz' as a way to have a non matching MQ to help terminate the join
  // https://git.io/vznFH
  const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
  return window.matchMedia(query).matches;
};
