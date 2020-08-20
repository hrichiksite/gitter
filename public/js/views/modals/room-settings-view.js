'use strict';

var context = require('gitter-web-client-context');
var Marionette = require('backbone.marionette');
var ModalView = require('./modal');
var apiClient = require('../../components/api-client');
var roomSettingsTemplate = require('./tmpl/room-settings-view.hbs');
var Promise = require('bluebird');
var toggleClass = require('../../utils/toggle-class');

var View = Marionette.ItemView.extend({
  template: roomSettingsTemplate,

  ui: {
    githubOnly: '#github-only',
    welcomeMessage: '#room-welcome-message',
    welcomeMessagePreviewButton: '#preview-welcome-message',
    welcomeMessagePreviewContainer: '#welcome-message-preview-container',
    editWelcomeMessageButton: '#close-welcome-message-preview',
    errorMessage: '#error-message'
  },

  events: {
    'click #close-settings': 'destroySettings',
    'click @ui.welcomeMessagePreviewButton': 'previewWelcomeMessage',
    'click @ui.editWelcomeMessageButton': 'editWelcomeMessage'
  },

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked, this);
    apiClient.room
      .get('/meta')
      .then(({ welcomeMessage = { text: '', html: '' } }) => {
        if (welcomeMessage.text.length) {
          this.initWithMessage(welcomeMessage);
        } else {
          this.initEmptyTextArea();
        }
      })
      .catch(this.showError.bind(this));
  },

  destroySettings: function() {
    this.dialog.hide();
    this.dialog = null;
  },

  menuItemClicked: function(action) {
    switch (action) {
      case 'submit':
        this.formSubmit();
        break;
    }
  },

  update: function() {
    var hasGithub = (this.model.get('providers') || []).indexOf('github') !== -1;
    if (hasGithub) {
      this.ui.githubOnly.attr('checked', true);
    } else {
      this.ui.githubOnly.removeAttr('checked');
    }
  },

  initEmptyTextArea: function() {
    this.ui.welcomeMessage.attr('placeholder', 'Add a new welcome message here');
  },

  initWithMessage: function(msg) {
    this.ui.welcomeMessage.val(msg.text);
  },

  onRender: function() {
    this.update();
  },

  previewWelcomeMessage: function(e) {
    e.preventDefault();
    this.setPreviewLoadingState();
    toggleClass(this.el, 'preview', true);
    //hide the text area
    this.ui.welcomeMessage[0].classList.add('hidden');
    this.fetchRenderedHTML().then(
      function(html) {
        this.ui.welcomeMessagePreviewContainer.html(html);
        toggleClass(this.ui.welcomeMessagePreviewContainer[0], 'loading', false);
      }.bind(this)
    );
  },

  editWelcomeMessage: function(e) {
    e.preventDefault();
    this.setPreviewLoadingState();
    toggleClass(this.el, 'preview', false);
    //show the text area
    this.ui.welcomeMessage[0].classList.remove('hidden');
  },

  setPreviewLoadingState: function() {
    this.ui.welcomeMessagePreviewContainer.html('Loading ...');
    toggleClass(this.ui.welcomeMessagePreviewContainer[0], 'loading', true);
  },

  fetchRenderedHTML: function() {
    return apiClient
      .post(
        '/private/markdown-preview',
        { text: this.getWelcomeMessageContent() },
        { dataType: 'text' }
      )
      .catch(this.showError.bind(this));
  },

  getWelcomeMessageContent: function() {
    return this.ui.welcomeMessage.val();
  },

  formSubmit: function() {
    var providers = this.ui.githubOnly.is(':checked') ? ['github'] : [];
    var welcomeMessageContent = this.getWelcomeMessageContent();

    Promise.all([
      apiClient.room.put('', { providers: providers }),
      apiClient.room.post('/meta', {
        welcomeMessage: welcomeMessageContent
      })
    ])
      .spread(
        function(updatedTroupe /*, metaResponse*/) {
          context.setTroupe(updatedTroupe);
          this.destroySettings();
        }.bind(this)
      )
      .catch(this.showError.bind(this));
  },

  // FIXME: Don't swallow an error
  // eslint-disable-next-line no-unused-vars
  showError: function(err) {
    this.ui.errorMessage[0].classList.remove('hidden');
    this.ui.welcomeMessage.attr('disabled', true);
  }
});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = options.title || 'Room Settings';
    ModalView.prototype.initialize.apply(this, arguments);
    this.view = new View(options);
  },
  menuItems: [
    { action: 'submit', pull: 'right', text: 'Submit', className: 'modal--default__footer__btn' }
  ]
});

module.exports = Modal;
