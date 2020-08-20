'use strict';

var _ = require('lodash');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var $ = require('jquery');
var fuzzysearch = require('fuzzysearch');
var urlJoin = require('url-join');
var avatars = require('gitter-web-avatars');
var toggleClass = require('../../utils/toggle-class');
var apiClient = require('../../components/api-client');
const isGitlabSecurityDescriptorType = require('gitter-web-shared/is-gitlab-security-descriptor-type');

var ModalView = require('./modal');
var Typeahead = require('../controls/typeahead');
var userSearchModels = require('../../collections/user-search');
var userSearchItemTemplate = require('../app/tmpl/userSearchItem.hbs');
var PermissionsPeopleListView = require('./permissions/permissions-people-list-view');
var requestingSecurityDescriptorStatusConstants = require('./permissions/requesting-security-descriptor-status-constants');
var submitSecurityDescriptorStatusConstants = require('./permissions/requesting-security-descriptor-status-constants');
var template = require('./tmpl/permissions-view.hbs');

require('../behaviors/isomorphic');

var PermissionsView = Marionette.LayoutView.extend({
  template: template,

  ui: {
    peopleInput: '.js-permissions-people-input',
    permissionsOptionsWrapper: '.js-permissions-options-wrapper',
    permissionsOptionsSelect: '.js-permissions-options-select',
    permissionsOptionsSpinner: '.js-permissions-options-spinner',
    permissionsOptionsErrorIcon: '.js-permissions-options-error-icon',
    permissionsOptionsGithubIcon: '.js-permissions-options-github-icon',
    permissionsOptionsGitlabIcon: '.js-permissions-options-gitlab-icon',
    permissionsOptionsGitterIcon: '.js-permissions-options-gitter-icon',
    extraAdminsNote: '.js-permissions-extra-admins-note',
    extraAdminsList: '.js-permissions-admin-list',
    sdWarning: '.js-permissions-sd-warning',
    modelError: '.js-permissions-model-error',
    submissionError: '.js-permissions-submission-error'
  },

  behaviors: {
    Isomorphic: {
      adminListView: { el: '.js-permissions-admin-list-root', init: 'initAdminListView' }
    }
  },

  initAdminListView: function(optionsForRegion) {
    this.adminListView = new PermissionsPeopleListView(
      optionsForRegion({
        collection: this.model.adminCollection
      })
    );

    this.listenTo(this.adminListView, 'user:remove', this.onAdminRemoved, this);
    return this.adminListView;
  },

  events: {
    'change @ui.permissionsOptionsSelect': 'onPermissionsOptionsSelectChange'
  },

  modelEvents: {
    'change:entity': 'onEntityChange',
    'change:securityDescriptor': 'onSecurityDescriptorChange',
    'change:requestingSecurityDescriptorStatus': 'onRequestingSecurityDescriptorStatusChange',
    'change:submitSecurityDescriptorStatus': 'onSubmitSecurityDescriptorStatusChange'
  },

  initialize: function(/*attrs, options*/) {
    this.initializeForEntity();
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    this.listenTo(this.model.adminCollection, 'add remove', this.onAdminCollectionChange);
  },

  menuItemClicked: function(button) {
    switch (button) {
      case 'switch-to-group-entity':
        var entity = this.model.get('entity');
        var groupId = entity && entity.get('groupId');

        var group = entity && entity.get('group');
        if (groupId) {
          group = this.model.groupCollection.get(groupId);
        }

        this.model.set({
          entity: group
        });
        break;
      case 'done':
        this.submitNewSecurityDescriptor();
        break;
    }
  },

  serializeData: function() {
    var data = this.model.toJSON();
    data.entity = data.entity && data.entity.toJSON();

    data.groupAvatarUrl = avatars.getForGroupId(data.entity.groupId || data.entity.id);
    data.permissionOpts = this.getPermissionOptions();

    return data;
  },

  onRender: function() {
    this.typeahead = new Typeahead({
      collection: new userSearchModels.Collection(),
      itemTemplate: userSearchItemTemplate,
      el: this.ui.peopleInput[0],
      autoSelector: function(input) {
        return function(m) {
          var displayName = (m.get('displayName') || '').toLowerCase();
          var username = (m.get('username') || '').toLowerCase();

          return (
            fuzzysearch(input.toLowerCase(), displayName) ||
            fuzzysearch(input.toLowerCase(), username)
          );
        };
      },
      fetch: function(input, collection, fetchSuccess) {
        this.collection.fetch(
          {
            data: {
              q: input,
              type: 'gitter'
            }
          },
          {
            add: true,
            remove: true,
            merge: true,
            success: fetchSuccess
          }
        );
      }
    });

    this.listenTo(this.typeahead, 'selected', this.onAdminSelected);

    this.onRequestingSecurityDescriptorStatusChange();
    this.onAdminCollectionChange();
  },

  onPermissionsOptionsSelectChange: function() {
    var currentSd = this.model.get('securityDescriptor');
    var selectValue = this.ui.permissionsOptionsSelect.val();

    this.model.set({
      securityDescriptor: _.extend({}, currentSd, {
        type: selectValue === 'null' ? null : selectValue
      })
    });
  },

  onAdminCollectionChange: function() {
    toggleClass(this.ui.extraAdminsList[0], 'hidden', this.model.adminCollection.length === 0);
    this.updateModelErrors();
  },

  onAdminSelected: function(user) {
    this.ui.peopleInput.val('');
    this.model.adminCollection.add([user]);
    this.typeahead.dropdown.hide();
  },

  onAdminRemoved: function(user) {
    this.model.adminCollection.remove(user);
  },

  initializeForEntity: function() {
    this.fetchSecurityDescriptor()
      .bind(this)
      .then(function() {
        var sd = this.model.get('securityDescriptor');
        this.model.set('initialSecurityDescriptorType', sd && sd.type);

        var permissionOpts = this.getPermissionOptions();

        this.ui.permissionsOptionsSelect.html('');
        permissionOpts.forEach(
          function(opt) {
            var optionEl = $('<option></option>');
            optionEl.text(opt.label);
            optionEl.attr('value', opt.value);
            if (opt.selected) {
              optionEl.attr('selected', opt.selected);
            }
            optionEl.appendTo(this.ui.permissionsOptionsSelect);
          }.bind(this)
        );
      });
    this.fetchAdminUsers();
  },

  onEntityChange: function() {
    this.model.set({
      securityDescriptor: null
    });
    this.model.adminCollection.reset();
    this.initializeForEntity();
  },

  // eslint-disable-next-line complexity
  onSecurityDescriptorChange: function() {
    var sd = this.model.get('securityDescriptor');
    var sdType = sd && sd.type;
    toggleClass(this.ui.extraAdminsNote[0], 'hidden', !sdType);

    var sdWarningString = '';
    var initialSdType = this.model.get('initialSecurityDescriptorType');
    var isInitialSdTypeNonReversable =
      initialSdType === 'GL_GROUP' ||
      initialSdType === 'GL_PROJECT' ||
      initialSdType === 'GL_USER' ||
      initialSdType === 'GH_ORG' ||
      initialSdType === 'GH_REPO' ||
      initialSdType === 'GH_USER';
    if (isInitialSdTypeNonReversable && initialSdType !== sdType) {
      let backendString = '';
      if (
        initialSdType === 'GH_ORG' ||
        initialSdType === 'GH_REPO' ||
        initialSdType === 'GH_USER'
      ) {
        backendString = 'GitHub';
      } else if (isGitlabSecurityDescriptorType(initialSdType)) {
        backendString = 'GitLab';
      }

      sdWarningString = `Warning, switching away from ${backendString}-based administrators is permanent. Once you have applied these changes, you cannot go back to ${backendString} based administrators.`;
    }
    this.ui.sdWarning.text(sdWarningString);
    toggleClass(this.ui.sdWarning[0], 'hidden', sdWarningString.length === 0);

    this.updatePermissionOptionsIcons();
    this.updateModelErrors();
  },

  onRequestingSecurityDescriptorStatusChange: function() {
    this.updatePermissionOptionsIcons();
  },

  onSubmitSecurityDescriptorStatusChange: function() {
    var status = this.model.get('submitSecurityDescriptorStatus');
    var statusString = '';

    if (status === submitSecurityDescriptorStatusConstants.ERROR) {
      statusString = 'Problem submitting security descriptor';
    }

    this.ui.submissionError.text(statusString);
    toggleClass(this.ui.submissionError[0], 'hidden', statusString.length === 0);
  },

  updateModelErrors: function() {
    var modelIsValid = this.model.isValid();
    var errors = !modelIsValid && this.model.validationError;

    var errorStrings = (errors || []).map(function(error) {
      return error.message;
    });
    var errorMessage = errorStrings.join('\n');

    this.ui.modelError.text(errorMessage);
    toggleClass(this.ui.modelError[0], 'hidden', errorMessage.length === 0);
  },

  updatePermissionOptionsIcons: function() {
    var state = this.model.get('requestingSecurityDescriptorStatus');
    var isSpinnerHidden = state !== requestingSecurityDescriptorStatusConstants.PENDING;
    var isErrorIconHidden = state !== requestingSecurityDescriptorStatusConstants.ERROR;
    toggleClass(this.ui.permissionsOptionsSpinner[0], 'hidden', isSpinnerHidden);
    toggleClass(this.ui.permissionsOptionsErrorIcon[0], 'hidden', isErrorIconHidden);

    var sd = this.model.get('securityDescriptor');
    var sdType = sd && sd.type;

    if (isSpinnerHidden && isErrorIconHidden) {
      toggleClass(
        this.ui.permissionsOptionsGithubIcon[0],
        'hidden',
        sdType !== 'GH_ORG' && sdType !== 'GH_REPO' && sdType !== 'GH_USER'
      );
      toggleClass(
        this.ui.permissionsOptionsGitlabIcon[0],
        'hidden',
        !isGitlabSecurityDescriptorType(sdType)
      );
      toggleClass(this.ui.permissionsOptionsGitterIcon[0], 'hidden', sdType !== 'GROUP' && sdType);
    }
  },

  // eslint-disable-next-line complexity
  getPermissionOptions: function() {
    var entity = this.model.get('entity');
    var sd = this.model.get('securityDescriptor');
    var permissionOpts = [];

    if (sd && sd.type === 'GH_ORG') {
      permissionOpts.push({
        value: 'GH_ORG',
        label: 'Any member of the ' + sd.linkPath + ' organization on GitHub',
        selected: sd.type === 'GH_ORG'
      });
    } else if (sd && sd.type === 'GH_REPO') {
      permissionOpts.push({
        value: 'GH_REPO',
        label: 'Anyone with push access to the ' + sd.linkPath + ' repo on GitHub',
        selected: sd.type === 'GH_REPO'
      });
    } else if (sd && sd.type === 'GH_USER') {
      permissionOpts.push({
        value: 'GH_USER',
        label: `The @${sd.linkPath} user on GitHub`,
        selected: sd.type === 'GL_PROJECT'
      });
    } else if (sd && sd.type === 'GL_GROUP') {
      permissionOpts.push({
        value: 'GL_GROUP',
        label: `Anyone with maintainer access to the ${sd.linkPath} group on GitLab`,
        selected: sd.type === 'GL_GROUP'
      });
    } else if (sd && sd.type === 'GL_PROJECT') {
      permissionOpts.push({
        value: 'GL_PROJECT',
        label: `Anyone with maintainer access to the ${sd.linkPath} project on GitLab`,
        selected: sd.type === 'GL_PROJECT'
      });
    } else if (sd && sd.type === 'GL_USER') {
      permissionOpts.push({
        value: 'GL_USER',
        label: `The @${sd.linkPath} user on GitLab`,
        selected: sd.type === 'GL_PROJECT'
      });
    }

    var hasGitHubOpts = permissionOpts.length > 0;

    var groupId = entity && entity.get('groupId');
    var group = entity && entity.get('group');
    if (groupId) {
      group = this.model.groupCollection.get(groupId);
    }
    if (sd && group) {
      permissionOpts.push({
        value: 'GROUP',
        label:
          'Any administrator of the ' +
          (group ? group.get('name') + ' ' : '') +
          'community on Gitter',
        selected: !hasGitHubOpts && sd.type === 'GROUP'
      });
    }

    if (sd) {
      permissionOpts.push({
        value: 'null',
        label: 'Only the users listed below',
        // This accounts for undefined or null
        selected: !sd.type
      });
    }

    return permissionOpts;
  },

  getBaseApiEndpointForEntity: function() {
    var entity = this.model.get('entity');
    var baseEntityApiUrl = '/v1/groups';
    // TODO: Better way to tell if it is a room or how to determine associated endpoint???
    var isRoom = entity && entity.get('groupId');
    if (isRoom) {
      baseEntityApiUrl = '/v1/rooms';
    }

    return baseEntityApiUrl;
  },

  getApiEndpointForEntity: function() {
    var entity = this.model.get('entity');
    if (entity) {
      return urlJoin(this.getBaseApiEndpointForEntity(), entity.get('id'));
    }
  },

  fetchSecurityDescriptor: function() {
    this.model.set(
      'requestingSecurityDescriptorStatus',
      requestingSecurityDescriptorStatusConstants.PENDING
    );
    var securityApiUrl = urlJoin(this.getApiEndpointForEntity(), 'security');
    return apiClient
      .get(securityApiUrl)
      .bind(this)
      .then(function(sd) {
        this.model.set({
          securityDescriptor: sd,
          requestingSecurityDescriptorStatus: requestingSecurityDescriptorStatusConstants.COMPLETE
        });
      })
      .catch(function() {
        this.model.set(
          'requestingSecurityDescriptorStatus',
          requestingSecurityDescriptorStatusConstants.ERROR
        );
      });
  },

  fetchAdminUsers: function() {
    var entity = this.model.get('entity');

    if (entity) {
      this.model.adminCollection.url = urlJoin(
        this.getApiEndpointForEntity(),
        'security/extraAdmins'
      );
      this.model.adminCollection.fetch();
    }
  },

  submitNewSecurityDescriptor: function() {
    var modelIsValid = this.model.isValid();
    var errors = !modelIsValid && this.model.validationError;

    if (errors) {
      this.updateModelErrors();
      return;
    }

    var securityApiUrl = urlJoin(this.getApiEndpointForEntity(), 'security');
    var sd = this.model.get('securityDescriptor');
    sd.extraAdmins = this.model.adminCollection.map(function(user) {
      return user.get('id');
    });

    this.model.set(
      'submitSecurityDescriptorStatus',
      submitSecurityDescriptorStatusConstants.PENDING
    );
    return apiClient
      .put(securityApiUrl, sd)
      .bind(this)
      .then(function(updatedSd) {
        this.model.set({
          securityDescriptor: updatedSd,
          submitSecurityDescriptorStatus: submitSecurityDescriptorStatusConstants.COMPLETE
        });

        // Close the modal
        this.dialog.hide();
        this.dialog = null;
      })
      .catch(function() {
        this.model.set(
          'submitSecurityDescriptorStatus',
          submitSecurityDescriptorStatusConstants.ERROR
        );
      });
  }
});

