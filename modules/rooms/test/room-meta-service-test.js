'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var roomMetaService = require('../lib/room-meta-service');

describe('room-meta-service #slow', function() {
  var fixture = fixtureLoader.setupEach({
    troupe1: {},
    troupe2: {},
    troupe3: {},
    troupeMeta2: {
      troupe: 'troupe2',
      welcomeMessage: 'hello'
    },
    troupeMeta3: {
      troupe: 'troupe3'
    }
  });

  it('should handle missing metadata', function() {
    return roomMetaService
      .findMetaByTroupeId(fixture.troupe1.id, ['welcomeMessage'])
      .then(function(result) {
        assert.deepEqual(result, {});
      });
  });

  it('should upsert and retrieve a record', function() {
    var welcomeMessage = {
      text: 'blah',
      html: 'bob'
    };

    return roomMetaService
      .upsertMetaKey(fixture.troupe2.id, 'welcomeMessage', welcomeMessage)
      .then(function() {
        return roomMetaService.findMetaByTroupeId(fixture.troupe2.id, ['welcomeMessage']);
      })
      .then(function(meta) {
        assert.deepEqual(meta, { welcomeMessage });
        // Make sure one meta doesnt override the other, which was happening before
        return roomMetaService.findMetaByTroupeId(fixture.troupe1.id, ['welcomeMessage']);
      })
      .then(function(result) {
        assert.deepEqual(result, {});
      });
  });

  it('should be able to retrieve keys', async () => {
    const result = await roomMetaService.findMetaByTroupeId(fixture.troupe2.id, ['welcomeMessage']);

    assert.deepStrictEqual(result, {
      welcomeMessage: { text: 'hello' }
    });
  });

  it('should retrieve metadata for multiple troupes', async () => {
    const result = await roomMetaService.findMetaByTroupeIds([
      fixture.troupe2.id,
      fixture.troupe3.id
    ]);

    // converting ids to strings fort easy deep equal comparison
    const stringIdResult = result.map(meta => ({ ...meta, troupeId: meta.troupeId.toString() }));

    assert.deepStrictEqual(stringIdResult, [
      {
        troupeId: fixture.troupe2.id,
        welcomeMessage: { text: 'hello' }
      },
      {
        troupeId: fixture.troupe3.id
      }
    ]);
  });
});
