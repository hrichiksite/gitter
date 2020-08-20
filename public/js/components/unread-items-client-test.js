'use strict';
const sinon = require('sinon');
const assert = require('assert');

jest.mock('./unread-items-client-store');
jest.mock('./realtime');
jest.mock('../utils/raf');
jest.mock('./eyeballs-detector');
jest.mock('../utils/passive-event-listener');

// this crazy setup is mocking all functionality that's not needed for tests and has a hard time booting up without DOM
global.window = { addEventListener: () => {} };
const unreadItemsClient = require('./unread-items-client');

describe('unread-items-client', function() {
  const getItems = sinon.stub();
  const getMentions = sinon.stub();

  afterEach(() => {
    getItems.resetBehavior();
    getMentions.resetBehavior();
  });

  describe('TroupeUnreadItemsViewportMonitor', () => {
    const testUnreadItemsViewportMonitor = ({ unreadItems, mentions, itemsInViewport }) => {
      getItems.returns(unreadItems);
      getMentions.returns(mentions);
      const unreadItemsMonitor = new unreadItemsClient._TestOnlyTroupeUnreadItemsViewportMonitor(
        [],
        {
          getItems,
          getMentions,
          on: () => {}
        },
        { collection: { on: () => {}, models: [] }, listenTo: () => {}, children: [] }
      );
      unreadItemsMonitor.findModelsInViewport = () => itemsInViewport.map(i => ({ id: i }));
      unreadItemsMonitor._foldCount();
      const acrossTheFoldModel = unreadItemsClient.acrossTheFold();
      return acrossTheFoldModel.attributes;
    };

    it('should find unreads above', () => {
      const result = testUnreadItemsViewportMonitor({
        unreadItems: ['A', 'B', 'C', 'Y', 'Z'],
        mentions: [],
        itemsInViewport: ['C', 'D']
      });
      assert.equal(result.unreadAbove, 2);
      assert.equal(result.oldestUnreadItemId, 'A');
    });
    it('should find unreads below', () => {
      const result = testUnreadItemsViewportMonitor({
        unreadItems: ['A', 'Y', 'Z'],
        mentions: [],
        itemsInViewport: ['C', 'X']
      });
      assert.equal(result.unreadBelow, 2);
      assert.equal(result.firstUnreadItemIdBelow, 'Y');
    });
    it('should find mentions above', () => {
      const result = testUnreadItemsViewportMonitor({
        unreadItems: ['A', 'B', 'C', 'D', 'Y', 'Z'],
        mentions: ['B', 'C', 'Y'],
        itemsInViewport: ['D', 'X']
      });
      assert.equal(result.mentionsAbove, 2);
      assert.equal(result.oldestMentionId, 'B');
    });
    it('should find mentions below', () => {
      const result = testUnreadItemsViewportMonitor({
        unreadItems: ['A', 'B', 'C', 'D', 'X', 'Y', 'Z'],
        mentions: ['C', 'X', 'Y', 'Z'],
        itemsInViewport: ['D', 'X']
      });
      assert.equal(result.mentionsBelow, 3);
      assert.equal(result.firstMentionIdBelow, 'X');
    });
    it('should include count unreads/mentions that are in the viewport id range to unreads/mentions below', () => {
      // this is due to the fact that thread messages can be in the range
      // between top item ID and bottom item ID but are not shown to the user
      const result = testUnreadItemsViewportMonitor({
        unreadItems: ['A', 'B', 'C', 'D', 'X', 'Y', 'Z'],
        mentions: ['B', 'C', 'D', 'X', 'Y', 'Z'],
        itemsInViewport: ['C', 'D', 'X', 'Y']
      });
      assert.equal(result.unreadAbove, 2);
      assert.equal(result.oldestUnreadItemId, 'A');
      assert.equal(result.unreadBelow, 5);
      assert.equal(result.firstUnreadItemIdBelow, 'D');
      assert.equal(result.mentionsAbove, 1);
      assert.equal(result.oldestMentionId, 'B');
      assert.equal(result.mentionsBelow, 5);
      assert.equal(result.firstMentionIdBelow, 'D');
    });
  });
});
