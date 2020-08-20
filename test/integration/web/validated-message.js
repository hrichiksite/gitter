'use strict';

var testRequire = require('../test-require');
var assert = require('assert');

describe('validated-message', function() {
  var validatedMessage;

  before(function() {
    validatedMessage = testRequire('./web/validated-message');
  });

  it('should handle empty messages', function() {
    var check = validatedMessage.getCheck('');
    assert.strictEqual(check, '');
  });

  it('should handle valid messages', function() {
    var message = 'All your bases are belong to us';
    var check = validatedMessage.getCheck(message);
    assert(check);
    var validated = validatedMessage.validate(message, check, 'DEFAULT');
    assert.strictEqual(validated, message);
  });

  it('should reject tampered checks', function() {
    var message = 'All your bases are belong to us';
    var check = validatedMessage.getCheck(message);
    assert(check);
    var validated = validatedMessage.validate(message, 'a' + check, 'DEFAULT');
    assert.strictEqual(validated, 'DEFAULT');
  });

  it('should reject tampered messages', function() {
    var message = 'All your bases are belong to us';
    var check = validatedMessage.getCheck(message);
    assert(check);
    var validated = validatedMessage.validate('a' + message, check, 'DEFAULT');
    assert.strictEqual(validated, 'DEFAULT');
  });

  it('should reject invalid checks', function() {
    var message = 'All your bases are belong to us';
    var check = validatedMessage.getCheck(message);
    assert(check);
    var validated = validatedMessage.validate(message, '::::::::', 'DEFAULT');
    assert.strictEqual(validated, 'DEFAULT');
  });
});
