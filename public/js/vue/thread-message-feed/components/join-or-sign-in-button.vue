<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import LoadingSpinner from '../../components/loading-spinner.vue';
import userCanJoinRoom from 'gitter-web-shared/rooms/user-can-join-room';
import makeRoomProviderSentence from 'gitter-web-shared/rooms/make-room-provider-sentence';

export default {
  name: 'JoinOrSignInButton',

  components: { LoadingSpinner },

  computed: {
    ...mapGetters(['displayedRoom']),
    ...mapState(['isLoggedIn', 'user', 'joinRoomRequest']),
    allowedToJoin() {
      return this.isLoggedIn && userCanJoinRoom(this.user.providers, this.displayedRoom.providers);
    },
    reasonWhyUserCannotJoin() {
      return makeRoomProviderSentence(this.displayedRoom.providers);
    }
  },
  methods: {
    ...mapActions(['joinRoom'])
  }
};
</script>

<template>
  <footer class="chat-input chat-input-nli">
    <!-- #welcome-message Flows out to legacy backbone router to show welcome message modal -->
    <div v-if="allowedToJoin" class="join-button-container">
      <button class="chat-input__btn" @click="joinRoom()">
        Join room
      </button>
      <span v-if="joinRoomRequest.error" class="error-text error-box">
        Joining room failed: {{ joinRoomRequest.error.message }}
      </span>
      <loading-spinner v-if="joinRoomRequest.loading" class="join-room-loading-icon" />
    </div>
    <div v-else-if="isLoggedIn" class="not-allowed-to-join">
      {{ reasonWhyUserCannotJoin }}
    </div>
    <a v-else href="/login?action=login" target="_top" class="chat-input__btn">
      Sign in to start talking
    </a>
  </footer>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'colors';
@import (reference) 'dark-theme';
@import (reference) 'mixins/text/default-fonts';
@import 'public/js/views/chat/chatInputView.less';

.chat-input-nli .chat-input__btn {
  display: none;
  .mobile & {
    display: block;
  }
}

.join-button-container {
  display: flex;
  align-items: center;
}

.error-box,
.join-room-loading-icon {
  margin-left: 10px;
}

.not-allowed-to-join {
  font-weight: 600;
  color: #999;
  margin: 23px 0;
}
</style>
