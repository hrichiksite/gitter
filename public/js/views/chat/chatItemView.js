'use strict';

const debug = require('debug-proxy')('app:chat-item-view');
const $ = require('jquery');
const _ = require('lodash');
const classnames = require('classnames');
const moment = require('moment');
const Marionette = require('backbone.marionette');
const cocktail = require('backbone.cocktail');
const urlJoin = require('url-join');

const context = require('gitter-web-client-context');
const appEvents = require('../../utils/appevents');
const apiClient = require('../../components/api-client');
const dataset = require('../../utils/dataset-shim');
const toggleClass = require('../../utils/toggle-class');
const RAF = require('../../utils/raf');
const isMobile = require('../../utils/is-mobile');
const timeFormat = require('gitter-web-shared/time/time-format');
const fullTimeFormat = require('gitter-web-shared/time/full-time-format');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
const DoubleTapper = require('../../utils/double-tapper');
const LoadingCollectionMixin = require('../loading-mixin');
const FastAttachMixin = require('../fast-attach-mixin');
const chatModels = require('../../collections/chat');

const AvatarView = require('../widgets/avatar');
const Popover = require('../popover');
const chatItemTemplate = require('./tmpl/chatItemView.hbs');
const statusItemTemplate = require('./tmpl/statusItemView.hbs');
const actionsTemplate = require('./tmpl/actionsView.hbs');
const ChatEditView = require('../chat/chat-edit-view');
const ChatItemPolicy = require('./chat-item-policy');

require('../behaviors/unread-items');
require('../behaviors/widgets');
require('../behaviors/highlight');
require('../behaviors/last-message-seen');
require('../behaviors/timeago');
require('../behaviors/tooltip');

