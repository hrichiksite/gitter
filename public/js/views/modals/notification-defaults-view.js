'use strict';

var Marionette = require('backbone.marionette');
var _ = require('lodash');
var apiClient = require('../../components/api-client');
var ModalView = require('./modal');
var template = require('./tmpl/notification-defaults.hbs');
var FeaturesView = require('./notification-features-collection-view');

var View = Marionette.LayoutView.extend({
  template: template,
  events: {
    'click #close-settings': 'destroySettings',
    'change @ui.options': 'formChange',
    'change @ui.override': 'formChange',
    'change @ui.sendEmailsCheckbox': 'formChange'
  },
  modelEvents: {
    change: 'update'
  },
  ui: {
    options: '#notification-options',
    override: '#override-all',
    notifyFeatures: '#notify-features',
    noticeNoOverride: '#notice-no-override',
    sendEmailsCheckbox: '#send-emails-checkbox'
  },
  regions: {
    notifyFeatures: '#notify-features'
  },

  initialize: function() {
    // TODO: this should go to the userRoom endpoint as a get
    // or better yet should be a live field on the room
    apiClient.user
      .get('/settings/defaultRoomMode,unread_notifications_optout')
      .bind(this)
      .then(function(response) {
        var defaultRoomMode = response.defaultRoomMode || {};
        // Use a single, flat model for the view
        defaultRoomMode.unread_notifications_optout = !!response.unread_notifications_optout;
        this.model.set(defaultRoomMode);
      });

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  update: function() {
    var selectInput = this.ui.options;
    selectInput.val(this.model.get('mode'));

    var count = 0;
    if (this.featuresView) {
      count = this.featuresView.resetFromHash(this.model.attributes);
    } else {
      count = 0;
    }

    if (count > 0) {
      this.ui.notifyFeatures.show();
    } else {
      this.ui.notifyFeatures.hide();
    }

    var sendEmails = !this.model.get('unread_notifications_optout');
    this.ui.sendEmailsCheckbox.prop('checked', sendEmails);
  },

  onRender: function() {
    this.featuresView = new FeaturesView({});
    this.getRegion('notifyFeatures').show(this.featuresView);
    this.update();
  },

  formChange: function(e) {
    if (e) e.preventDefault();
    var mode = this.ui.options.val();
    var override = !!this.ui.override.is(':checked');
    var emailOptOut = !this.ui.sendEmailsCheckbox.is(':checked');

    this.featuresView.resetFromMode(mode);

    var noChange =
      mode === this.model.get('mode') &&
      !override &&
      emailOptOut === this.model.get('unread_notifications_optout');

    this.dialog.toggleButtonClass('apply', 'modal--default__footer__btn--neutral', noChange);
    this.dialog.toggleButtonClass('apply', 'modal--default__footer__btn', !noChange);

    if (override) {
      this.ui.noticeNoOverride.hide('fast');
    } else {
      this.ui.noticeNoOverride.show('fast');
    }
  },

  destroySettings: function() {
    this.dialog.hide();
    this.dialog = null;
  },

  menuItemClicked: function(button) {
    switch (button) {
      case 'room-settings':
        window.location.href = '#notifications';
        break;
      case 'apply':
        this.applyChangeAndClose();
        break;
    }
  },

  applyChangeAndClose: function() {
    var mode = this.ui.options.val();
    var override = !!this.ui.override.is(':checked');
    var emailOptOut = !this.ui.sendEmailsCheckbox.is(':checked');

    apiClient.user
      .post('/settings/', {
        defaultRoomMode: {
          mode: mode,
          override: override
        },
        unread_notifications_optout: emailOptOut
      })
      .bind(this)
      .then(function() {
        this.dialog.hide();
        this.dialog = null;
      });
  }
});

module.exports = ModalView.extend({
  initialize: function(options) {
    options = _.extend(
      {
        title: 'Default Notification Settings',
        menuItems: [
          {
            action: 'room-settings',
            pull: 'left',
            text: 'Room Settings',
            className: 'modal--default__footer__link'
          },
          {
            action: 'apply',
            pull: 'right',
            text: 'Apply',
            className: 'modal--default__footer__btn--neutral'
          }
        ]
      },
      options
    );

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  }
});
