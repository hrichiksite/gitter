'use strict';

var debug = require('debug-proxy')('app:conditional-debounce');

/**
 * This is a special type of debounce function in which the
 * all the conditions have to be met before the debounce function
 * will fire. If any of the conditions become unmet, the timer
 * will be cancelled.
 *
 * It is used in `reload-on-update` to ensure that the user is
 * eyeballs off, online, etc before reloading the browser.
 *
 * Remember: Even when all the conditions are met, they need to remain met
 * until the timeout has expired.
 */
function ConditionalDebouncer(conditions, timeout, fn) {
  this.conditions = conditions;
  this.timeout = timeout;
  this.timer = null;
  this.fn = fn;
  this.checkConditions();
}

ConditionalDebouncer.prototype.set = function(field, value) {
  this.conditions[field] = value;
  debug('set: %s=%s', field, value);
  this.checkConditions();
};

ConditionalDebouncer.prototype.checkConditions = function() {
  debug('check conditions: %j', this.conditions);

  var conditions = this.conditions;
  var launchSequenceGo = Object.keys(conditions).every(function(key) {
    return conditions[key];
  });

  if (launchSequenceGo) {
    if (!this.timer) {
      debug('All signals go. Commencing countdown sequence.');
      this.timer = setTimeout(this.fire.bind(this), this.timeout);
    }
    // Otherwise we've already set it
  } else {
    if (this.timer) {
      debug('Some signals no go. Cancelling timeout function');

      clearTimeout(this.timer);
      this.timer = null;
    }
  }
};

ConditionalDebouncer.prototype.fire = function() {
  this.timer = null;
  debug('Debounced timeout, firing debounced function');
  this.fn();
};

ConditionalDebouncer.prototype.cancel = function() {
  clearTimeout(this.timer);
  this.timer = null;
};

module.exports = ConditionalDebouncer;
