'use strict';

var context = require('gitter-web-client-context');
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');

var transitionQueue = [];
var highwaterMark = 0;

function queueTransition(el) {
  transitionQueue.push(el);
  if (transitionQueue.length === 1) {
    setTimeout(dequeueTransition, 500);
  }
}

function dequeueTransition() {
  var el = transitionQueue.shift();
  if (!el) return;

  if (highwaterMark < transitionQueue.length) {
    highwaterMark = transitionQueue.length;
  }

  var classList = el.classList;
  classList.remove('unread');

  if (transitionQueue.length) {
    var time = highwaterMark > 10 ? 60 : 70;
    setTimeout(dequeueTransition, time);
  } else {
    highwaterMark = 0;
  }
}

var Behavior = Marionette.Behavior.extend({
  modelEvents: {
    'change:unread': 'unreadChanged'
  },

  onRender: function() {
    if (!context.isLoggedIn()) return;

    var model = this.view.model;
    if (!model) return;

    var unread = model.get('unread');
    if (unread) {
      this.el.classList.add('unread');
    }
  },

  unreadChanged: function(model, value, options) {
    if (value) {
      // Changing to unread
      this.el.classList.add('unread');
      return;
    }

    var previous = model.previous('unread');
    if (!previous) return; // On send, unread is undefined. Ignore changes from undefined to false

    if (options && options.fast) {
      this.el.classList.add('fast'); // Remove the transition
      this.el.classList.remove('unread');
    } else {
      queueTransition(this.el);
    }
  }
});

behaviourLookup.register('UnreadItems', Behavior);
module.exports = Behavior;
