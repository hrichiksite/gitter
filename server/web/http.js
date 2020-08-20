'use strict';

var http = require('http');
var useragent = require('useragent');

var ServerResponsePrototype = http.ServerResponse.prototype;
var IncomingMessagePrototype = http.IncomingMessage.prototype;

/* Monkey patch onto the response */
/*
 * This is needed as connect/express attempt to be too smart for their own good behind proxies (like NGINX) and convert relative URLS into absolute URLS. Unfortunately behind a proxy the URL will proably we wrong.
 * TODO: raise this as a bug in express
 */
ServerResponsePrototype.relativeRedirect = function(status, url) {
  var req = this.req;
  var body;

  if (!url) {
    url = status;
    status = 302;
  }

  // Support text/{plain,html} by default
  if (req.accepts('html')) {
    body =
      '<p>' +
      http.STATUS_CODES[status] +
      '. Redirecting to <a href="' +
      url +
      '">' +
      url +
      '</a></p>';
    this.header('Content-Type', 'text/html');
  } else {
    body = http.STATUS_CODES[status] + '. Redirecting to ' + url;
    this.header('Content-Type', 'text/plain');
  }

  // Respond
  this.statusCode = status;
  this.header('Location', url);
  this.end(body);
};

IncomingMessagePrototype.getParsedUserAgent = function() {
  if (this._parsedUserAgent) {
    return this._parsedUserAgent;
  }

  var parsedUserAgent = useragent.parse(this.headers['user-agent']);
  this._parsedUserAgent = parsedUserAgent;
  return parsedUserAgent;
};
