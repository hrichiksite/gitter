'use strict';

var Marionette = require('backbone.marionette');
var log = require('../../utils/log');
var context = require('gitter-web-client-context');
var appEvents = require('../../utils/appevents');
var ModalView = require('./modal');
var apiClient = require('../../components/api-client');
var DelayLock = require('../../models/delay-lock-model');
var template = require('./tmpl/delete-account-view.hbs');

var View = Marionette.ItemView.extend({
  tagName: 'p',
  attributes: { style: '' },
  ui: {
    ghostUserCheckbox: '.js-delete-account-ghost-user-checkbox'
  },
  events: {
    'input @ui.ghostUserCheckbox': 'onGhostCheckboxChanged'
  },
  modelEvents: {
    change: 'render'
  },
  initialize: function() {
    this.model.set('ghostUsername', `ghost~${context.getUserId()}`);
  },
  template: template,
  onGhostCheckboxChanged: function() {
    this.model.set('ghost', this.ui.ghostUserCheckbox.is(':checked'));
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = 'Careful Now...';
    var username = context.user().get('username');
    options.menuItems = [
      {
        disabled: true,
        action: 'delete',
        text: `Delete ${username}`,
        className: 'modal--default__footer__btn--negative'
      }
    ];

    this.lockModel = new DelayLock();

    this.listenTo(this.lockModel, 'change:locked', function() {
      this.setButtonState('delete', true);
    });

    ModalView.prototype.initialize.call(this, options);
    this.view = new View({
      model: this.lockModel
    });

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },
  menuItemClicked: function(button) {
    switch (button) {
      case 'delete':
        // Notify others, that they shouldn't redirect while we are trying to logout
        appEvents.trigger('account.delete-start');

        // Disable the button so they can't click it again
        this.setButtonState('delete', false);

        this.lockModel.set('deletionRequestLoading', true);
        this.lockModel.set('deletionRequestSucceeded', false);
        this.lockModel.set('deletionRequestError', undefined);

        apiClient.user
          .delete('/', {
            ghost: this.lockModel.get('ghost') || false
          })
          .then(() => {
            this.lockModel.set('deletionRequestSucceeded', true);
            // Redirect back to the homepage
            window.location.href = '/';
          })
          .catch(err => {
            log.error('Error while deleting account', { exception: err });

            if (err.statusText === 'timeout') {
              this.lockModel.set(
                'deletionRequestError',
                `The request timed out but your account is probably still in the process of being deleted on our end (especially if you joined a lot of rooms). Please wait a couple hours before trying again : ${err} (status: ${err.status})`
              );
            } else {
              this.lockModel.set(
                'deletionRequestError',
                `Error while deleting account: ${err} (status: ${err.status})`
              );
            }

            // We only trigger a stop on error as they could decide to not delete
            // their account after they see an error and continue using the app
            //
            // Otherwise, the delete flow redirect should continue
            appEvents.trigger('account.delete-stop');
          })
          .then(() => {
            this.lockModel.set('deletionRequestLoading', false);
          });
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  }
});

module.exports = Modal;
