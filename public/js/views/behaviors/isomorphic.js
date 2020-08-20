'use strict';
var _ = require('lodash');
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');

var Behavior = Marionette.Behavior.extend({
  onRender: function() {
    this.setupRegions();
  },

  onBeforeShow: function() {
    this.setupRegions();
  },

  setupRegions: function() {
    /* Only perform setup once */
    if (this.setup) return;
    this.setup = 1;

    var view = this.view;
    var isoRegions = this.options;

    Object.keys(isoRegions).forEach(function(regionName) {
      var isoRegionDefn = isoRegions[regionName];
      var el = isoRegionDefn.el;
      var region = view.addRegion(regionName, el);
      var initMethod = isoRegionDefn.init;

      if (!initMethod) return;

      function optionsForRegion(options, config) {
        var regionEl = region.$el[0];
        if (!regionEl) throw new Error('Region ' + regionName + ' does not exist.');

        var regionElChildLen = regionEl.children.length;

        var baseOptions;
        if (regionElChildLen === 0) {
          baseOptions = {};
        } else if (regionElChildLen === 1) {
          if (config && config.rerender) {
            baseOptions = { el: regionEl.children[0] };
          } else {
            baseOptions = { template: false, el: regionEl.children[0] };
          }
        } else {
          throw new Error(
            'Region can have zero or one elements, but not more. Region ' +
              regionName +
              ' has ' +
              regionElChildLen +
              '. Are you sure you wrapped the region with a parent?'
          );
        }

        if (!options) return baseOptions;
        return _.extend(baseOptions, options);
      }

      // Allow the init methods to be specified as a string
      if (typeof initMethod === 'string') {
        initMethod = view[initMethod];
      }

      var childView = initMethod.call(view, optionsForRegion, region);
      if (childView) {
        view.showChildView(regionName, childView);
      }
    });
  }
});

behaviourLookup.register('Isomorphic', Behavior);

module.exports = Behavior;
