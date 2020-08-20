'use strict';

var _ = require('lodash');
var Backbone = require('backbone');

module.exports = (function() {
  // const - 5 minutes window to merge messages into previous burst
  var BURST_WINDOW = 5 * 60 * 1000;

  /**
   * toCollection() converts an Array to a Backbone.Collection
   * we do this in order to separate business logic from infrastructure workaround
   *
   * collection   Array or Backbone.Collection - Structure in which a check is performed
   * returns      Backbone.Collection - the converted structure
   */
  function toCollection(collection) {
    if (_.isArray(collection)) return new Backbone.Collection(collection);
    return collection;
  }

  /**
   * findBurstAbove() finds the first burstStart above the given index
   *
   * index Number - index used to find burst start
   * @return Number - the index of burstStart found above
   */
  function findBurstAbove(index) {
    var chat = null;
    if (index === 0) return index;
    while (index--) {
      chat = this.at(index);
      if (chat.get('burstStart')) break;
    }
    return index;
  }

  /**
   * findBurstBelow() finds the first burstStart below the given index
   *
   * index Number - index used to find burst start
   * @return Number - the index of burstStart found below
   */
  function findBurstBelow(index) {
    if (index === this.length - 1) return index;
    var chat = null;
    while (index < this.length) {
      chat = this.at(index);
      if (chat.get('burstStart')) break;
      index++;
    }
    return index;
  }

  /**
   * findSlice() triggers a parse based on a model, however it finds the correct `slice`
   * of the chat-collection to be recalculated. To summarize: This function is responsible for calling parse
   * with a subset of the collection.
   *
   * model    Backbone.Model - the model that is to be added to the collection
   * returns  void - it simply calls parse(), which mutates the collection directly
   */
  function findSlice(model) {
    if ('burstStart' in model.attributes) return; // already calculated bursts for this batch
    var index = this.indexOf(model);
    var start = findBurstAbove.call(this, index);
    var end = findBurstBelow.call(this, index);
    parse(this, start, end);
  }

  /**
   * calculateBurst() analyses what criteria a chat-item meets and modifies the current burst state accordingly
   *
   * chat     Backbone.Model - the chat-item to be analysed
   * state    Object - the current burst state
   *
   * returns  void - it mutates the object directly
   */
  function calculateBurst(chat, state) {
    var fromUser = chat.get('fromUser');
    var sent = chat.get('sent');
    var user = fromUser && fromUser.username;
    var time = (sent && new Date(sent).valueOf()) || Date.now();

    if (chat.get('status')) {
      state.burstStart = true;
      state.status = true;
      state.time = time;
      return;
    }

    var outsideBurstWindow = time - state.time > BURST_WINDOW;

    if (state.status || user !== state.user || outsideBurstWindow) {
      state.burstStart = true;
      state.user = user;
      state.time = time;

      state.status = false; // resetting the status, because it might have been true
      return;
    }

    state.burstStart = false;
    state.user = user;
    return;
  }

  /**
   * parse() detects each chat-item on a Collection regarding their burst status
   *
   * collection   Backbone.Collection - the collection to be iterated over
   * start        Number - index set as the starting point of the iteration
   * end          Number - index set as the ending point of the iteration
   *
   * returns Object - the mutated collection (Backbone.Collection.toJSON())
   */
  function parse(collection_, start, end) {
    var collection = toCollection(collection_);

    // pre-run checks
    if (!collection) return;
    start = typeof start !== 'undefined' ? start : 0; // start defaults at index 0
    end = typeof end !== 'undefined' ? end : collection.length - 1; // end defaults at index n

    var state = {
      user: null,
      burstStart: false,
      status: false,
      time: null,
      parentId: null
    };

    collection.slice(start, end + 1).forEach(function(chat) {
      if (chat.get('parentId')) return; // ignore thread messages for now
      calculateBurst(chat, state);
      chat.set('burstStart', state.burstStart);
    });

    return collection.toJSON();
  }

  /* public interface */
  return {
    calc: findSlice,
    parse: parse
  };
})();
