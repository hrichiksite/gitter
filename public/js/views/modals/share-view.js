'use strict';

var $ = require('jquery');
var Marionette = require('backbone.marionette');
var context = require('gitter-web-client-context');
var clientEnv = require('gitter-client-env');
var apiClient = require('../../components/api-client');
var social = require('../../utils/social');
var ModalView = require('./modal');
var cdn = require('gitter-web-cdn');
var template = require('./tmpl/share-view.hbs');
var ZeroClipboard = require('zeroclipboard'); // eslint-disable-line node/no-missing-require
var backendUtils = require('gitter-web-shared/backend-utils');

require('@gitterhq/styleguide/css/components/buttons.css');

ZeroClipboard.config({ swfPath: cdn('repo/zeroclipboard/ZeroClipboard.swf') });

var View = Marionette.ItemView.extend({
  template: template,
  className: 'share-view',

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  events: {
    'click .js-badge': 'sendBadgePullRequest'
  },

  menuItemClicked: function(button) {
    switch (button) {
      case 'add':
        this.dialog.hide();
        window.location.hash = '#add';
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  getShareUrl: function() {
    return (
      clientEnv['basePath'] +
      '/' +
      context.getTroupe().uri +
      '?utm_source=share-link&utm_medium=link&utm_campaign=share-link'
    );
  },

  getBadgeUrl: function() {
    return clientEnv['badgeBaseUrl'] + '/' + context.getTroupe().uri + '.svg';
  },

  getBadgeMD: function() {
    var linkUrl =
      clientEnv['basePath'] +
      '/' +
      context.getTroupe().uri +
      '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge';
    return '[![Gitter](' + this.getBadgeUrl() + ')](' + linkUrl + ')';
  },

  detectFlash: function() {
    if (navigator.plugins && navigator.plugins['Shockwave Flash']) {
      return true;
    }

    if (~navigator.appVersion.indexOf('MSIE') && !~navigator.userAgent.indexOf('Opera')) {
      try {
        new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        return true;
      } catch (e) {
        // Ignore the failure
      }
    }

    return false;
  },

  serializeData: function() {
    var room = context.getTroupe();
    var isAdmin = context.isTroupeAdmin();

    var isRepo = !!backendUtils.getLinkPathCond('GH_REPO', room);

    return {
      isRepo: isRepo,
      isPublic: room.public,
      allowBadgePR: room.public && isAdmin,
      hasFlash: this.detectFlash(),
      // FIXME: This used to be named `url` but we ran into https://github.com/altano/handlebars-loader/issues/75
      stub: this.getShareUrl(),
      badgeUrl: this.getBadgeUrl(),
      badgeMD: this.getBadgeMD(),
      twitterUrl: social.generateTwitterShareUrl(room.uri),
      facebookUrl: social.generateFacebookShareUrl(room.uri),
      linkedinLink: social.generateLinkedinShareUrl(room.uri),
      googlePlusLink: social.generateGooglePlusShareUrl(room.uri)
    };
  },

  onRender: function() {
    // ZeroClipboard instances are left hanging around
    // even after this view is closed.
    // 500pts will be awarded if you can fix this.
    var clipboard = new ZeroClipboard(this.$el.find('.js-copy'));
    clipboard.on('aftercopy', function(e) {
      $(e.target).text('Copied!');
    });
  },

  sendBadgePullRequest: function(e) {
    var btn = e.target;
    var $btn = $(btn);
    $btn.text('Sending...');
    btn.disabled = true;

    apiClient.priv
      .post('/create-badge', { uri: context.troupe().get('uri') }, { global: false })
      .then(function() {
        $btn.text('Pull Request sent!');
      })
      .catch(function() {
        $btn.text('Failed. Try again?');
        btn.disabled = false;
      });
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Share this chat room';

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: [
    { action: 'add', pull: 'right', text: 'Add people', className: 'modal--default__footer__link' }
  ]
});

module.exports = {
  View: View,
  Modal: Modal
};
