<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import Avatar from './avatar.vue';
import LoadingSpinner from '../../components/loading-spinner.vue';
const timeFormat = require('gitter-web-shared/time/time-format');
const fullTimeFormat = require('gitter-web-shared/time/full-time-format');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
const pushState = require('../../../utils/browser/pushState');
const linkDecorator = require('../../../views/chat/decorators/linkDecorator');
const emojiDecorator = require('../../../views/chat/decorators/emojiDecorator');
const DoubleTapper = require('../../../utils/double-tapper');
import ChatItemActions from './chat-item-actions.vue';
import Intersect from './intersect';
import isTouch from '../../../utils/is-touch';

export default {
  name: 'ChatItem',
  components: { Avatar, LoadingSpinner, Intersect, ChatItemActions },
  props: {
    message: {
      type: Object,
      required: true
    },
    useCompactStyles: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    isDragging: false,
    doubleTapper: new DoubleTapper()
  }),
  computed: {
    ...mapGetters({
      displayedRoom: 'displayedRoom'
    }),
    ...mapState({
      isLoggedIn: state => state.isLoggedIn,
      messageEditState: state => state.threadMessageFeed.messageEditState
    }),
    sentTimeFormatted: function() {
      return timeFormat(this.message.sent);
    },
    sentTimeFormattedFull: function() {
      return fullTimeFormat(this.message.sent);
    },
    permalinkUrl: function() {
      return generatePermalink(this.displayedRoom.uri, this.message.id, this.message.sent);
    },
    isEmpty: function() {
      const content = this.message.html || this.message.text;
      return content.length === 0;
    },
    editMessageModel: {
      get() {
        return this.messageEditState.text;
      },
      set(text) {
        this.updateEditedText(text);
      }
    },
    isBeingEdited: function() {
      return this.message.id === this.messageEditState.id;
    }
  },
  watch: {
    message: function(newMessage, oldMessage) {
      // highlighted is used for bringing users attention to permalinked message
      if (newMessage.highlighted && !oldMessage.highlighted) {
        this.scrollIntoView('smooth', 'center');
      } else if (
        // focusedAt is ensuring this chat item is in view, e.g. when opening TMF we focus on the newest message
        // this condition is met when either the focusedAt property is new, or it has changed
        newMessage.focusedAt &&
        (!oldMessage.focusedAt || newMessage.focusedAt !== oldMessage.focusedAt)
      ) {
        this.scrollIntoView('auto', newMessage.focusedAt.block);
      }
    }
  },
  updated: function() {
    this.decorate();
    if (this.isBeingEdited) this.$refs.chatItemEditTextArea.focus();
  },
  mounted: function() {
    // highlighted is used for bringing users attention to permalinked message
    if (this.message.highlighted) this.scrollIntoView('smooth', 'center');
    // focusedAt is ensuring this chat item is in view, e.g. when opening TMF we focus on the newest message
    else if (this.message.focusedAt) this.scrollIntoView('auto', this.message.focusedAt.block);

    // unread items client is not available on the server
    this.unreadItemsClient = require('../../../components/unread-items-client');
    this.decorate();
  },
  methods: {
    ...mapActions({
      updateMessage: 'threadMessageFeed/updateMessage',
      updateEditedText: 'threadMessageFeed/updateEditedText',
      editMessage: 'threadMessageFeed/editMessage',
      cancelEdit: 'threadMessageFeed/cancelEdit'
    }),
    cancelEditOnTouchDevice: function() {
      if (isTouch) this.cancelEdit();
    },
    setPermalinkLocation: function() {
      pushState(this.permalinkUrl);
    },
    scrollIntoView: function(behavior, block) {
      this.$el.scrollIntoView({ block, behavior });
    },
    decorate: function() {
      [linkDecorator, emojiDecorator].forEach(d => d.decorate(this));
    },
    onViewportEnter: function() {
      if (this.message.unread) {
        this.unreadItemsClient.markItemRead(this.message.id);
      }
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
        if (!this.isBeingEdited) {
          this.editMessage(this.message);
        }
        // otherwise the normal tap is recognised and blurs the text area
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
};
</script>

<template>
  <intersect @enter="onViewportEnter()">
    <div
      class="chat-item burstStart"
      :class="{
        compact: useCompactStyles,
        syncerror: message.error,
        unread: message.unread,
        deleted: isEmpty,
        'chat-item__highlighted': message.highlighted
      }"
      role="listitem"
      @touchstart="onTouchstart"
      @touchmove="onTouchmove"
      @touchend="onTouchend"
    >
      <div class="chat-item__container">
        <div class="chat-item__aside">
          <div class="chat-item__avatar">
            <avatar :user="message.fromUser" />
          </div>
        </div>
        <chat-item-actions
          v-if="isLoggedIn"
          :message="message"
          :use-compact-styles="useCompactStyles"
        />
        <div class="chat-item__content">
          <div class="chat-item__details">
            <div class="chat-item__from">{{ message.fromUser.displayName }}</div>
            <div class="chat-item__username">@{{ message.fromUser.username }}</div>
            <a
              class="chat-item__time"
              :href="permalinkUrl"
              :title="sentTimeFormattedFull"
              @click.stop.prevent="setPermalinkLocation"
              >{{ sentTimeFormatted }}</a
            >
            <loading-spinner v-if="message.loading" class="message-loading-icon" />
          </div>
          <textarea
            v-if="isBeingEdited"
            ref="chatItemEditTextArea"
            v-model="editMessageModel"
            class="trpChatInput"
            @keydown.enter.prevent="updateMessage()"
            @keydown.esc="cancelEdit()"
            @blur="cancelEditOnTouchDevice()"
          ></textarea>
          <div v-else-if="message.html" class="chat-item__text" v-html="message.html"></div>
          <div v-else class="chat-item__text">
            {{ message.text }}
            <i v-if="isEmpty">This message was deleted</i>
          </div>
        </div>
      </div>
    </div>
  </intersect>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'trp3Chat';
@import (reference) 'colors';
@import (reference) 'typography';
@import (reference) 'dark-theme';
@import (reference) '../styles/variables';
@import (reference) 'public/js/views/chat/chatItemView.less';

@item-detail-margin: 2px;

.chat-item__details {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  // inspired by https://stackoverflow.com/questions/20626685/better-way-to-set-distance-between-flexbox-items
  margin-left: -@item-detail-margin;
  margin-right: -@item-detail-margin;
}
.chat-item__from,
.chat-item__username,
.chat-item__time {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-left: @item-detail-margin;
  margin-right: @item-detail-margin;
}

.compact .chat-item__container {
  padding-left: 0px;
}

.compact .chat-item__content {
  margin-left: @thread-chat-item-compact-left-margin;
  margin-right: @thread-message-feed-padding;
}

.dark-theme .chat-item__text {
  color: @dark-theme-chat-main-text-color;
}

.trpChatInput {
  display: block;
  width: 100%;
  outline: none;
  padding-left: 5px;
  border: 0px;
  resize: none;
  margin: 1px;
  box-shadow: none;
  min-height: 44px;
  outline: 1px solid @trpLightBlue;
  line-height: 1.5;
}

.message-loading-icon {
  margin: 4px;
}
</style>
