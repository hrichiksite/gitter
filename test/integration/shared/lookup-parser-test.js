'use strict';

var assert = require('assert');
var lookupParser = require('gitter-web-shared/lookup-parser');

describe('lookup-parser', function() {
  it('should replace ids with objects', function() {
    var input = {
      lookups: {
        things: [{ id: 1, name: 'one' }, { id: 2, name: 'two' }]
      },
      items: [{ label: 'foo', thing: 1 }, { label: 'bar', thing: 2 }]
    };
    var items = lookupParser.parseLookups(input, { thing: 'things' });
    assert.equal(items[0].thing.name, 'one');
    assert.equal(items[1].thing.name, 'two');
  });
});
