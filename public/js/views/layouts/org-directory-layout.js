'use strict';

var Marionette = require('backbone.marionette');

var HeaderView = require('../org-directory/org-directory-header-view');

require('../behaviors/isomorphic');

var OrgDirectoryLayout = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      headerView: { el: '.org-page__header', init: 'initHeaderView' }
    }
  },

  initHeaderView: function(optionsForRegion) {
    this.headerView = new HeaderView(
      optionsForRegion({
        model: this.group
      })
    );
    return this.headerView;
  },

  initialize: function(options) {
    this.group = options.group;
  }
});

module.exports = OrgDirectoryLayout;
