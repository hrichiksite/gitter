'use strict';
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('gitter-web-client-context');
var isMobile = require('../../utils/is-mobile');
var template = require('./tmpl/avatar.hbs');
var UserPopoverView = require('../people/userPopoverView');
var widgets = require('../behaviors/widgets');
var resolveUserAvatarSrcSet = require('gitter-web-shared/avatars/resolve-user-avatar-srcset');
var FastAttachMixin = require('../fast-attach-mixin');
var avatars = require('gitter-web-avatars');

require('../behaviors/tooltip');

var AVATAR_SIZE_MEDIUM = 64;
var AVATAR_SIZE_SMALL = 30;
var FALLBACK_IMAGE_URL = avatars.getDefault();

module.exports = (function() {
  var AvatarWidget = Marionette.ItemView.extend({
    tagName: 'div',
    className: 'avatar',
    template: template,
    events: {
      mouseover: 'showDetailIntent',
      click: 'showDetail',
      'error img': 'onImageError'
    },
    ui: {
      tooltip: ':first-child',
      wrapper: '.trpDisplayPicture',
      image: 'img'
    },
    modelEvents: {
      change: 'update'
    },
    behaviors: function() {
      var options = this.options;

      if (options.showTooltip !== false) {
        return {
          Tooltip: {
            ':first-child': {
              titleFn: 'getTooltip',
              placement: options.tooltipPlacement || 'vertical'
            }
          }
        };
      }
    },
    initialize: function(options) {
      if (options.user) {
        this.model = new Backbone.Model(options.user);
      }
      // // TODO: is it necessary to listen for updates to the invite status?
      //
      // this.user = options.user ? options.user : {};
      // this.showEmail = options.showEmail || {};
      // this.showStatus = options.showStatus;
      // this.avatarSize = options.size ? options.size : 's';
    },

    onRender: function() {
      var img = this.ui.image[0];
      if (!img) return;
      img.onerror = this.onImageError.bind(this);
    },

    onDestroy: function() {
      var img = this.ui.image[0];
      if (!img) return;
      img.onerror = null;
    },

    showDetailIntent: function(e) {
      UserPopoverView.hoverTimeout(
        e,
        function() {
          this.showDetail(e);
        },
        this
      );
    },

    showDetail: function(e) {
      if (isMobile()) return;

      e.preventDefault();

      if (this.popover) return;

      this.ui.tooltip.tooltip('hide');

      var model = this.model;
      var popover = new UserPopoverView({
        model: model,
        targetElement: e.target
      });

      popover.show();
      UserPopoverView.singleton(this, popover);
    },

    update: function() {
      var data = this.serializeData();
      this.updatePresence(data);
      this.updateAvatar(data);
    },

    updatePresence: function(data) {
      if (this.options.showStatus) {
        var wrapper = this.ui.wrapper;
        wrapper.toggleClass('online', data.online);
        wrapper.toggleClass('offline', !data.online);
      }
    },

    updateAvatar: function(data) {
      var img = this.ui.image[0];
      var avatarSrcSet = data.avatarSrcSet;
      img.src = avatarSrcSet.src;
      img.srcset = avatarSrcSet.srcset;
    },

    getUserId: function() {
      return this.model.id;
    },

    serializeData: function() {
      var options = this.options || {};
      var user = this.model && this.model.toJSON();
      return serializeData(user, options);
    },

    getTooltip: function() {
      return this.model.get('displayName');
    },

    onImageError: function(e) {
      var img = e.currentTarget;
      if (img.src === FALLBACK_IMAGE_URL) {
        return;
      }

      img.src = FALLBACK_IMAGE_URL;
    },

    attachElContent: FastAttachMixin.attachElContent
  });

  function serializeData(user, options) {
    // This is overly complicated....
    // TODO: simplify the pre-rendering process
    if (!user) {
      if (options.model) {
        user = options.model.toJSON();
      } else {
        user = options.user || {};
      }
    }

    var avatarSize = options.avatarSize || 's';
    var imgSize = avatarSize === 'm' ? AVATAR_SIZE_MEDIUM : AVATAR_SIZE_SMALL;

    var currentUserId = context.getUserId();
    var avatarSrcSet = resolveUserAvatarSrcSet(user, imgSize);

    var online = user.id === currentUserId || !!user.online; // only the people view tries to show avatar status so there is a model object, it won't necessarily work in other cases

    var presenceClass;
    if (options.showStatus) {
      presenceClass = online ? 'online' : 'offline';
    } else {
      presenceClass = '';
    }

    return {
      id: user.id,
      showStatus: options.showStatus,
      userDisplayName: user.displayName,
      alt: options.screenReadUsername ? user.username : '',
      avatarSrcSet: avatarSrcSet,
      avatarSize: avatarSize || 's',
      imgSize: imgSize,
      presenceClass: presenceClass,
      online: online,
      offline: !online,
      role: user.role,
      removed: user.removed,
      inactive: user.removed
    };
  }

  AvatarWidget.getPrerendered = function(model, id) {
    return (
      "<span class='widget' data-widget-id='" +
      id +
      "'>" +
      template(serializeData(null, model)) +
      '</span>'
    );
  };

  widgets.register({ avatar: AvatarWidget });
  return AvatarWidget;
})();