module.exports = (function() {
  var getModelIdClass = function(id) {
    return 'model-id-' + id;
  };

  var mouseEvents = {
    'click .js-chat-item-edit': 'toggleEdit',
    'click .js-chat-item-readby': 'showReadBy',
    'click .js-chat-item-from': 'mentionUser',
    'click .js-chat-time': 'permalink',
    'mouseover .js-chat-item-readby': 'showReadByIntent',
    'click .webhook': 'expandActivity',
    click: 'onClick',
    'click .js-chat-item-actions': 'showActions',
    'click .js-parent-message-indicator': 'openThread'
  };

  const mobileEvents = {
    touchstart: 'onTouchstart',
    touchmove: 'onTouchmove',
    touchend: 'onTouchend',
    'click .js-parent-message-indicator': 'openThread'
  };

  const sendOpenThreadAction = chatId =>
    appEvents.trigger('dispatchVueAction', 'threadMessageFeed/open', chatId);

  var ChatItemView = Marionette.ItemView.extend({
    attributes: function() {
      var classMap = {
        'chat-item': true,
        // inline-threads-for-mobile-embedded
        // Hiding (or treating) child messages from the main message feed
        // Chosen as an easier alternative to creating a new filtered LiveCollection for chat messages
        'threaded-conversation-chat-item': !!this.model.get('parentId')
      };

      var id = this.model.get('id');
      if (id) {
        classMap[getModelIdClass(id)] = true;
      }

      return {
        class: classnames(classMap),
        role: 'listitem'
      };
    },
    ui: {
      actions: '.js-chat-item-actions',
      text: '.js-chat-item-text',
      sent: '.js-chat-time',
      timestampLink: '.js-chat-time'
    },

    behaviors: {
      Widgets: {},
      UnreadItems: {},
      Highlight: {},
      LastMessageSeen: {},
      TimeAgo: {
        modelAttribute: 'sent',
        el: '.js-chat-time'
      },
      Tooltip: {
        '.js-chat-time': { titleFn: 'getSentTimeTooltip', html: true }
      }
    },

    modelEvents: {
      syncStatusChange: 'onSyncStatusChange',
      change: 'onChange'
    },

    isEditing: false,

    events: function() {
      if (isMobile()) {
        return mobileEvents;
      } else {
        return mouseEvents;
      }
    },

    expandActivity: function() {
      $('.webhook .commits').slideToggle('fast');
    },

    initialize: function(options) {
      this.rollers = options.rollers;

      this._oneToOne = context.inOneToOneTroupeContext();
      this.isPermalinkable = !this._oneToOne;

      this.userCollection = options.userCollection;

      this.decorated = false;

      // fastclick destroys double tap events
      this.doubleTapper = new DoubleTapper();

      this.listenToOnce(this, 'messageInViewport', this.decorate);

      this.chatItemPolicy = new ChatItemPolicy(this.model.attributes, {
        currentUserId: context.getUserId(),
        isTroupeAdmin: context.isTroupeAdmin()
      });
    },

    template: function(data) {
      if (data.status) {
        return statusItemTemplate(data);
      }

      return chatItemTemplate(data);
    },

    serializeData: function() {
      var data = _.clone(this.model.attributes);
      data.model = this.model;

      data.roomName = context.troupe().get('uri');

      if (data.fromUser) {
        data.username = data.fromUser.username;
        data.displayName = data.fromUser.displayName;
      }

      // No sent time, use the current time as the message has just been sent
      if (!data.sent) {
        data.sent = moment();
      }

      data.sentTimeFormatted = timeFormat(data.sent, { forceUtc: this.isArchive() });
      data.permalinkUrl = this.getPermalinkUrl();
      data.sentTimeFormattedFull = fullTimeFormat(data.sent);

      data.readByText = this.getReadByText(data.readBy);
      if (!data.html) {
        data.html = _.escape(data.text);
      }
      data.isPermalinkable = this.isPermalinkable;
      data.showItemActions = !this.isArchive();
      return data;
    },

    getReadByText: function(readByCount) {
      if (!readByCount) return '';
      if (this._oneToOne) return ' ';
      if (readByCount > 10) readByCount = 10;
      return readByCount;
    },

    onChange: function() {
      this.chatItemPolicy = new ChatItemPolicy(this.model.attributes, {
        currentUserId: context.getUserId(),
        isTroupeAdmin: context.isTroupeAdmin()
      });
      this.updateRender(this.model.changed);
    },

    renderText: function() {
      var model = this.model;

      // Will only use the text when a value hasn't been returned from the server
      var html = model.get('html') || _.escape(model.get('text'));

      // Handle empty messages as deleted
      if (html.length === 0) {
        html = '<i>This message was deleted</i>';
        this.$el.addClass('deleted');
      }

      // This needs to be fast. innerHTML is much faster than .html()
      // by an order of magnitude
      this.ui.text[0].innerHTML = html;

      /* If the content has already been decorated, re-perform the decoration */
      if (this.decorated) {
        this.decorate();
      }
    },

    decorate: function() {
      this.decorated = true;
      this.options.decorators.forEach(function(decorator) {
        decorator.decorate(this);
      }, this);
    },

    onShow: function() {
      // We do this so we don't `appEvents.trigger('navigation')` down the line
      // See `link-handler.js -> installLinkHandler`
      // That event would cause a `router-app.js -> postMessage('permalink.navigate')` to the chat frame and
      // highlight the message, see `router-chat.js -> case 'permalink.navigate'`
      var timestampLinkElement = this.ui.timestampLink[0];
      if (timestampLinkElement) {
        dataset.set(timestampLinkElement, 'disableRouting', true);
      }
    },

    onRender: function() {
      this.updateRender();
    },

    _requiresFullRender: function(changes) {
      if (changes && 'threadMessageCount' in changes) {
        return true;
      }
      if (changes && 'burstStart' in changes) {
        var prevBurstStart = !!this.model.previous('burstStart');
        var burstStart = !!this.model.get('burstStart');

        // If burstStart has changed
        if (burstStart !== prevBurstStart) {
          return true;
        }
      }
      return false;
    },

    // eslint-disable-next-line complexity
    updateRender: function(changes) {
      if (this._requiresFullRender(changes)) {
        return this.render();
      }

      /* NB: `unread` updates occur in the behaviour */
      var sentElement = this.ui.sent[0];

      if (!changes || 'html' in changes || 'text' in changes) {
        this.renderText();
      }

      if (changes && 'id' in changes) {
        if (sentElement) {
          var permalinkUrl = this.getPermalinkUrl();
          if (permalinkUrl.length) {
            sentElement.setAttribute('href', permalinkUrl);
          }
        }
      }

      if (changes && 'sent' in changes) {
        if (sentElement) {
          var time = this.model.get('sent');
          if (time) {
            var formattedTime = fullTimeFormat(time);
            sentElement.setAttribute('title', formattedTime);
          }
        }
      }

      this.handleUpdateMentionChanges(changes);
      this.handleUpdateMessageStateChanges(changes);
      this.handleUpdateReadbyStateChanges(changes);

      if (!context.isLoggedIn()) this.ui.actions.hide();
    },
    handleUpdateMentionChanges: function(changes) {
      if (!changes || 'mentioned' in changes) {
        var wasMentioned = this.model.get('mentioned');
        toggleClass(this.el, 'mentioned', wasMentioned);
        if (wasMentioned) {
          this.el.setAttribute('aria-live', 'assertive');
          this.el.setAttribute('role', 'alert');
        }
      }
    },
    handleUpdateMessageStateChanges: function(changes) {
      var model = this.model;

      if (!changes || 'editedAt' in changes) {
        toggleClass(this.el, 'hasBeenEdited', this.hasBeenEdited());
      }

      if (!changes || 'burstStart' in changes) {
        toggleClass(this.el, 'burstStart', !!model.get('burstStart'));
        toggleClass(this.el, 'burstContinued', !model.get('burstStart'));
      }
    },
    handleUpdateReadbyStateChanges: function(changes) {
      /* Don't run on the initial (changed=undefined) as its done in the template */
      // FIXME this is whole thing is pretty ugly, could do with a refactor
      // First iteration: we're not appending the read icon here, just adding a class to display it
      if (changes && 'readBy' in changes) {
        var model = this.model;
        var readByCount = model.get('readBy');
        var oldValue = model.previous('readBy');
        var readByLabel = this.$el.find('.js-chat-item-readby');
        var className = 'chat-item__icon--read-by-some';

        if (readByLabel.length === 0) {
          if (readByCount) {
            RAF(function() {
              readByLabel.addClass(className);
            });
          }
        } else {
          if ((oldValue === 0) !== (readByCount === 0)) {
            // Things have changed
            readByLabel.toggleClass(className, !!readByCount);
          }
        }
      }
    },

    focusInput: function() {
      $('#chat-input-textarea').focus();
    },

    onEditCancel: function() {
      if (!isMobile()) {
        this.focusInput();
      }
      this.toggleEdit();
    },

    onEditSave: function(newText) {
      if (this.isEditing) {
        if (this.chatItemPolicy.canEdit() && newText !== this.model.get('text')) {
          this.model.set('text', newText);
          this.model.set('html', null);
          this.model.save();
        }
        if (!isMobile()) {
          this.focusInput();
        }
        this.toggleEdit();
      }
    },

    isArchive: () => !!context().archive,

    hasBeenEdited: function() {
      return !!this.model.get('editedAt');
    },

    hasBeenRead: function() {
      return !!this.model.get('readBy');
    },

    onToggleEdit: function() {
      this.toggleEdit();
    },

    toggleEdit: function() {
      if (this.isEditing) {
        this.isEditing = false;
        this.showText();
        this.stopListening(appEvents, 'focus.request.chat.edit');
        appEvents.trigger('chat.edit.hide');
      } else {
        if (this.chatItemPolicy.canEdit()) {
          var self = this;
          this.isEditing = true;
          this.showInput();
          this.listenTo(appEvents, 'focus.request.chat.edit', function() {
            self.inputBox.$el.focus();
            appEvents.trigger('focus.change.chat.edit');
          });
          appEvents.trigger('chat.edit.show');
        }
      }
    },

    subst: function(search, replace, global) {
      if (!this.chatItemPolicy.canEdit()) return;

      var reString = search.replace(/(^|[^\[])\^/g, '$1');
      var re = new RegExp(reString, global ? 'gi' : 'i');
      var newText = this.model.get('text').replace(re, replace);

      this.model
        .set({
          text: newText,
          html: null
        })
        .save();
    },

    showText: function() {
      if (this.inputBox) {
        this.stopListening(this.inputBox);
        this.inputBox.remove();
        delete this.inputBox;
      }

      this.renderText();
    },

    showInput: function() {
      var chatInputText = this.ui.text;

      chatInputText.html("<textarea class='trpChatInput' autofocus></textarea>");

      var unsafeText = this.model.get('text');

      var textarea = chatInputText.find('textarea').val(unsafeText);

      this.inputBox = new ChatEditView({ el: textarea }).render();

      // chrome 48 desktop requires an explicit focus event as `autofocus` is not enough
      // chrome 48 android requires the same, but the first textarea autofocus is fine
      textarea.focus();
      // iOS 9 doesnt put the carat at the end of the text
      textarea.val('').val(unsafeText);

      this.listenTo(this.inputBox, 'save', this.onEditSave);

      // chrome 48 android sends blur events and generally freaks out if you do this
      // in the same event loop or in a requestAnimationFrame
      setTimeout(function() {
        // chrome 48 desktop requires an explicit focus event as `autofocus` is not enough.
        // chrome 48 android requires the same, but the first textarea autofocus is fine.
        textarea.focus();
        // iOS 9 doesnt put the carat at the end of the text
        textarea.val('').val(unsafeText);
      }, 0);

      this.listenTo(this.inputBox, 'cancel', this.onEditCancel);
    },

    showReadByIntent: function(e) {
      ReadByPopover.hoverTimeout(
        e,
        function() {
          this.showReadBy(e);
        },
        this
      );
    },

    showReadBy: function(e) {
      if (this.popover) return;

      appEvents.trigger('stats.event', 'chat-item.show-read-by');

      var popover = new ReadByPopover({
        model: this.model,
        userCollection: this.userCollection,
        scroller: this.$el.parents('.primary-scroll'), // TODO: make nice
        placement: 'vertical',
        minHeight: '88px',
        width: '300px',
        title: 'Read By',
        targetElement: e.target
      });

      popover.show();
      ReadByPopover.singleton(this, popover);

      e.preventDefault();
      e.stopPropagation();
    },

    showActions: function(e) {
      // Don't show if it's already open.
      if (this.popover) return;

      var actions = new ActionsPopover({
        model: this.model,
        chatItemView: this,
        targetElement: e.target,
        placement: 'horizontal',
        width: '125px'
      });

      this.listenTo(actions, 'render', function() {
        this.ui.actions.addClass('selected');
      });

      this.listenTo(actions, 'destroy', function() {
        this.ui.actions.removeClass('selected');
      });

      actions.show();
      ReadByPopover.singleton(this, actions);

      e.preventDefault();
      e.stopPropagation();
    },

    mentionUser: function() {
      var mention = '@' + this.model.get('fromUser').username + ' ';
      appEvents.trigger('input.append', mention);
    },

    permalink: function(e) {
      if (!this.isPermalinkable) return;
      // Can't permalink a chat which hasn't been saved to the server yet
      if (!this.model.id) return;

      // Holding the Alt key down while clicking adds the permalink to the chat input
      const permalinkEventAttributes = ['chat', this.model, { appendInput: !!e.altKey }];
      debug('permalink.requested', ...permalinkEventAttributes);
      appEvents.trigger('permalink.requested', ...permalinkEventAttributes);

      e.preventDefault();
      e.stopPropagation();
    },

    openThread: function() {
      sendOpenThreadAction(this.model.get('id'));
    },

    highlight: function() {
      var self = this;
      this.$el.addClass('chat-item__highlighted');
      setTimeout(function() {
        self.$el.removeClass('chat-item__highlighted');
      }, 5000);
    },

    onTouchstart: function() {
      this.isDragging = false;
    },

    onTouchmove: function() {
      this.isDragging = true;
    },

    onTouchend: function(e) {
      if (this.isDragging) {
        // just a drag finishing. not a tap.
        this.isDragging = false;
      } else {
        // its a tap!
        this.onTap(e);
      }
    },

    onTap: function(e) {
      const tapCount = this.doubleTapper.registerTap();
      if (tapCount === 2) {
        this.toggleEdit(); // edit on double tap
        // otherwise the normal tap is recognised and blurs the text area
        e.preventDefault();
        e.stopPropagation();
      }
    },

    onClick: function(jqueryEvent) {
      var event = jqueryEvent.originalEvent;

      switch (event.detail) {
        case 1:
          // single click
          // this calls onSelected
          this.triggerMethod('selected', this.model);
          break;
        case 2:
          // double click!
          break;
        case 3:
          // m-m-m-monster click!
          if (window.getSelection) {
            // used for html copy
            window.getSelection().selectAllChildren(this.el);
          }
          break;
      }
    },

    onSyncStatusChange: function(newState) {
      this.$el
        .toggleClass('synced', newState === 'synced')
        .toggleClass('syncing', newState === 'syncing')
        .toggleClass('syncerror', newState === 'syncerror');
    },

    getPermalinkUrl: function() {
      if (!this.isPermalinkable) return '';

      var modelId = this.model.id;
      if (!modelId) return '';

      var uri = context.troupe().get('uri');
      if (!uri) return '';

      const sent = moment(this.model.get('sent'), moment.defaultFormat);

      return generatePermalink(uri, modelId, sent, this.isArchive());
    },

    getSentTimeTooltip: function() {
      var time = this.model.get('sent');
      if (!time) return '';
      var formatted = time.format('LLL');
      // archive and nli window don't have an inputBox so we can't add permalink to it
      if (this.isPermalinkable && formatted && !this.isArchive() && context.isLoggedIn()) {
        formatted += '  <br>(Alt-click to quote)';
      }

      return formatted;
    },

    attachElContent: FastAttachMixin.attachElContent
  });

  var ReadByView = Marionette.CollectionView.extend({
    childView: AvatarView,
    className: 'popoverReadBy',
    initialize: function(options) {
      this.collection = new chatModels.ReadByCollection(null, {
        listen: true,
        chatMessageId: this.model.id,
        userCollection: options.userCollection
      });
      this.collection.loading = true; // Messy workaround until the loading-mixin handles loading/loaded transitions correctly
    },
    onDestroy: function() {
      var readByCollection = this.collection;

      // The unlisten will send out a reset, which may cause problems, unlisten manually
      this.stopListening(readByCollection);
      readByCollection.unlisten();

      // Stop listening to events (memory leaks)
      readByCollection.stopListening();
    }
  });
  cocktail.mixin(ReadByView, LoadingCollectionMixin);

  var ReadByPopover = Popover.extend({
    initialize: function(options) {
      Popover.prototype.initialize.apply(this, arguments);
      this.view = new ReadByView({ model: this.model, userCollection: options.userCollection });
    }
  });

  var ActionsView = Marionette.ItemView.extend({
    template: actionsTemplate,
    initialize: function(options) {
      this.chatItemView = options.chatItemView;
    },
    events: {
      'click .js-chat-action-edit': 'edit',
      'click .js-chat-action-threadReply': 'threadReply',
      'click .js-chat-action-quote': 'quote',
      'click .js-chat-action-delete': 'delete',
      'click .js-chat-action-report': 'report',
      'click .js-chat-action-retry': 'retry',
      'click .js-chat-action-cancel': 'cancel'
    },

    edit: function() {
      this.chatItemView.triggerMethod('toggleEdit');
    },

    threadReply: function() {
      sendOpenThreadAction(this.model.get('id'));
    },

    quote: function() {
      const formattedText = this.model
        .get('text')
        .split(/\r?\n/)
        .map(sentence => `> ${sentence}`)
        .join('\n');
      appEvents.trigger('input.append', formattedText + '\n\n', { newLine: true });
    },

    delete: function() {
      this.model.destroy();
    },

    report: function() {
      const apiUrl = urlJoin(
        '/v1/rooms/',
        context.getTroupeId(),
        'chatMessages',
        this.model.get('id'),
        'report'
      );
      apiClient.post(apiUrl);
    },

    retry: function() {
      this.model.save();
    },

    cancel: function() {
      var model = this.model;
      if (model.id) {
        model.fetch();
      } else {
        model.collection.remove(model);
      }
    },

    serializeData: function() {
      var hasSyncError = this.model.hasSyncError();
      if (hasSyncError) {
        return {
          actions: [
            { name: 'retry', description: 'Retry' },
            { name: 'cancel', description: 'Cancel' }
          ]
        };
      }

      var deleted = !this.model.get('text');
      var isPersisted = !!this.model.id;
      const canEdit = this.chatItemView.chatItemPolicy.canEdit();
      const canDelete = this.chatItemView.chatItemPolicy.canDelete();
      const canReport = this.chatItemView.chatItemPolicy.canReport();

      const actions = [];

      const threadMessageCount = this.model.get('threadMessageCount');
      actions.push({
        name: 'threadReply',
        description: threadMessageCount ? 'Reply in thread' : 'Start a thread',
        disabled: !isPersisted
      });

      if (!deleted) {
        actions.push({ name: 'quote', description: 'Quote', disabled: !isPersisted });
      }

      actions.push({ name: 'edit', description: 'Edit', disabled: !canEdit });
      actions.push({ name: 'delete', description: 'Delete', disabled: !canDelete });
      actions.push({ name: 'report', description: 'Report', disabled: !canReport });

      return { actions };
    }
  });

  var ActionsPopover = Popover.extend({
    initialize: function(options) {
      Popover.prototype.initialize.apply(this, arguments);
      this.view = new ActionsView({
        model: this.model,
        chatItemView: options.chatItemView
      });
    },
    events: {
      click: 'hide'
    }
  });

  return {
    ChatItemView: ChatItemView,
    ReadByView: ReadByView,
    ReadByPopover: ReadByPopover,
    ActionsView: ActionsView,
    ActionsPopover: ActionsPopover
  };
})();
