'use strict';

/**
 * Generates query string from object with parameters. Omits undefined properties.
 * Stack-Overflow answer: https://stackoverflow.com/a/34209399/606571
 *
 * compose({foo: 'bar', hey: 'hello}) = '?foo=bar&hey=hello'
 * compose({foo: 'bar', hey: undefined}) = '?foo=bar'
 * compose({}) = ''
 */
module.exports = parameters => {
  const esc = encodeURIComponent;
  const concatParams = Object.keys(parameters)
    .filter(key => parameters[key] !== undefined)
    .map(key => esc(key) + '=' + esc(parameters[key]))
    .join('&');
  return concatParams ? '?' + concatParams : '';
};
