'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var context = require('gitter-web-client-context');
var social = require('../../utils/social');
var apiClient = require('../../components/api-client');
var template = require('./tmpl/collaboratorsView.hbs');
var itemTemplate = require('./tmpl/collaboratorsItemView.hbs');
var emptyViewTemplate = require('./tmpl/collaboratorsEmptyView.hbs');
var appEvents = require('../../utils/appevents');
var collaboratorsModels = require('../../collections/collaborators');

require('@gitterhq/styleguide/css/components/buttons.css');
require('@gitterhq/styleguide/css/components/links.css');

module.exports = (function() {
  var ItemView = Marionette.ItemView.extend({
    events: {
      'submit form': 'inviteUser',
      'click .js-add': 'addUser'
    },

    className: 'welcome-modal__collaborator',

    template: itemTemplate,

    initialize: function(options) {
      this.userModel = options.model;
      this.stateModel = new Backbone.Model({
        state: 'initial',
        emailRequiredUserId: null
      });

      this.listenTo(this.userModel, 'change', this.render);
      this.listenTo(this.stateModel, 'change', this.render);
    },

    /**
     * TODO: deal with non-GitHub users too
     */
    inviteGitHubUser: function(data) {
      var self = this;
      var state = 'inviting';

      this.stateModel.set('state', state);

      return apiClient.room
        .post('/invites', data)
        .then(function(invite) {
          if (invite.email) {
            self.userModel.set('email', invite.email);
          }

          if (invite.status === 'added') {
            self.stateModel.set('state', 'added');
          } else if (invite.status === 'invited') {
            self.stateModel.set('state', 'invited');
          }
        })
        .catch(function(e) {
          if (e.status === 409) {
            self.stateModel.set('state', 'fail_409');
          } else if (e.status === 428) {
            self.stateModel.set({
              state: 'email_address_required'
            });
          } else {
            self.stateModel.set('state', 'fail');
          }
        });
    },

    inviteUser: function() {
      var email = this.$el.find('.js-invite-email').val();
      this.userModel.set({ email: email });
      this.inviteGitHubUser(this.userModel.toJSON());

      // stop the page reloading
      return false;
    },

    addUser: function() {
      appEvents.triggerParent('track-event', 'welcome-add-user-click');

      this.inviteGitHubUser(this.userModel.toJSON(), null);

      return false;
    },

    serializeData: function() {
      var state = this.stateModel.get('state');
      var displayName = this.userModel.get('displayName');
      var email = this.userModel.get('email');

      var states = {
        initial: { text: displayName, showAddButton: true },
        adding: { text: 'Adding…' },
        added: { text: displayName + ' added' },
        invited: { text: email ? 'Invited ' + email : 'Invited' },
        fail: { text: 'Unable to add ' + displayName },
        fail_409: { text: 'Already invited' },
        email_address_required: { text: 'Enter ' + displayName + "'s email", showEmailForm: true },
        inviting: { text: 'Inviting…' }
      };

      var data = states[state] || states.initial;
      data.avatarUrl = this.userModel.get('avatarUrl');

      return data;
    }
  });

  var EmptyView = Marionette.ItemView.extend({
    template: emptyViewTemplate,
    className: 'welcome-modal__no-suggestions',
    initialize: function(options) {
      this.model.set('security', options.security);
      this.model.set('githubType', options.githubType);
      this.model.set('url', options.url);
    },

    serializeData: function() {
      var data = this.model.toJSON();
      // FIXME: Just rename it so it doesn't include the `url` module: https://github.com/altano/handlebars-loader/issues/75
      data.stub = data.url;

      if (data.githubType === 'ORG') {
        data.showOrgMessage = true;
      }

      if (data.githubType === 'ORG_CHANNEL') {
        if (data.security === 'INHERITED') {
          data.showOrgMessage = true;
        }
      }

      if (data.security === 'PUBLIC') {
        data.isPublic = true;
      }

      return data;
    }
  });

  var View = Marionette.CompositeView.extend({
    childViewContainer: '.js-container',
    childView: ItemView,
    emptyView: EmptyView,

    childViewOptions: function() {
      if (!this.collection.length) {
        return {
          githubType: context.troupe().get('githubType'),
          security: context.troupe().get('security'),
          url: context.troupe().get('url')
        };
      }
    },

    template: template,

    constructor: function() {
      //instantiate our collection
      this.collection = new collaboratorsModels.CollabCollection();

      //if we should fetch data we should
      if (this.shouldFetch()) {
        //If we render initially we will get a flash of the empty view
        //to avoid that we set hasGotData to signify that we have not yet received any data
        this.collection.fetch();
        this.hasGotSomeData = false;
      }

      //if we don't need to get some data we should reset the catch
      else this.hasGotSomeData = true;
      this.listenTo(
        this.collection,
        'sync',
        function() {
          //once we get some data we set it to true so we can
          //once again render
          this.hasGotSomeData = true;

          //and call a manual render
          this.render();
        },
        this
      );

      //call super()
      Marionette.CompositeView.prototype.constructor.apply(this, arguments);
    },

    initialize: function() {
      //listen to room permission changes so we can refresh the collection
      this.listenTo(context.troupe(), 'change:id', this.onRoomChange, this);
    },

    events: {
      'click .js-close': 'dismiss',
      'click #add-button': 'clickAddButton',
      'click #share-button': 'clickShareButton'
    },

    //when a room changes refresh the collection
    onRoomChange: function() {
      //hide the view so we don't see collaborators from previous rooms
      this.$el.hide();
      appEvents.trigger('collaboratorsView:hide');

      //fetch if we need to
      if (this.shouldFetch()) return this.collection.fetch();

      //render if we do not
      this.render();
    },

    serializeData: function() {
      var uri = context.troupe().get('uri');
      return {
        isPublic: context.troupe().get('security') === 'PUBLIC',
        twitterLink: social.generateTwitterShareUrl(uri),
        facebookLink: social.generateFacebookShareUrl(uri)
      };
    },

    clickAddButton: function() {
      appEvents.triggerParent('track-event', 'welcome-search-clicked');
      window.location.href = '#add';
    },

    clickShareButton: function() {
      window.location.href = '#share';
    },

    dismiss: function() {
      this.remove();
    },

    //Check if we should fetch data
    shouldFetch: function() {
      var roomModel = context.troupe();
      var roomType = roomModel.get('githubType');
      var userCount = roomModel.get('userCount');

      //don't fetch for one-to-one rooms
      if (roomType === 'ONETOONE') return false;

      //don't fetch if the user is not an admin
      if (!context.isTroupeAdmin()) return false;

      //don't run if we have more than one user
      if (userCount > 1) return false;

      //if all else fails fetch some data
      return true;
    },

    //Check if we should render content
    shouldRender: function() {
      //if we should fetch data && have have previously
      //in the app life cycle had some data
      if (this.shouldFetch() && this.hasGotSomeData) return true;
    },

    render: function() {
      if (this.shouldRender()) {
        Marionette.CompositeView.prototype.render.apply(this, arguments);
        this.$el.show();
        appEvents.trigger('collaboratorsView:show');
      } else {
        this.$el.hide();
        appEvents.trigger('collaboratorsView:hide');
        return this;
      }

      return this;
    }
  });

  return View;
})();
