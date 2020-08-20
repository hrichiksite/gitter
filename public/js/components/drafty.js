'use strict';

var _ = require('lodash');
var localStore = require('./local-store');

var EVENTS = ['change', 'keydown', 'click', 'cut', 'paste'];

function Drafty(el, uniqueId) {
  this.el = el;
  if (!uniqueId) {
    uniqueId = window.location.pathname
      .split('/')
      .splice(1)
      .join('_');
  }

  this.uniqueId = uniqueId;

  var value = localStore.get('drafty_' + this.uniqueId);

  if (value && !el.value) {
    el.value = value;
  } else if (el.value) {
    this.update();
  }

  var periodic = _.throttle(this.update.bind(this), 1000, { leading: false });
  this.updatePeriodic = periodic;

  EVENTS.forEach(function(e) {
    el.addEventListener(e, periodic, false);
  });

  this.update = this.update.bind(this);
}

Drafty.prototype.refresh = function() {
  var value = localStore.get('drafty_' + this.uniqueId);
  this.el.value = value;
};

Drafty.prototype.update = function() {
  var value = this.el.value;

  /* Don't save anything too long, as it kills localstorage */
  if (value && value.length > 4096) {
    value = '';
  }

  if (value) {
    localStore.set('drafty_' + this.uniqueId, value);
  } else {
    this.reset();
  }
};

Drafty.prototype.reset = function() {
  localStore.remove('drafty_' + this.uniqueId);
};

Drafty.prototype.disconnect = function() {
  var periodic = this.updatePeriodic;
  var el = this.el;
  EVENTS.forEach(function(e) {
    el.removeEventListener(e, periodic, false);
  });
};

Drafty.prototype.setUniqueId = function(newUniqueId) {
  // TODO: consider saving the current text before the switch?
  this.uniqueId = newUniqueId;
  this.refresh();
};

module.exports = function(element, id) {
  return new Drafty(element, id);
};
