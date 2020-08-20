'use strict';

// credit to @lazd (https://github.com/lazd) - https://github.com/wycats/handlebars.js/issues/249
module.exports = function(number, singular, plural) {
  // TODO: use i18n as this doesn't work except in English
  if (number === 1) return singular;
  return typeof plural === 'string' ? plural : singular + 's';
};
