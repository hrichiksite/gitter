'use strict';
var Marionette = require('backbone.marionette');
var ModalView = require('../modals/modal');
var Backbone = require('backbone');
var clientEnv = require('gitter-client-env');
var avatars = require('gitter-web-avatars');
var context = require('gitter-web-client-context');
var apiClient = require('../../components/api-client');
var Typeahead = require('../controls/typeahead');
var userSearchModels = require('../../collections/user-search');
var template = require('./tmpl/addPeople.hbs');
var userSearchItemTemplate = require('./tmpl/userSearchItem.hbs');
var itemTemplate = require('./tmpl/addPeopleItemView.hbs');
require('../behaviors/widgets');

var DEFAULT_AVATAR_UNTIL_AVATARS_SERVICE_ARRIVES = avatars.getDefault();
/**
 *  Ridiculously sloppy regexp based email validator, let the server
 *  do the real validation
 */
function isEmailAddress(string) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(string);
}

var RowView = Marionette.ItemView.extend({
  events: {
    'submit form': 'invite'
  },
  modelEvents: {
    change: 'render'
  },
  behaviors: {
    Widgets: {}
  },
  ui: {
    email: 'input[type=email]'
  },
  tagName: 'div',
  className: 'gtrPeopleRosterItem',
  template: itemTemplate,
  invite: function(e) {
    e.preventDefault();
    var model = this.model;
    var email = this.ui.email.val().trim();

    var self = this;

    apiClient.room
      .post('/invites', { githubUsername: this.model.get('username'), email: email })
      .then(function() {
        model.set({
          email: email,
          unreachable: false,
          invited: true,
          added: false
        });
      })
      .catch(function(e) {
        var message = e.friendlyMessage || 'Unable to invite user to Gitter';
        self.trigger('invite:error', message);
      });
  }
});

var View = Marionette.CompositeView.extend({
  childViewContainer: '.gtrPeopleAddRoster',
  childView: RowView,
  template: template,
  ui: {
    input: '.gtrInput',
    share: '.js-add-people-share',
    loading: '.js-add-roster-loading',
    validation: '#modal-failure',
    success: '#modal-success'
  },

  initialize: function() {
    if (!this.collection) {
      var ResultsCollection = Backbone.Collection.extend({
        comparator: function(a, b) {
          return b.get('timeAdded') - a.get('timeAdded');
        }
      });

      this.collection = new ResultsCollection();
    }

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  onChildviewInviteError: function(childView, message) {
    // jshint unused:true
    this.ui.loading.toggleClass('hide', true);
    this.showValidationMessage(message);
  },

  selected: function(m) {
    this.addUserToRoom(m);
    this.typeahead.dropdown.hide();
  },

  menuItemClicked: function(button) {
    switch (button) {
      case 'share':
        this.dialog.hide();
        window.location.hash = '#share';
        break;

      case 'done':
        this.dialog.hide();
        break;
    }
  },

  /**
   * showMessage() slides the given element down then up
   *
   * el   DOM Element - element to be animated
   */
  showMessage: function(el) {
    el.slideDown('fast');
    setTimeout(function() {
      el.slideUp('fast');
      return;
    }, 10000);
  },

  showValidationMessage: function(message) {
    this.ui.validation.text(message);
    this.showMessage(this.ui.validation);
  },

  showSuccessMessage: function(message) {
    this.ui.success.text(message);
    this.showMessage(this.ui.success);
  },

  handleError: function(/*res, status, message */) {
    // TODO: what should go here?
  },

  /**
   * addUserToRoom() sends request and handles response of adding an user to a room
   *
   * m    BackboneModel - the user to be added to the room
   */
  addUserToRoom: function(model) {
    var self = this;

    self.ui.loading.toggleClass('hide');
    var username = model.get('username');
    var email = model.get('email');
    var body;
    if (username) {
      body = { githubUsername: username };
    } else if (email) {
      body = { email: email.trim() };
    }

    return apiClient.room
      .post('/invites', body)
      .then(function(invite) {
        self.ui.loading.toggleClass('hide');
        model.set({
          added: invite.status === 'added',
          invited: invite.status === 'invited',
          unreachable: false,
          timeAdded: Date.now(),
          email: invite.email,
          user: invite.user,
          username: (invite.user && invite.user.username) || username
        });

        self.collection.add(model);
        self.typeahead.clear();
      })
      .catch(function(e) {
        self.ui.loading.toggleClass('hide');
        var message = e.friendlyMessage || 'Error';

        // XXX: why not use the payment required status code for this?
        if (message.match(/has reached its limit/)) {
          self.dialog.showPremium();
        }

        self.typeahead.clear();
        switch (e.status) {
          case 501:
            message = `Inviting a user by email is limited to ${
              clientEnv['inviteEmailAbuseThresholdPerDay']
            } per day, see #2153`;
            break;
          case 409:
            message = model.get('username') + ' has already been invited';
            break;
          case 428:
            model.set({
              added: false,
              invited: false,
              unreachable: true,
              timeAdded: Date.now(),
              email: null,
              user: null
            });
            self.collection.add(model);
            return;
        }

        self.showValidationMessage(message);
      });
  },

  onRender: function() {
    var self = this;

    setTimeout(function() {
      self.ui.input.focus();
    }, 10);

    this.typeahead = new Typeahead({
      collection: new userSearchModels.Collection(),
      itemTemplate: userSearchItemTemplate,
      el: this.ui.input[0],
      autoSelector: function(input) {
        return function(m) {
          var displayName = m.get('displayName');
          var username = m.get('username');

          return (
            (displayName && displayName.indexOf(input) >= 0) ||
            (username && username.indexOf(input) >= 0)
          );
        };
      },
      fetch: function(input, collection, fetchSuccess) {
        if (input.indexOf('@') >= 0) {
          if (isEmailAddress(input)) {
            this.collection.reset([
              {
                displayName: input,
                email: input,
                avatarUrlSmall: DEFAULT_AVATAR_UNTIL_AVATARS_SERVICE_ARRIVES,
                avatarUrlMedium: DEFAULT_AVATAR_UNTIL_AVATARS_SERVICE_ARRIVES
              }
            ]);
          } else {
            this.collection.reset([]);
          }

          return fetchSuccess();
        }

        this.collection.fetch(
          { data: { q: input } },
          { add: true, remove: true, merge: true, success: fetchSuccess }
        );
      }
    });

    this.listenTo(this.typeahead, 'selected', this.selected);
  },

  onDestroy: function() {
    if (this.typeahead) {
      this.typeahead.destroy();
    }
  }
});

var modalButtons = [];

if (context.troupe().get('security') !== 'PRIVATE') {
  modalButtons.push({
    action: 'share',
    pull: 'right',
    text: 'Share this room',
    className: 'modal--default__footer__link'
  });
}

module.exports = ModalView.extend({
  disableAutoFocus: true,
  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Add people to this room';

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: modalButtons
});
