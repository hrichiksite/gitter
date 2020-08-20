'use strict';

function OauthAuthorizationError(message) {
  this.message = message;
  this.name = 'InvalidRegistrationError';
  Error.captureStackTrace(this, OauthAuthorizationError);
}

OauthAuthorizationError.prototype = Object.create(Error.prototype);
OauthAuthorizationError.prototype.constructor = OauthAuthorizationError;

module.exports = OauthAuthorizationError;
