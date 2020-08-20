'use strict';
var _ = require('lodash');
var utils = require('../utils/utils');
var context = require('gitter-web-client-context');
var appEvents = require('../utils/appevents');
var debug = require('debug-proxy')('app:infinite-mixin');

module.exports = (function() {
  return {
    initialize: function() {
      this.atTop = false;
      this.atBottom = true;
      this._currentFetchCount = 0;
      // TODO: deal with state on RESET
    },

    getLoadLimit: function() {
      return Math.round((window.screen.height - 150) / 20);
    },

    getCollectionLimit: function() {
      return 5 * this.getLoadLimit();
    },

    ignoreDataChange: function(data) {
      if (data.operation === 'create') return !this.atBottom;

      return false;
    },

    fetchLatest: function(options, callback, context) {
      var self = this;
      if (this.atBottom) return;
      if (this._currentFetchCount > 0) return;

      var loadLimit = this.getLoadLimit();

      var data = (this.getQuery && this.getQuery()) || {};
      data = _.defaults(data, { limit: loadLimit /* Latest is the default */ });

      var existingIds = utils.index(this.pluck('id'), utils.identityTransform);

      debug('Fetch latest: options=%j data=%j', options, data);
      this.trigger('fetch:latest');
      this._currentFetchCount += 1;
      this.fetch({
        remove: 'remove' in options ? options.remove : false,
        add: 'add' in options ? options.add : true,
        merge: 'merge' in options ? options.merge : true,
        data: data,
        success: function(collection, response /*, options*/) {
          // jshint unused:true
          self.trigger('fetch:latest:complete');
          self.setAtBottom(true);

          // Accommodate
          // - `response.items` which happens with lookups
          // - `response` which happens with no extra params
          var responseIds = ((response && response.items) || response || []).map(utils.idTransform);
          var responseOverlaps = responseIds.some(function(id) {
            return existingIds[id];
          });

          if (!responseOverlaps) {
            // No overlap, we're going to need to delete the existing items
            var existingModels = Object.keys(existingIds).map(function(id) {
              return self.get(id);
            });
            self.remove(existingModels);
          }

          // Less than the requested limit? Must be at the top
          if (response.length < loadLimit) {
            // NO MORE
            self.setAtTop(true);
          } else {
            self.trimTop();
          }

          if (callback) callback.call(context);

          self._currentFetchCount -= 1;
        },
        error: function(err) {
          self.trigger('fetch:latest:complete');
          if (callback) callback.call(context || null, err);
          self._currentFetchCount -= 1;
        }
      });
    },

    fetchMoreBefore: function(options, callback, context) {
      if (this.atTop) return;
      if (this._currentFetchCount > 0) return;

      var beforeId;
      if (this.length) {
        beforeId = utils.min(this.pluck('id'));
      }

      var loadLimit = this.getLoadLimit();

      var data = (this.getQuery && this.getQuery()) || {};
      data = _.defaults(data, { beforeId: beforeId, limit: loadLimit });

      var self = this;
      debug('Fetch before: options=%j data=%j', options, data);
      this.trigger('fetch:before');
      this._currentFetchCount += 1;
      this.fetch({
        remove: 'remove' in options ? options.remove : false,
        add: 'add' in options ? options.add : true,
        merge: 'merge' in options ? options.merge : true,
        data: data,
        success: function(collection, response) {
          // jshint unused:true
          self.trigger('fetch:before:complete');

          if (response.length < loadLimit) {
            // NO MORE
            self.setAtTop(true);
          }
          self.trimBottom();

          if (callback) callback.call(context);
          self._currentFetchCount -= 1;
        },
        error: function(err) {
          self.trigger('fetch:before:complete');
          if (callback) callback.call(err);
          self._currentFetchCount -= 1;
        }
      });
    },

    fetchMoreAfter: function(options, callback, context) {
      var self = this;
      if (this.atBottom) return;
      if (this._currentFetchCount > 0) return;

      var afterId;
      if (this.length) {
        afterId = utils.max(this.pluck('id'));
      }

      var loadLimit = this.getLoadLimit();
      var data = (this.getQuery && this.getQuery()) || {};
      data = _.defaults(data, { afterId: afterId, limit: loadLimit });

      debug('Fetch after: options=%j data=%j', options, data);
      this.trigger('fetch:after');
      this._currentFetchCount += 1;
      this.fetch({
        remove: 'remove' in options ? options.remove : false,
        add: 'add' in options ? options.add : true,
        merge: 'merge' in options ? options.merge : true,
        data: data,
        success: function(collection, response) {
          // jshint unused:true
          self.trigger('fetch:after:complete');

          if (response.length < loadLimit) {
            // NO MORE
            self.setAtBottom(true);
          }
          self.trimTop();

          if (callback) callback.call(context);
          self._currentFetchCount -= 1;
        },
        error: function(err) {
          self.trigger('fetch:after:completed');
          if (callback) callback.call(err);
          self._currentFetchCount -= 1;
        }
      });
    },

    fetchAtPoint: function(query, options, callback, context) {
      if (!options) options = {};
      // if(this.atTop) return; // Already at the top
      if (this._currentFetchCount > 1) return;

      var loadLimit = this.getLoadLimit();

      var existingIds = utils.index(this.pluck('id'), utils.identityTransform);

      var data = (this.getQuery && this.getQuery()) || {};
      data = _.defaults(data, query, { limit: loadLimit });
      var self = this;

      debug('Fetch around: options=%j data=%j', options, data);
      this.trigger('fetch:at');
      this._currentFetchCount += 1;
      this.fetch({
        remove: 'remove' in options ? options.remove : false,
        add: 'add' in options ? options.add : true,
        merge: 'merge' in options ? options.merge : true,
        data: data,
        success: function(collection, response) {
          // jshint unused:true
          self.trigger('fetch:at:complete');

          // Accommodate
          // - `response.items` which happens with lookups
          // - `response` which happens with no extra params
          var responseIds = ((response && response.items) || response || []).map(utils.idTransform);
          var responseOverlaps = responseIds.some(function(id) {
            return existingIds[id];
          });

          if (!responseOverlaps) {
            self.setAtBottom(false);
            self.setAtTop(false);
            // No overlap, we're going to need to delete the existing items
            var existingModels = Object.keys(existingIds).map(function(id) {
              return self.get(id);
            });
            self.remove(existingModels);
          }

          // Ideally we should trim both sides
          self.trimBottom();

          if (callback) callback.call(context);
          self._currentFetchCount -= 1;
        },
        error: function(err) {
          self.trigger('fetch:at:complete');
          if (callback) callback.call(err);
          self._currentFetchCount -= 1;
        }
      });
    },

    fetchFromMarker: function(marker, options, callback, context) {
      return this.fetchAtPoint({ marker: marker }, options, callback, context);
    },

    /* Ensure that an item is loaded, and call the callback once it is */
    ensureLoaded: function(id, callback, context) {
      function done(err, item) {
        if (callback) {
          callback.call(context, err, item);
        }
      }

      var existing = this.get(id);
      if (existing) {
        return done(null, existing);
      }

      this.fetchAtPoint(
        { aroundId: id },
        {},
        function(err) {
          if (err) return done(err);
          return done(null, this.get(id));
        },
        this
      );
    },

    trimTop: function() {
      var collectionLimit = this.getCollectionLimit();

      if (this.length > collectionLimit) {
        var forRemoval = this.slice(0, -collectionLimit);
        this.remove(forRemoval);
        this.setAtTop(false);
      }
    },

    trimBottom: function() {
      var collectionLimit = this.getCollectionLimit();

      if (this.length > collectionLimit) {
        var forRemoval = this.slice(collectionLimit);
        this.remove(forRemoval);
        this.setAtBottom(false);
      }
    },

    getSnapshotState: function() {
      var extras;
      if (this.getSnapshotExtras) {
        extras = this.getSnapshotExtras();
      }

      var initialSnapshot = context().snapshots;
      if (initialSnapshot) {
        var config = initialSnapshot[this.modelName];

        // The initial snapshot config should only ever be configured
        // for the current room. ignore for preload cache stuff
        if (config && this.contextModel.get('troupeId') === context.getTroupeId()) {
          // Come up with a better algorithm for this
          this.setAtTop(false);
          this.setAtBottom(!config.aroundId);

          this.listenToOnce(this, 'snapshot', function() {
            delete initialSnapshot[this.modelName];
          });
          var snapshotState = _.extend(config, extras);
          return snapshotState;
        }
      }

      // TODO: handle initial load
      if (!this.length) return extras;

      if (this.atBottom) {
        // At the bottom is easy-ish
        return _.extend({ limit: this.length }, extras);
      }

      var end = this.at(this.length - 1).get('id');

      return _.extend({ limit: this.length, beforeInclId: end }, extras);
    },

    setAtTop: function(value) {
      if (!!value === !!this.atTop) return; // jshint ignore:line
      this.atTop = !!value;
      this.trigger('atTopChanged', this.atTop);
    },

    setAtBottom: function(value) {
      if (!!value === !!this.atBottom) return; // jshint ignore:line
      this.atBottom = !!value;
      this.trigger('atBottomChanged', this.atBottom);
      appEvents.trigger('atBottomChanged', this.atBottom);
    }
  };
})();
