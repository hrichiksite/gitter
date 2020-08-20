'use strict';

var isPhone = require('../test-require')('./web/is-phone');
var assert = require('assert');

var useragent = require('useragent');

function makeRequest(userAgent) {
  return {
    headers: {
      'user-agent': userAgent
    },
    getParsedUserAgent: function() {
      return useragent.parse(userAgent);
    }
  };
}

describe('phone detection', function() {
  it('detects iPhone as a phone', function() {
    var req = makeRequest(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B141 Safari/8536.25'
    );
    assert(isPhone(req));
  });

  it('detects iPod touch as a phone', function() {
    var req = makeRequest(
      'Mozilla/5.0 (iPod; U; CPU iPhone OS 4_3_3 like Mac OS X; ja-jp) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5'
    );
    assert(isPhone(req));
  });

  it('detects iPad as not a phone', function() {
    var req = makeRequest(
      'Mozilla/5.0 (iPad; CPU OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B141 Safari/8536.25'
    );
    assert(!isPhone(req));
  });

  it('detects anthing android as a phone', function() {
    var req = makeRequest(
      'Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; T-Mobile myTouch 3G Slide Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'
    );
    assert(isPhone(req));
  });

  it('detects desktop as not a phone', function() {
    var req = makeRequest(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36'
    );
    assert(!isPhone(req));
  });

  it('detects firefox mobile os as a phone', function() {
    var req = makeRequest('Mozilla/5.0 (Mobile; ZTEOPEN; rv:18.1) Gecko/18.1 Firefox/18.1');
    assert(isPhone(req));
  });

  it('assumes garbage user-agent is not a phone', function() {
    var req = makeRequest('nonsense');
    assert(!isPhone(req));
  });
});
