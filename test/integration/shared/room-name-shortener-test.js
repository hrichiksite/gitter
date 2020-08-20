'use strict';

var roomNameShortener = require('../test-require')('gitter-web-shared/room-name-shortener');
var assert = require('assert');

describe('room-name-shortener', function() {
  it('Keeps short names as-is', function() {
    assert.equal(roomNameShortener('foo'), 'foo');
  });

  it('Keeps long names(>16 characters) with one piece as-is', function() {
    assert.equal(
      roomNameShortener('foobarbazquxgarplywaldofredthudasdfqwer'),
      'foobarbazquxgarplywaldofredthudasdfqwer'
    );
  });

  it('Keeps length 15 as-is', function() {
    assert.equal(roomNameShortener('foobarbaz/quxaf'), 'foobarbaz/quxaf');
  });
  it('Keeps length 16 as-is', function() {
    assert.equal(roomNameShortener('foobarbaz/quxafd'), 'foobarbaz/quxafd');
  });

  it('Keeps short group and room-name as-is', function() {
    assert.equal(roomNameShortener('foo/bar'), 'foo/bar');
  });

  it('Truncates long room name to just the room name', function() {
    assert.equal(
      roomNameShortener('foo/barbazquxgarplywaldofredthudasdfqwer'),
      'barbazquxgarplywaldofredthudasdfqwer'
    );
  });

  it('Truncates many levels into something <=16 characters', function() {
    assert.equal(roomNameShortener('foo/bar/baz/qux/garply/waldo/fred/thud'), 'waldo/fred/thud');
  });

  it('Truncates empty levels at the beginning', function() {
    assert.equal(
      roomNameShortener('//foobarbazquxgarplywaldofredthud'),
      'foobarbazquxgarplywaldofredthud'
    );
  });
  it('Truncates empty levels at the beginning and keeps under <=16 characters', function() {
    assert.equal(roomNameShortener('//foobarbazquxgarplywaldofredthud/asdf'), 'asdf');
  });

  describe('odd one-to-one and group names', function() {
    it('Anand Babu (AB) Periasamy', function() {
      assert.equal(roomNameShortener('Anand Babu (AB) Periasamy'), 'Anand Babu (AB) Periasamy');
    });
    it('Fannar Snær Harðarson', function() {
      assert.equal(roomNameShortener('Fannar Snær Harðarson'), 'Fannar Snær Harðarson');
    });
    it('Ricardo Sequerra Amram', function() {
      assert.equal(roomNameShortener('Ricardo Sequerra Amram'), 'Ricardo Sequerra Amram');
    });
    it('Андрей Листочкин (Andrey Listochkin)', function() {
      assert.equal(
        roomNameShortener('Андрей Листочкин (Andrey Listochkin)'),
        'Андрей Листочкин (Andrey Listochkin)'
      );
    });
    it('EricTroupeTester-Org', function() {
      assert.equal(roomNameShortener('EricTroupeTester-Org'), 'EricTroupeTester-Org');
    });
  });
});
