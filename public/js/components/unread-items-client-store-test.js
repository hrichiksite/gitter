'use strict';

var UnreadItemsStore = require('./unread-items-client-store');
var assert = require('assert');
var sinon = require('sinon');

describe('unread-items-client-store', function() {
  let store;
  let onUnreadItemRemoved;
  let onChangeStatus;
  let onItemMarkedRead;
  let onAdd;
  beforeEach(function() {
    store = new UnreadItemsStore();
    onUnreadItemRemoved = sinon.spy();
    onChangeStatus = sinon.spy();
    onItemMarkedRead = sinon.spy();
    onAdd = sinon.spy();

    store.on('unreadItemRemoved', onUnreadItemRemoved);
    store.on('change:status', onChangeStatus);
    store.on('itemMarkedRead', onItemMarkedRead);
    store.on('add', onAdd);
  });

  it('should add items', function() {
    store._unreadItemAdded('1', false);
    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', false));
  });

  it('should add multiple items', function() {
    store._unreadItemAdded('1', false);
    store._unreadItemAdded('2', false);
    assert.strictEqual(store.length, 2);
    assert.deepEqual(store.getItems(), ['1', '2']);
    assert.strictEqual(store.getFirstItem(), '1');

    assert.strictEqual(2, onAdd.callCount);
    assert(onAdd.calledWith('1', false));
    assert(onAdd.calledWith('2', false));
  });

  it('should add mentions', function() {
    store._unreadItemAdded('1', true);
    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), ['1']);

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', true));
  });

  it('should add unread items which become mentions', function() {
    store._unreadItemAdded('1', false);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), []);

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', false));

    store._unreadItemAdded('1', true);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), ['1']);

    assert.strictEqual(1, onAdd.callCount);
    assert.strictEqual(1, onChangeStatus.callCount);

    assert(onChangeStatus.calledWith('1', true));
  });

  it('should add unread items which become unmentions', function() {
    store._unreadItemAdded('1', true);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), ['1']);

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', true));

    store._unreadItemAdded('1', false);

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), []);

    assert.strictEqual(1, onAdd.callCount);
    assert.strictEqual(1, onChangeStatus.callCount);
    assert(onChangeStatus.calledWith('1', false));
  });

  it('should remove', function() {
    store._unreadItemAdded('1', false);

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', false));

    store._unreadItemRemoved('1');

    assert.strictEqual(1, onUnreadItemRemoved.callCount);
    assert(onUnreadItemRemoved.calledWith('1'));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);

    assert.strictEqual(false, store.isMarkedAsRead('1'));
  });

  it('should mark an item as read', function() {
    store._unreadItemAdded('1', false);
    store.markItemRead('1');

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', false));

    assert.strictEqual(1, onItemMarkedRead.callCount);
    assert(onItemMarkedRead.calledWith('1', false, false));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);

    assert(store.isMarkedAsRead('1'));
  });

  it('should handle bulk unreadItemsAdded', function() {
    store.add({ chat: ['1'] });

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', false));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), []);
  });

  it('should handle bulk unreadItemsAdded with mentions', function() {
    store.add({ chat: ['1'], mention: ['1'] });

    assert.strictEqual(1, onAdd.callCount);
    assert(onAdd.calledWith('1', true));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), ['1']);
  });

  it('should handle bulk unreadItemsRemoved', function() {
    store._unreadItemAdded('1');
    store._unreadItemAdded('2');

    store.remove({ chat: ['1'] });

    assert.strictEqual(1, onUnreadItemRemoved.callCount);
    assert(onUnreadItemRemoved.calledWith('1'));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['2']);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead('1'));
  });

  it('should handle bulk unreadItemsRemoved with mentions', function() {
    store._unreadItemAdded('1', true);
    store._unreadItemAdded('2', true);

    store.remove({ chat: ['1'], mention: ['1'] });

    assert.strictEqual(1, onUnreadItemRemoved.callCount);
    assert(onUnreadItemRemoved.calledWith('1'));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['2']);
    assert.deepEqual(store.getMentions(), ['2']);

    assert(!store.isMarkedAsRead('1'));
  });

  it('should handle bulk unreadItemsAdded with mention upgrade', function() {
    store._unreadItemAdded('1', false);

    store.add({ mention: ['1'] });

    assert.strictEqual(1, onChangeStatus.callCount);
    assert(onChangeStatus.calledWith('1', true));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), ['1']);
  });

  it('should handle bulk unreadItemsRemoved with mention downgrade', function() {
    store._unreadItemAdded('1', true);

    store.remove({ mention: ['1'] });

    assert.strictEqual(1, onChangeStatus.callCount);
    assert(onChangeStatus.calledWith('1', false));

    assert.strictEqual(store.length, 1);
    assert.deepEqual(store.getItems(), ['1']);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead('1'));
  });

  it('should handle an item being added after its been marked as read', function() {
    store.markItemRead('1');

    assert.strictEqual(1, onItemMarkedRead.callCount);
    assert.strictEqual(0, onAdd.callCount);
    assert(onItemMarkedRead.calledWith('1', false, false));

    store.add({ chat: ['1'] });

    assert.strictEqual(2, onItemMarkedRead.callCount);
    assert.strictEqual(0, onAdd.callCount);

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);
    assert.deepEqual(store.getMentions(), []);

    assert(store.isMarkedAsRead('1'));
  });

  it('should handle markAllAsRead', function() {
    store.add({ chat: ['1', '2'], mention: ['1'] });

    store.markAllRead();

    assert.strictEqual(2, onItemMarkedRead.callCount);
    assert(onItemMarkedRead.calledWith('1', true, false));
    assert(onItemMarkedRead.calledWith('2', false, false));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);
    assert.deepEqual(store.getMentions(), []);

    assert(store.isMarkedAsRead('1'));
    assert(store.isMarkedAsRead('2'));
  });

  it('should handle markAllReadNotification', function() {
    store.add({ chat: ['1', '2'], mention: ['1'] });

    store.markAllReadNotification();

    assert.strictEqual(0, onItemMarkedRead.callCount);
    assert.strictEqual(2, onUnreadItemRemoved.callCount);
    assert(onUnreadItemRemoved.calledWith('1'));
    assert(onUnreadItemRemoved.calledWith('2'));

    assert.strictEqual(store.length, 0);
    assert.deepEqual(store.getItems(), []);
    assert.deepEqual(store.getMentions(), []);

    assert(!store.isMarkedAsRead('1'));
    assert(!store.isMarkedAsRead('2'));
  });
});
