'use strict';

function safeJson(string) {
  if (!string) return string;
  // From http://benalpert.com/2012/08/03/preventing-xss-json.html
  return string.replace(/<\//g, '<\\/');
}

module.exports = safeJson;
