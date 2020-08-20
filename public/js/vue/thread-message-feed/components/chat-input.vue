<script>
import { mapState, mapActions } from 'vuex';
import Avatar from './avatar.vue';
import isTouch from '../../../utils/is-touch';

export default {
  name: 'ChatInput',
  components: {
    Avatar
  },
  props: {
    user: {
      type: Object,
      required: true
    },
    roomMember: {
      type: Boolean,
      default: true
    },
    isMobile: {
      type: Boolean,
      dafault: false
    },
    thread: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState({
      draftMessage: state => state.threadMessageFeed.draftMessage,
      messageEditState: state => state.threadMessageFeed.messageEditState
    }),
    draftMessageModel: {
      get() {
        return this.draftMessage;
      },
      set(newDraftMessage) {
        this.updateDraftMessage(newDraftMessage);
      }
    },
    placeholder() {
      return this.isMobile
        ? 'Touch here to type a chat message.'
        : 'Click here to type a chat message.';
    }
  },
  watch: {
    messageEditState: function(newState, oldState) {
      // After the message is done being edited, go back to focusing the thread message input
      if (oldState.id && !newState.id) {
        this.$refs.chatInputTextArea.focus();
      }
    },
    draftMessage: function(newDraft) {
      if (newDraft === '') {
        this.shrink();
      }
    }
  },
  mounted() {
    // we don't ever want to open virtual (touch) keyboard for user
    if (!isTouch()) {
      this.$refs.chatInputTextArea.focus();
    }
    this.expandIfNeeded();
  },
  updated() {
    // if something programatically changes draft, we'll focus on the input
    // e.g. when user selects "Quote" from the chat item context menu
    // but we don't ever want to open virtual (touch) keyboard for user
    if (!isTouch()) {
      this.$refs.chatInputTextArea.focus();
    }
    this.expandIfNeeded();
  },
  methods: {
    ...mapActions({
      sendMessage: 'threadMessageFeed/sendMessage',
      updateDraftMessage: 'threadMessageFeed/updateDraftMessage',
      editLastMessageAction: 'threadMessageFeed/editLastMessage'
    }),
    editLastMessage() {
      if (!this.draftMessage) this.editLastMessageAction();
    },
    shrink() {
      this.$refs.chatInputTextArea.style.height = '';
    },
    expandIfNeeded() {
      const maxHeight = window.innerHeight / 2;
      const newHeight = Math.min(this.$refs.chatInputTextArea.scrollHeight, maxHeight);
      // inspired by https://medium.com/@adamorlowskipoland/vue-auto-resize-textarea-3-different-approaches-8bbda5d074ce
      this.$refs.chatInputTextArea.style.height = 'auto';
      this.$refs.chatInputTextArea.style.height = `${newHeight}px`;
    }
  }
};
</script>

<template>
  <footer id="chat-input-wrapper" class="chat-input" :class="{ thread }">
    <div v-if="user" class="chat-input__container">
      <div v-if="roomMember" class="chat-input__area">
        <div class="chat-input__avatar">
          <avatar :user="user" />
        </div>
        <div id="chat-input-box-region" class="chat-input-box__region">
          <form class="chat-input__box" name="chat">
            <!--
              the @keyup.up is keyUP on purpose. See the issues with alternatives:
              - @keydown.up -> would open the message edit textarea and the keyup.up event would happen in the newly opened edit message textarea which would put the cursor at the start
              - @keydown.up.prevent -> if there was multiline text, we couldn't use UP arrow to move the cursor
            -->
            <textarea
              ref="chatInputTextArea"
              v-model="draftMessageModel"
              class="chat-input__text-area"
              name="chat"
              autocomplete="off"
              :placeholder="placeholder"
              autocorrect="off"
              autofocus
              maxlength="4096"
              @keydown.enter.prevent="sendMessage()"
              @keyup.up="editLastMessage()"
            ></textarea>
          </form>
        </div>
      </div>
      <!-- TODO: Add Join room button for main thread feed + mobile view -->
    </div>
  </footer>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'colors';
@import (reference) 'dark-theme';
@import (reference) 'mixins/text/default-fonts';
@import 'public/js/views/chat/chatInputView.less';
@import (reference) '../styles/variables';

.thread.chat-input {
  .dark-theme & {
    background-color: @dark-theme-thread-message-feed-bg-color;
  }
}

.thread .chat-input__container {
  margin-left: @thread-message-feed-padding;
}

.thread .chat-input__box {
  margin-left: @avatarWidth + @thread-message-feed-padding;
  margin-right: @thread-message-feed-padding;
}

.thread .chat-input__text-area {
  .dark-theme & {
    background-color: @dark-theme-thread-message-feed-bg-color;
    color: @dark-theme-chat-main-text-color;
  }
}
</style>
