'use strict';

/* Create an error as per http://bluebirdjs.com/docs/api/catch.html */
function PolicyDelegateTransportError(message, inner) {
  this.message = message;
  this.name = 'PolicyDelegateTransportError';
  this.inner = inner;
  Error.captureStackTrace(this, PolicyDelegateTransportError);
}
PolicyDelegateTransportError.prototype = Object.create(Error.prototype);
PolicyDelegateTransportError.prototype.constructor = PolicyDelegateTransportError;

module.exports = PolicyDelegateTransportError;
