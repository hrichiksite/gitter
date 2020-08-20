'use strict';

var _ = require('lodash');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var cocktail = require('backbone.cocktail');
var autolink = require('autolink'); // eslint-disable-line node/no-missing-require
var clientEnv = require('gitter-client-env');
var context = require('gitter-web-client-context');
const log = require('../../utils/log');
const { getBackendForRoom } = require('gitter-web-shared/backend-utils');
var toggleClass = require('../../utils/toggle-class');
var MenuBuilder = require('../../utils/menu-builder');
var appEvents = require('../../utils/appevents');
var apiClient = require('../../components/api-client');
var userNotifications = require('../../components/user-notifications');
var Dropdown = require('../controls/dropdown');
var KeyboardEventMixin = require('../keyboard-events-mixin');
var headerViewTemplate = require('./tmpl/headerViewTemplate.hbs');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');
var ProfileMenu = require('../profile-menu/profile-menu-view');

require('../behaviors/tooltip');
require('transloadit');

var TRANSLOADIT_DEFAULT_OPTIONS = {
  wait: true,
  modal: false,
  autoSubmit: false,
  debug: false
};

var HeaderView = Marionette.ItemView.extend({
  template: headerViewTemplate,

  modelEvents: {
    change: 'renderIfRequired'
  },

  ui: {
    leftMenuToggle: '.js-header-view-left-menu-toggle',
    avatarImage: '.js-chat-header-avatar-image',
    groupAvatarUploadForm: '.js-chat-header-group-avatar-upload-form',
    groupAvatarFileInput: '.js-chat-header-group-avatar-upload-input',
    groupAvatarSignatureInput: '.js-chat-header-group-avatar-upload-signature',
    groupAvatarParamsInput: '.js-chat-header-group-avatar-upload-params',
    groupAvatarProgress: '.js-chat-header-group-avatar-upload-progress',
    cog: '.js-chat-settings',
    dropdownMenu: '#cog-dropdown',
    topic: '.js-room-topic',
    topicWrapper: '.js-room-topic-wrapper',
    topicActivator: '.js-room-topic-edit-activator',
    name: '.js-chat-name',
    favourite: '.js-favourite-button',
    orgrooms: '.js-chat-header-org-page-action'
  },

  events: {
    'click @ui.leftMenuToggle': 'onLeftMenuToggleClick',
    'change @ui.groupAvatarFileInput': 'onGroupAvatarUploadChange',
    'click @ui.cog': 'showDropdown',
    'click @ui.favourite': 'toggleFavourite',
    'dblclick @ui.topicActivator': 'showInput',
    'keydown textarea': 'detectKeys'
  },

  keyboardEvents: {
    'room-topic.edit': 'showInput'
  },

  behaviors: {
    Tooltip: {
      '.js-chat-header-group-avatar-upload-label': { placement: 'right' },
      '.js-chat-name': { titleFn: 'getChatNameTitle', placement: 'right' },
      '.js-chat-header-org-page-action': { placement: 'left' },
      '.js-favourite-button': { placement: 'left' },
      '.js-chat-settings': { placement: 'left' }
    }
  },

  initialize: function(options) {
    this.rightToolbarModel = options.rightToolbarModel;
    this.menuItemsCollection = new Backbone.Collection([]);
    this.buildDropdown();
  },

  serializeData: function() {
    var data = this.model.toJSON();

    var isStaff = context.isStaff();
    var isAdmin = context.isTroupeAdmin();
    var canChangeGroupAvatar = data.groupId && (isStaff || isAdmin);
    _.extend(data, {
      headerView: getHeaderViewOptions(data),
      user: !!context.isLoggedIn(),
      archives: this.options.archives,
      shouldShowPlaceholderRoomTopic: data.userCount <= 1,
      canChangeGroupAvatar: canChangeGroupAvatar
    });

    return data;
  },

  buildDropdown: function() {
    if (context.isLoggedIn()) {
      this.dropdown = new Dropdown({
        // `allowClickPropagation` is true because some of the dropdown items are
        // handled by the global public/js/components/link-handler.js
        // If you don't want an item handled by the `link-handler` then
        // add `data-disable-routing` (`dataset: { disableRouting: 1 }`) to the item
        allowClickPropagation: true,
        collection: this.menuItemsCollection,
        placement: 'right'

        // Do not set the target element for now as it's re-rendered on room
        // change. We'll set it dynamically before showing the dropdown
      });

      // Other dropdown items may be handled by the global link-handler navigation
      this.listenTo(this.dropdown, 'selected', function(e) {
        var href = e.get('href');
        if (href === '#leave') {
          this.leaveRoom();
        } else if (href === '#hide') {
          this.hideRoom();
        } else if (href === '#notifications') {
          this.requestBrowserNotificationsPermission();
        } else if (href === '#favourite') {
          this.toggleFavourite();
        }
      });
    }
  },

  getChatNameTitle: function() {
    var model = this.model;
    if (model.get('public')) {
      return 'Anyone can join';
    }

    if (model.get('oneToOne')) {
      return 'This chat is just between you two';
    }

    var backend = model.get('backend');

    switch (backend && backend.type) {
      case 'GH_REPO':
        return 'All repo collaborators can join';

      case 'GH_ORG':
        return 'All org members can join';

      case 'GL_GROUP':
        return `All GitLab ${backend.linkPath} group members can join`;

      case 'GL_PROJECT':
        return `All GitLab ${backend.linkPath} project members can join`;

      default:
        return 'Only invited users can join';
    }
  },

  onRender: function() {
    if (this.dropdown) {
      // Deal with re-renders
      this.dropdown.hide();
    }

    this.setupProfileMenu();

    var topicEl = this.ui.topic[0];
    if (topicEl) {
      autolink(topicEl);
    }
  },

  showDropdown: function() {
    this.dropdown.setTargetElement(this.ui.cog[0]);
    this.menuItemsCollection.reset(this.createMenu());
    this.dropdown.show();
  },

  setupProfileMenu: function() {
    if (context.isLoggedIn()) {
      //If an instance of the profile menu exists destroy it to remove listeners etc
      if (this.profileMenu) {
        this.profileMenu.destroy();
      }
      //Make a new profile menu
      const profileMenuElement = document.querySelector('#profile-menu');
      if (profileMenuElement) {
        this.profileMenu = new ProfileMenu({ el: profileMenuElement });
        //Render it
        this.profileMenu.render();
      }
    }
  },

  // eslint-disable-next-line max-statements
  createMenu: function() {
    var c = context();
    var isStaff = context.isStaff();
    var isAdmin = context.isTroupeAdmin();
    var isRoomMember = context.isRoomMember();
    var isOneToOne = this.model.get('oneToOne');
    var url = this.model.get('url');
    var staffOrAdmin = isStaff || isAdmin;

    var menuBuilder = new MenuBuilder();

    menuBuilder.addConditional(!isOneToOne, { title: 'Add people to this room', href: '#add' });
    menuBuilder.addConditional(!isOneToOne, { title: 'Share this chat room', href: '#share' });
    menuBuilder.addDivider();
    menuBuilder.addConditional(isRoomMember, {
      title: `${this.model.get('favourite') ? 'Unfavourite' : 'Favourite'} room`,
      href: '#favourite'
    });
    menuBuilder.addConditional(isRoomMember, { title: 'Notifications', href: '#notifications' });

    if (!isOneToOne) {
      var settingMenuItem = c.isNativeDesktopApp
        ? {
            title: 'Integrations',
            href: clientEnv['basePath'] + url + '#integrations',
            target: '_blank',
            dataset: { disableRouting: 1 }
          }
        : { title: 'Integrations', href: '#integrations' };

      menuBuilder.addConditional(isAdmin, settingMenuItem);

      menuBuilder.addConditional(staffOrAdmin, { title: 'Tags', href: '#tags' });
      menuBuilder.addConditional(staffOrAdmin, { title: 'Settings', href: '#settings' });
      menuBuilder.addConditional(staffOrAdmin, { title: 'Permissions', href: '#permissions' });
      menuBuilder.addDivider();

      menuBuilder.add({ title: 'Archives', href: url + '/archives/all', target: '_blank' });

      const backend = getBackendForRoom(this.model);
      const type = backend && backend.type;
      const linkPath = backend && backend.linkPath;

      const isGitHubObject = type === 'GH_REPO' || type === 'GH_ORG';
      menuBuilder.addConditional(isGitHubObject, {
        title: 'Open in GitHub',
        href: `https://www.github.com/${linkPath}`,
        target: '_blank'
      });
      const isGitlabObject = type === 'GL_GROUP';
      menuBuilder.addConditional(isGitlabObject, {
        title: 'Open in GitLab',
        href: `https://gitlab.com/${linkPath}`,
        target: '_blank'
      });

      const group = this.model.get('group');
      if (group) {
        const homeUri = group.homeUri;
        menuBuilder.add({
          title: 'Community home',
          href: `/${homeUri}`
        });
      }

      menuBuilder.addDivider();

      menuBuilder.addConditional(isAdmin, { title: 'Delete this room', href: '#delete' });
      menuBuilder.addConditional(isRoomMember, { title: 'Leave this room', href: '#leave' });
    }

    menuBuilder.addConditional(isRoomMember, { title: 'Hide this room', href: '#hide' });

    return menuBuilder.getItems();
  },

  leaveRoom: function() {
    if (!context.isLoggedIn()) return;

    apiClient.room.delete('/users/' + context.getUserId(), {}).then(function() {
      appEvents.trigger('navigation', '/home', 'home', ''); // TODO: figure out a title
      //context.troupe().set('roomMember', false);
    });
  },

  hideRoom: function() {
    // Hide the room in the UI immediately
    this.model.set('lastAccessTime', null);

    apiClient.user.delete(`/rooms/${this.model.id}`).catch(err => {
      log.error('Error hiding room', { exception: err });
      appEvents.triggerParent('user_notification', {
        title: 'Error hiding room',
        text: `Check the devtools console for more details: ${err.message}`
      });
    });
  },

  toggleFavourite: function() {
    if (!context.isLoggedIn()) return;

    this.model.set('favourite', !this.model.get('favourite'));
    var isFavourite = !!this.model.get('favourite');

    apiClient.userRoom.put('', { favourite: isFavourite });
  },

  saveTopic: function() {
    var topic = this.$el.find('textarea').val();
    context.troupe().set('topic', topic);

    apiClient.room.put('', { topic: topic });

    this.editingTopic = false;
  },

  cancelEditTopic: function() {
    this.editingTopic = false;
    this.render();
  },

  detectKeys: function(e) {
    this.detectReturn(e);
    this.detectEscape(e);
  },

  detectReturn: function(e) {
    if (e.keyCode === 13 && (!e.ctrlKey && !e.shiftKey)) {
      // found submit
      e.stopPropagation();
      e.preventDefault();
      this.saveTopic();
    }
  },

  detectEscape: function(e) {
    if (e.keyCode === 27) {
      // found escape, cancel edit
      this.cancelEditTopic();
    }
  },

  showInput: function() {
    if (!context.isTroupeAdmin()) return;
    if (this.editingTopic === true) return;
    this.editingTopic = true;

    var unsafeText = this.model.get('topic');

    this.oldTopic = unsafeText;

    toggleClass(this.ui.topicActivator[0], 'is-editing', true);
    toggleClass(this.ui.topicWrapper[0], 'is-editing', true);
    toggleClass(this.ui.topic[0], 'is-editing', true);
    // create inputview
    this.ui.topic.html('<textarea class="topic-input"></textarea>');

    var textarea = this.ui.topic.find('textarea').val(unsafeText);

    setTimeout(function() {
      textarea.select();
    }, 10);
  },

  requestBrowserNotificationsPermission: function() {
    userNotifications.requestAccess();
  },

  // Is HeaderView rendered as a part of archive view?
  isArchive: () => !!context().archive,

  // Look at the attributes that have changed
  // and decide whether to re-render
  renderIfRequired: function() {
    var model = this.model;

    function changedContains(changedAttributes) {
      var changed = model.changed;
      if (!changed) return;
      for (var i = 0; i < changedAttributes.length; i++) {
        if (changed.hasOwnProperty(changedAttributes[i])) return true;
      }
    }

    if (
      changedContains([
        'uri',
        'name',
        'id',
        'favourite',
        'topic',
        'avatarUrl',
        'group',
        'roomMember',
        'backend',
        'public'
      ])
    ) {
      // The template may have been set to false
      // by the Isomorphic layout
      this.options.template = headerViewTemplate;
      this.render();

      // If it is a new chat header, we can edit the topic again
      this.editingTopic = false;
    }
  },

  onLeftMenuToggleClick() {
    appEvents.trigger('dispatchVueAction', 'toggleLeftMenu', true);
  },

  onGroupAvatarUploadChange: function() {
    this.uploadGroupAvatar();
  },

  updateProgressBar: function(spec) {
    var bar = this.ui.groupAvatarProgress;
    var value = spec.value && spec.value * 100 + '%';
    bar.css('width', value);
  },

  resetProgressBar: function() {
    this.ui.groupAvatarProgress.addClass('hidden');
    this.updateProgressBar({
      value: 0
    });
  },

  handleUploadStart: function() {
    this.ui.groupAvatarProgress.removeClass('hidden');
    this.updateProgressBar({
      // Just show some progress
      value: 0.2
    });
  },

  handleUploadProgress: function(done, expected) {
    this.updateProgressBar({
      value: done / expected
    });
  },

  handleUploadSuccess: function(/*res*/) {
    this.resetProgressBar();
    appEvents.triggerParent('user_notification', {
      title: 'Avatar upload complete',
      text: 'Wait a few moments for your new avatar to appear...'
    });

    // TODO: Make this work not on refresh
    // See snippet below
    setTimeout(
      function() {
        appEvents.triggerParent('navigation', null, null, null, {
          refresh: true
        });
      }.bind(this),
      1000
    );
    /* * /
    var urlParse = require('url-parse');
    var urlJoin = require('url-join');
    var avatars = require('gitter-web-avatars');
    setTimeout(function() {
      var currentRoom = context.troupe();
      var currentGroup = this.groupsCollection.get(currentRoom.get('groupId'));

      // Assemble the new URL
      // We cache bust the long-running one so we can show the updated avatar
      // When the user refreshes, they will go back to using the version avatar URL
      var unversionedAvatarUrl = avatars.getForGroupId(currentGroup.get('id'));
      var parsedAvatarUrl = urlParse(unversionedAvatarUrl, true);
      parsedAvatarUrl.query.cacheBuster = Math.ceil(Math.random() * 9999);
      var newAvatarUrl = parsedAvatarUrl.toString();

      currentGroup.set('avatarUrl', newAvatarUrl);
      currentRoom.set('avatarUrl', newAvatarUrl);
      // TODO: This does not work because it is empty and is not shared with parent frame
      if(this.roomCollection) {
        console.log(this.roomCollection.where({ groupId: currentGroup.get('id') }));
      }
    }.bind(this), 5000);
    /* */
  },

  handleUploadError: function(err) {
    appEvents.triggerParent('user_notification', {
      title: 'Error Uploading File',
      text: err.message
    });
    this.resetProgressBar();
  },

  uploadGroupAvatar: function() {
    var currentRoom = context.troupe();
    if (!currentRoom) {
      return;
    }

    // For groups that were created within page lifetime
    var groupId = currentRoom.get('groupId');

    this.handleUploadStart();

    apiClient.priv
      .get('/generate-signature', {
        type: 'avatar',
        group_id: groupId
      })
      .then(
        function(res) {
          this.ui.groupAvatarParamsInput[0].setAttribute('value', res.params);
          this.ui.groupAvatarSignatureInput[0].setAttribute('value', res.sig);

          var formData = new FormData(this.ui.groupAvatarUploadForm[0]);

          this.ui.groupAvatarUploadForm.unbind('submit.transloadit');
          this.ui.groupAvatarUploadForm.transloadit(
            _.extend(TRANSLOADIT_DEFAULT_OPTIONS, {
              formData: formData,
              onStart: this.handleUploadStart.bind(this),
              onProgress: this.handleUploadProgress.bind(this),
              onSuccess: this.handleUploadSuccess.bind(this),
              onError: this.handleUploadError.bind(this)
            })
          );

          this.ui.groupAvatarUploadForm.trigger('submit.transloadit');
        }.bind(this)
      );
  }
});

cocktail.mixin(HeaderView, KeyboardEventMixin);
module.exports = HeaderView;
