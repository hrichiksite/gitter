'use strict';

var secureMethod = require('../lib/secure-method');
var assert = require('assert');
var StatusError = require('statuserror');

describe('secure-method', function() {
  function validatorAccept(a, b, c) {
    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(c, 3);
    return true;
  }

  function validatorDecline(a, b, c) {
    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(c, 3);
    return false;
  }

  function validatorReject(a, b, c) {
    assert.strictEqual(a, 1);
    assert.strictEqual(b, 2);
    assert.strictEqual(c, 3);
    throw new StatusError(419);
  }

  describe('prototype classes', function() {
    it('should handle prototypes', function() {
      function TestClass(a) {
        this.a = a;
      }

      TestClass.prototype.testMethod = secureMethod(validatorAccept, function(a, b, c) {
        assert.strictEqual(a, 1);
        assert.strictEqual(b, 2);
        assert.strictEqual(c, 3);
        assert.strictEqual(this.a, 4);
        return this.a;
      });

      var t = new TestClass(4);
      return t.testMethod(1, 2, 3).then(function(result) {
        assert.strictEqual(result, 4);
      });
    });
  });

  describe('no arrays', function() {
    it('should handle validator accept', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod(validatorAccept, function(a, b, c) {
          assert.strictEqual(a, 1);
          assert.strictEqual(b, 2);
          assert.strictEqual(c, 3);
          assert.strictEqual(this, obj);

          return this.x;
        })
      };

      return obj.testMethod(1, 2, 3).then(function(result) {
        assert.strictEqual(result, 4);
      });
    });

    it('should handle validator decline', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod(validatorDecline, function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('should handle validator reject', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod(validatorReject, function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 419);
        });
    });
  });

  describe('single arrays', function() {
    it('should handle validator accept', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([validatorAccept], function(a, b, c) {
          assert.strictEqual(a, 1);
          assert.strictEqual(b, 2);
          assert.strictEqual(c, 3);
          assert.strictEqual(this, obj);

          return this.x;
        })
      };

      return obj.testMethod(1, 2, 3).then(function(result) {
        assert.strictEqual(result, 4);
      });
    });

    it('should handle validator decline', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([validatorDecline], function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('should handle validator reject', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([validatorReject], function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 419);
        });
    });
  });

  describe('multi arrays', function() {
    it('should handle validator accept', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([validatorDecline, validatorAccept], function(a, b, c) {
          assert.strictEqual(a, 1);
          assert.strictEqual(b, 2);
          assert.strictEqual(c, 3);
          assert.strictEqual(this, obj);

          return this.x;
        })
      };

      return obj.testMethod(1, 2, 3).then(function(result) {
        assert.strictEqual(result, 4);
      });
    });

    it('should handle validator decline', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([validatorDecline, validatorDecline], function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('should handle validator reject', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([validatorDecline, validatorReject], function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 419);
        });
    });
  });

  describe('empty arrays', function() {
    it('should always throw a 403', function() {
      var obj = {
        x: 4,
        testMethod: secureMethod([], function() {
          assert.ok(false);
        })
      };

      return obj
        .testMethod(1, 2, 3)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });
  });
});
