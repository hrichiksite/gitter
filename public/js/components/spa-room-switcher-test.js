'use strict';

var Backbone = require('backbone');
var assert = require('assert');
var url = require('url');

const BASE_PATH = 'https://gitter.im';

function parseUrl(href) {
  var full = url.resolve(BASE_PATH, href);
  var parsed = url.parse(full);

  return {
    hash: parsed.hash,
    host: parsed.host,
    hostname: parsed.hostname,
    href: parsed.href,
    origin: null, // Don't pass this through for testing IE
    pathname: parsed.pathname,
    port: parsed.port,
    search: parsed.search,
    protocol: parsed.protocol
  };
}
function fixtureTroupes() {
  return new Backbone.Collection([
    { url: '/gitterHQ/gitter' },
    { url: '/gitterHQ' },
    { url: '/suprememoocow' }
  ]);
}

function locationDelegate(location) {
  return function() {
    return parseUrl(location);
  };
}

jest.mock('../utils/url-parser');
const urlParser = require('../utils/url-parser');
urlParser.parse.mockImplementation(function(href) {
  return parseUrl(href);
});
urlParser.format.mockImplementation(function(options) {
  var partial = url.format(options);
  var full = url.resolve(BASE_PATH, partial);
  return full;
});
const SPARoomSwitcher = require('./spa-room-switcher');

describe('spa-room-switcher', function() {
  it('should switch rooms from one chat room to another', function() {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );
    var count = 0;

    roomSwitcher.on('replace', function(/*href*/) {
      assert.ok(false);
    });

    roomSwitcher.on('reload', function() {
      assert.ok(false);
    });

    roomSwitcher.on('switch', function(troupe, permalinkChatId) {
      assert.strictEqual(troupe.get('url'), '/gitterHQ/gitter');
      assert(!permalinkChatId);
      count++;
    });

    roomSwitcher.change('/gitterHQ/gitter/~chat');
    assert.strictEqual(count, 1);
  });

  it('should replace the URL when the room cannot be found', function() {
    window.location.assign = jest.fn();

    const roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('switch', function(/*troupe permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('/gubbings/newroom/~chat');

    expect(window.location.assign).toHaveBeenCalledWith('/gubbings/newroom');
  });

  it('should replace the URL when the current frame is not a chat', function(done) {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~home'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('switch', function(troupe /*, permalinkChatId*/) {
      assert.strictEqual(troupe.get('url'), '/gitterHQ/gitter');
      done();
    });

    roomSwitcher.change('/gitterHQ/gitter/~chat');
  });

  it('should replace the URL when the frame being switched to not a chat', function() {
    window.location.assign = jest.fn();

    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('/gitterHQ/gitter/~blah');

    expect(window.location.assign).toHaveBeenCalledWith('/gitterHQ/gitter');
  });

  it('should reload the URL when the frame being switched has the same URL as the current room', function(done) {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat?at=1838383838383'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('switch', function(troupe /*permalinkChatId*/) {
      assert.strictEqual(troupe.get('url'), '/suprememoocow');
      done();
    });

    roomSwitcher.change('/suprememoocow/~chat?at=1838383838383');
  });

  it('replace with a path name if a fully qualified org room url is passed', function() {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat?at=1838383838383'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('replace', function(href) {
      assert.equal('/orgs/gitterHQ/rooms/~iframe', href);
    });

    roomSwitcher.on('reload', function() {
      assert.ok(false);
    });

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('http://localhost:5000/orgs/gitterHQ/rooms');
  });

  it('replace with a path name if a fully qualified org room url with a trailing slash is passed', function() {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat?at=1838383838383'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('replace', function(href) {
      assert.equal('/orgs/gitterHQ/rooms/~iframe', href);
    });

    roomSwitcher.on('reload', function() {
      assert.ok(false);
    });

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('http://localhost:5000/orgs/gitterHQ/rooms/');
  });

  it('replace with a path name if a fully qualified org room url with a trailing ~iframe is passed', function() {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat?at=1838383838383'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('replace', function(href) {
      assert.equal('/orgs/gitterHQ/rooms/~iframe', href);
    });

    roomSwitcher.on('reload', function() {
      assert.ok(false);
    });

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('http://localhost:5000/orgs/gitterHQ/rooms/~iframe');
  });

  it('should not replace a valid user name with an org room url', function() {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat?at=1838383838383'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('replace', function(href) {
      assert.notEqual('/borgs/~iframe', href);
    });

    roomSwitcher.on('reload', function() {
      assert.ok(false);
    });

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('http://localhost:5000/borgs');
  });

  it('should not replace a valid repo name with an org room url', function() {
    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/suprememoocow/~chat?at=1838383838383'),
      locationDelegate('https://gitter.im/suprememoocow/')
    );

    roomSwitcher.on('replace', function(href) {
      assert.notEqual('/orgs/porgs/~iframe', href);
    });

    roomSwitcher.on('reload', function() {
      assert.ok(false);
    });

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('http://localhost:5000/orgs/porgs/');
  });

  /**
   * https://github.com/troupe/gitter-webapp/issues/683
   */
  it('should not have issues with the dev-ua room ', function() {
    window.location.assign = jest.fn();

    var roomSwitcher = new SPARoomSwitcher(
      fixtureTroupes(),
      BASE_PATH,
      locationDelegate('https://gitter.im/dev-ua/~chat'),
      locationDelegate('https://gitter.im/dev-ua/')
    );

    roomSwitcher.on('switch', function(/*troupe, permalinkChatId*/) {
      assert.ok(false);
    });

    roomSwitcher.change('https://gitter.im/orgs/dev-ua/rooms/');

    expect(window.location.assign).toHaveBeenCalledWith('/orgs/dev-ua/rooms/');
  });
});
