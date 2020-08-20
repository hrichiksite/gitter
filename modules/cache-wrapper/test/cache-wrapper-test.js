'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require('proxyquire').noCallThru();

function getWrapper(lookupFunc) {
  var MockSnappyCache = function() {};
  MockSnappyCache.prototype.lookup = lookupFunc;
  return proxyquireNoCallThru('../lib/cache-wrapper', {
    'snappy-cache': MockSnappyCache
  });
}

describe('cache-wrapper', function() {
  describe('secureWrapFunction', () => {
    it('looks up correct key with custom cacheKeyGenerator() for function', function(done) {
      const wrapper = getWrapper(key => {
        assert.equal(key, 'my-module:my-custom-instance-id:my-module-function:world');
        done();
      });
      const secureWrapFunction = wrapper.secureWrapFunction;

      const wrapped = secureWrapFunction('my-module', module, async () => {
        return 'my-custom-instance-id';
      });
      wrapped('world');
    });

    it('missing cacheKeyGenerator() throws error', function(done) {
      const wrapper = getWrapper((/*key*/) => {
        // noop
      });
      const secureWrapFunction = wrapper.secureWrapFunction;

      try {
        secureWrapFunction('my-module', module);
        assert.fail('expected error to be thrown because cacheKeyGenerator() is missing');
      } catch (err) {
        assert.ok(err);
        done();
      }
    });
  });

  describe('wrapping single function modules', function() {
    var module = function(name) {
      return Promise.resolve('hello ' + name);
    };

    it('looks up correct key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module::my-module-function:world');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped('world');
    });

    it('looks up correct key with custom getInstanceId() for function', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module:my-custom-instance-id:my-module-function:world');
        done();
      });

      var wrapped = wrapper('my-module', module, {
        getInstanceId: async () => {
          return 'my-custom-instance-id';
        }
      });
      wrapped('world');
    });

    it('looks up correct key with custom getInstanceId(this) for object prototype function', done => {
      const wrapper = getWrapper(key => {
        assert.equal(key, 'getSomething:instance-id-123foobarbaztoken:getSomething-function');
        done();
      });

      function ExampleService() {
        this.myToken = '123foobarbaztoken';
      }

      ExampleService.prototype.getSomething = wrapper(
        'getSomething',
        async function() {
          return 'something';
        },
        {
          getInstanceId: async exampleService => {
            return `instance-id-${exampleService.myToken}`;
          }
        }
      );

      const exampleService = new ExampleService();
      exampleService.getSomething();
    });

    it('encodes colons (eww, gross!) in the key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module::my-module-function:look%3Aat%3Amy%3Acolons');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped('look:at:my:colons');
    });

    it('calls function correctly on cache miss', function(done) {
      var wrapper = getWrapper(function(key, cachedFunc, cb) {
        cachedFunc(cb);
      });

      var wrapped = wrapper('my-module', module);
      wrapped('world').then(function(result) {
        assert.equal(result, 'hello world');
        done();
      });
    });

    it('serializes object arguments so cache key is unique', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module::my-module-function:%7B%22foo%22%3A%22bar%22%7D');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped({ foo: 'bar' });
    });
  });

  describe('wrapping multi function modules', function() {
    var module = {
      addPrefix: function(name) {
        return Promise.resolve('hello ' + name);
      }
    };

    it('looks up correct key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module::addPrefix:world');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped.addPrefix('world');
    });

    it('calls function correctly on cache miss', function(done) {
      var wrapper = getWrapper(function(key, cachedFunc, cb) {
        cachedFunc(cb);
      });

      var wrapped = wrapper('my-module', module);
      wrapped.addPrefix('world').then(function(result) {
        assert.equal(result, 'hello world');
        done();
      });
    });
  });

  describe('wrapping class modules', function() {
    var Klass = function(prefix) {
      this.prefix = prefix;
    };
    Klass.prototype.addPrefix = function(name) {
      return Promise.resolve(this.prefix + ' ' + name);
    };

    it('looks up correct key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module:hello:addPrefix:world');
        done();
      });

      var Wrapped = wrapper('my-module', Klass, {
        getInstanceId: function(obj) {
          return obj.prefix;
        }
      });

      var wrapped = new Wrapped('hello');
      wrapped.addPrefix('world');
    });

    it('looks up correct key when getInstanceId returns promise', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module:hello:addPrefix:world');
        done();
      });

      var Wrapped = wrapper('my-module', Klass, {
        getInstanceId: function(obj) {
          return Promise.resolve(obj.prefix);
        }
      });

      var wrapped = new Wrapped('hello');
      wrapped.addPrefix('world');
    });

    it('calls method correctly on cache miss', function(done) {
      var wrapper = getWrapper(function(key, cachedFunc, cb) {
        cachedFunc(cb);
      });

      var Wrapped = wrapper('my-module', Klass, {
        getInstanceId: function(obj) {
          return obj.prefix;
        }
      });
      var wrapped = new Wrapped('hello');
      wrapped.addPrefix('world').then(function(result) {
        assert.equal(result, 'hello world');
        done();
      });
    });
  });
});
