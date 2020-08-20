'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var _ = require('lodash');

var View = Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: Marionette.ItemView.extend({
    tagName: 'li',
    template: _.template('<%= text %>')
  }),
  initialize: function() {
    this.collection = new Backbone.Collection([]);
  },
  resetFromHash: function(notificationFeaturesHash) {
    var features = [];
    if (notificationFeaturesHash.unread) {
      features.push({ id: 1, text: 'Show unread item counts' });
      features.push({
        id: 6,
        text:
          'You will get emails for all unread messages which we know might be undesirable, see #1205'
      });
    }

    if (notificationFeaturesHash.activity) {
      features.push({ id: 2, text: 'Show activity indicator on chat' });
    }

    if (notificationFeaturesHash.desktop) {
      features.push({ id: 5, text: 'Notify for all chats' });
    }

    if (notificationFeaturesHash.mention) {
      features.push({ id: 3, text: "Notify when you're mentioned" });
    }

    if (notificationFeaturesHash.announcement) {
      features.push({ id: 4, text: 'Notify on @/all announcements' });
    }

    // For now, desktop = mobile so don't confuse the user
    // if (notificationFeaturesHash.mobile) {
    //   features.push({ id: 6, text: 'Mobile notifications for chats' });
    // }

    this.collection.reset(features);
    return features.length;
  },

  resetFromMode: function(mode) {
    var features = [];
    if (mode === 'all' || mode === 'announcement') {
      features.push({ id: 1, text: 'Show unread item counts' });
      features.push({
        id: 6,
        text:
          'You will get emails for all unread messages which we know might be undesirable, see #1205'
      });
    }

    if (mode === 'mute') {
      features.push({ id: 2, text: 'Show activity indicator on chat' });
    }

    if (mode === 'all') {
      features.push({ id: 5, text: 'Notify for all chats' });
    }

    features.push({ id: 3, text: "Notify when you're mentioned" });

    if (mode === 'all' || mode === 'announcement') {
      features.push({ id: 4, text: 'Notify on @/all announcements' });
    }

    this.collection.reset(features);
    return features.length;
  }
});

module.exports = View;