var Modal = ModalView.extend({
  disableAutoFocus: true,

  modelEvents: {
    'change:entity': 'onEntityChange'
  },

  initialize: function(options) {
    options = options || {};
    options.title = this.getModalTitle();
    this.options = options;

    options.menuItems = new Backbone.Collection(
      this.generateMenuItems().concat(options.menuItems || [])
    );

    ModalView.prototype.initialize.call(this, options);
    this.view = new PermissionsView(
      _.extend({}, options, {
        menuItemCollection: options.menuItems
      })
    );
  },

  onEntityChange: function() {
    this.updateModalTitle();
    this.updateMenuItems();
  },

  updateModalTitle: function() {
    this.ui.title.text(this.getModalTitle());
  },

  updateMenuItems: function() {
    this.options.menuItems.set(this.generateMenuItems(), { merge: true });
  },

  getModalTitle: function() {
    var model = this.model;
    var entity = model && model.get('entity');

    var title = 'Community Permissions';

    if (entity) {
      // TODO: Better way to tell if it is a room or how to determine associated endpoint???
      var isRoom = entity && entity.get('groupId');

      title = entity.get('name') + ' ' + (isRoom ? 'Room' : 'Community') + ' Permissions';
    }

    return title;
  },

  generateMenuItems: function() {
    var model = this.model;
    var entity = model && model.get('entity');

    var items = [];

    if (entity) {
      var groupId = entity.get('groupId');
      if (groupId) {
        items.push({
          action: 'switch-to-group-entity',
          pull: 'left',
          text: 'Edit Community Permissions',
          className: 'modal--default__footer__link'
        });
      }
    }

    items.push({
      action: 'done',
      pull: 'right',
      text: 'Done',
      className: 'modal--default__footer__btn'
    });

    return items;
  }
});

module.exports = {
  View: PermissionsView,
  Modal: Modal
};
