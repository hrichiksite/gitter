'use strict';

function InvalidRegistrationError(message) {
  this.message = message;
  this.name = 'InvalidRegistrationError';
  Error.captureStackTrace(this, InvalidRegistrationError);
}

InvalidRegistrationError.prototype = Object.create(Error.prototype);
InvalidRegistrationError.prototype.constructor = InvalidRegistrationError;

module.exports = InvalidRegistrationError;
