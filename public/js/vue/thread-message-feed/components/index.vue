<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import ThreadHeader from './thread-header.vue';
import ChatInput from './chat-input.vue';
import ChatItem from './chat-item.vue';
import LoadingSpinner from '../../components/loading-spinner.vue';
import Intersect from './intersect';
import JoinOrSignInButton from './join-or-sign-in-button.vue';

export default {
  name: 'ThreadMessageFeed',
  components: {
    ChatInput,
    ThreadHeader,
    LoadingSpinner,
    ChatItem,
    Intersect,
    JoinOrSignInButton
  },
  computed: {
    ...mapGetters({
      parentMessage: 'threadMessageFeed/parentMessage',
      childMessages: 'threadMessageFeed/childMessages',
      displayedRoom: 'displayedRoom'
    }),
    ...mapState({
      isVisible: state => state.threadMessageFeed.isVisible,
      childMessagesRequest: state => state.threadMessageFeed.childMessagesRequest,
      user: 'user',
      darkTheme: 'darkTheme'
    })
  },
  methods: {
    ...mapActions({
      fetchOlderMessages: 'threadMessageFeed/fetchOlderMessages',
      fetchNewerMessages: 'threadMessageFeed/fetchNewerMessages'
    })
  }
};
</script>

<template>
  <div
    class="js-thread-message-feed-root root"
    :class="{ opened: isVisible, 'dark-theme': darkTheme }"
  >
    <section v-if="isVisible" class="body">
      <thread-header />
      <section
        v-if="parentMessage"
        class="content"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        <div class="chat-messages" role="list">
          <chat-item :message="parentMessage" :use-compact-styles="true" />
          <div v-if="childMessagesRequest.error" class="error-text error-box">
            Error: Thread messages can't be fetched.
          </div>
          <div v-else-if="childMessagesRequest.loading" class="loading-message">
            Loading thread <loading-spinner />
          </div>
          <intersect @enter="fetchOlderMessages()">
            <div></div>
          </intersect>
          <chat-item
            v-for="message in childMessages"
            :key="message.id"
            :message="message"
            :use-compact-styles="true"
          />
          <intersect @enter="fetchNewerMessages()">
            <div></div>
          </intersect>
        </div>
        <chat-input v-if="displayedRoom && displayedRoom.roomMember" :user="user" thread />
        <join-or-sign-in-button v-else />
      </section>
      <section v-else class="content">
        <span class="error-text error-box">
          Error: The message for this thread is unavailable. It was probably deleted.
        </span>
      </section>
    </section>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) 'trp3Vars';
@import (reference) 'components/right-toolbar';
@import (reference) 'dark-theme';
@import (reference) '../styles/variables';

@thread-panel-max-width: 600px;

.root {
  .right-toolbar-position();

  display: none;
  &.opened {
    .mobile & {
      position: absolute;
      z-index: 1001;
      width: 100%;
    }
    display: flex;
  }
  /*
  The TMF width changes between 300px and 600px boundaries.
  Within this boundary it tries to be 40% of the space taken by
  both panels (MMF - 60%, TMF - 40%)
  */
  min-width: @right-toolbar-full-width;
  max-width: @thread-panel-max-width;
  width: 40%;

  color: @trpDarkGrey;
  text-align: left;

  box-sizing: border-box;
  &::v-deep *,
  &::v-deep *:before,
  &::v-deep *:after {
    box-sizing: inherit;
  }
}

.body {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  background-color: @main-application-bg-color;
  border-left: 1px solid @menu-border-color;
  .dark-theme & {
    background-color: @dark-theme-thread-message-feed-bg-color;
    border-left-color: @dark-theme-thread-message-feed-left-border-color;
  }
}

.content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.error-box {
  margin: @thread-message-feed-padding;
  .chat-messages & {
    margin-left: @thread-chat-item-compact-left-margin + @thread-message-feed-padding;
  }
}

.loading-message {
  margin-left: @thread-message-feed-padding;
  margin-right: @thread-message-feed-padding;
  margin-top: 30px;
  width: 100%;
  text-align: center;
}

.chat-messages {
  width: 100%;
  display: inline-block;
  overflow: auto;
  flex-grow: 1;
}
</style>
