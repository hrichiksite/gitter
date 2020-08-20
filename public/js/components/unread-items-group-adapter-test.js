'use strict';

jest.mock('../utils/raf');
const raf = require('../utils/raf');
raf.mockImplementation(function(fn) {
  setImmediate(fn);
});
const unreadItemsGroupAdapter = require('./unread-items-group-adapter');

var assert = require('assert');
var Promise = require('bluebird');
var Backbone = require('backbone');

describe('unread-items-group-adapter #slow', function() {
  it('should initialize', function() {
    var groups = new Backbone.Collection([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }]);

    var troupes = new Backbone.Collection([
      { id: 't1', groupId: 'g1' },
      { id: 't2', groupId: 'g2' },
      { id: 't3', groupId: 'g3' },
      { id: 't4', groupId: 'g1', mentions: 1 },
      { id: 't5', groupId: 'g2', unreadItems: 1 },
      { id: 't6', groupId: 'g3', activity: 1 },
      { id: 't7', groupId: 'g4' }
    ]);

    unreadItemsGroupAdapter(groups, troupes);

    return Promise.delay(10).then(function() {
      assert.deepEqual(groups.get('g1').attributes, {
        id: 'g1',
        activity: false,
        mentions: true,
        unreadItems: false,
        allHidden: false
      });

      assert.deepEqual(groups.get('g2').attributes, {
        id: 'g2',
        activity: false,
        mentions: false,
        unreadItems: true,
        allHidden: false
      });

      assert.deepEqual(groups.get('g3').attributes, {
        id: 'g3',
        activity: true,
        mentions: false,
        unreadItems: false,
        allHidden: false
      });

      assert.deepEqual(groups.get('g4').attributes, {
        id: 'g4',
        activity: false,
        mentions: false,
        unreadItems: false,
        allHidden: true
      });
    });
  });

  it('should handle changes events', function() {
    var groups = new Backbone.Collection([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }]);

    var troupes = new Backbone.Collection([
      { id: 't1', groupId: 'g1' },
      { id: 't2', groupId: 'g2' },
      { id: 't3', groupId: 'g3' }
    ]);

    unreadItemsGroupAdapter(groups, troupes);

    troupes.get('t1').set({ mentions: 1 });
    troupes.get('t2').set({ unreadItems: 1 });
    troupes.get('t3').set({ activity: 1 });

    return Promise.delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: true,
          unreadItems: false,
          allHidden: false
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: false,
          unreadItems: true,
          allHidden: false
        });

        assert.deepEqual(groups.get('g3').attributes, {
          id: 'g3',
          activity: true,
          mentions: false,
          unreadItems: false,
          allHidden: false
        });

        troupes.get('t1').set({ mentions: 0 });
        troupes.get('t2').set({ unreadItems: 0 });
        troupes.get('t3').set({ activity: 0 });
      })
      .delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g3').attributes, {
          id: 'g3',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });
      });
  });

  it('should handle changes lastAccessTime changes', function() {
    var groups = new Backbone.Collection([{ id: 'g1' }, { id: 'g2' }]);

    var troupes = new Backbone.Collection([
      { id: 't1', groupId: 'g1' },
      { id: 't2', groupId: 'g2' }
    ]);

    unreadItemsGroupAdapter(groups, troupes);

    troupes.get('t1').set({ lastAccessTime: new Date() });

    return Promise.delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: false
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        troupes.get('t1').set({ lastAccessTime: null });
        troupes.get('t2').set({ lastAccessTime: new Date() });
      })
      .delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: false
        });
      });
  });

  it('should handle rooms without a group', function() {
    var groups = new Backbone.Collection([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }]);

    var troupes = new Backbone.Collection([
      { id: 't1', groupId: 'g1' },
      { id: 't2', groupId: 'g2' },
      { id: 't3', groupId: 'g3' },
      { id: 't4' },
      { id: 't5' },
      { id: 't6' }
    ]);

    unreadItemsGroupAdapter(groups, troupes);

    troupes.get('t4').set({ mentions: 1 });
    troupes.get('t5').set({ unreadItems: 1 });
    troupes.get('t6').set({ activity: 1 });

    return Promise.delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g3').attributes, {
          id: 'g3',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        troupes.get('t4').set({ mentions: 0 });
        troupes.get('t5').set({ unreadItems: 0 });
        troupes.get('t6').set({ activity: 0 });
      })
      .delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g3').attributes, {
          id: 'g3',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });
      });
  });

  it('should handle resets', function() {
    var groups = new Backbone.Collection([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }]);

    var troupes = new Backbone.Collection([
      { id: 't1', groupId: 'g1' },
      { id: 't2', groupId: 'g2' },
      { id: 't3', groupId: 'g3' }
    ]);

    unreadItemsGroupAdapter(groups, troupes);

    return Promise.delay(10)
      .then(function() {
        groups.reset([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }]);

        troupes.reset([
          { id: 't1', groupId: 'g1' },
          { id: 't2', groupId: 'g2', mentions: 1 },
          { id: 't3', groupId: 'g3', activity: 1 },
          { id: 't4', groupId: 'g4', unreadItems: 1 }
        ]);
      })
      .delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: true,
          unreadItems: false,
          allHidden: false
        });

        assert.deepEqual(groups.get('g3').attributes, {
          id: 'g3',
          activity: true,
          mentions: false,
          unreadItems: false,
          allHidden: false
        });

        assert.deepEqual(groups.get('g4').attributes, {
          id: 'g4',
          activity: false,
          mentions: false,
          unreadItems: true,
          allHidden: false
        });
      });
  });

  it('should handle rooms changing groups', function() {
    var groups = new Backbone.Collection([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }]);

    var troupes = new Backbone.Collection([
      { id: 't1', groupId: 'g1', unreadItems: 1 },
      { id: 't2', groupId: 'g2', mentions: 1 },
      { id: 't3', groupId: 'g3', activity: 1 }
    ]);

    unreadItemsGroupAdapter(groups, troupes);

    return Promise.delay(10)
      .then(function() {
        troupes.get('t1').set({ groupId: 'g4' });
      })
      .delay(10)
      .then(function() {
        assert.deepEqual(groups.get('g1').attributes, {
          id: 'g1',
          activity: false,
          mentions: false,
          unreadItems: false,
          allHidden: true
        });

        assert.deepEqual(groups.get('g2').attributes, {
          id: 'g2',
          activity: false,
          mentions: true,
          unreadItems: false,
          allHidden: false
        });

        assert.deepEqual(groups.get('g3').attributes, {
          id: 'g3',
          activity: true,
          mentions: false,
          unreadItems: false,
          allHidden: false
        });

        assert.deepEqual(groups.get('g4').attributes, {
          id: 'g4',
          activity: false,
          mentions: false,
          unreadItems: true,
          allHidden: false
        });
      });
  });
});
