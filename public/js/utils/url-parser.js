'use strict';

function parse(url) {
  var parser = document.createElement('a');
  parser.href = url;

  return {
    protocol: parser.protocol,
    hostname: parser.hostname,
    port: parser.port,
    pathname: parser.pathname,
    search: parser.search,
    hash: parser.hash,
    host: parser.host,
    href: parser.href
  };
}

function decodePart(s) {
  return decodeURIComponent(s.replace(/\+/g, ' '));
}

function parseSearch(search) {
  var result = {};

  if (!search) return result;
  var query = search.substring(1);

  var match;
  var re = /([^&=]+)=?([^&]*)/g;

  while ((match = re.exec(query))) {
    result[decodePart(match[1])] = decodePart(match[2]);
  }

  return result;
}

function format(options) {
  var parser = document.createElement('a');
  parser.href = document.location.href;

  ['href', 'protocol', 'hostname', 'search', 'hash', 'pathname'].forEach(function(key) {
    if (options.hasOwnProperty(key) && options[key] !== undefined) {
      if ((key === 'protocol' || key === 'hostname') && options[key] === '') return;
      parser[key] = options[key];
    }
  });

  return parser.href;
}

module.exports = {
  parse: parse,
  parseSearch: parseSearch,
  format: format
};
