<script>
import { mapState, mapActions } from 'vuex';
import appEvents from '../../../utils/appevents';

import LoadingSpinner from '../../components/loading-spinner.vue';
import GroupAndRoomInputSection from './group-and-room-input-section.vue';
import RepoSelectSection from './repo-select-section.vue';
import SecuritySelectSection from './security-select-section.vue';
import CreateRoomExtraOptions from './create-room-extra-options.vue';

export default {
  name: 'CreateRoomView',
  components: {
    LoadingSpinner,
    GroupAndRoomInputSection,
    RepoSelectSection,
    SecuritySelectSection,
    CreateRoomExtraOptions
  },
  computed: {
    ...mapState({
      roomSubmitRequest: state => state.createRoom.roomSubmitRequest
    })
  },
  methods: {
    ...mapActions({
      submitRoom: 'createRoom/submitRoom'
    }),
    onCloseClicked() {
      appEvents.trigger('destroy-create-room-view');
    }
  }
};
</script>

<template>
  <div ref="root" class="root modal-backdrop js-create-room-view-root" @click="onCloseClicked">
    <div ref="modal" class="modal--default" @click.stop>
      <header class="modal--default__header">
        <h1 class="modal--default__header__title js-modal-title-text">Create a room</h1>
        <span
          ref="closeButton"
          class="modal--default__header__icon icon-cancel-circle"
          data-action="close"
          @click="onCloseClicked"
        ></span>
      </header>

      <section class="modal--default__content">
        <p class="create-room-intro-text">
          <a
            href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/rooms.md"
            target="_blank"
            >Gitter rooms</a
          >
          exist inside of
          <a
            href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/communities.md"
            target="_blank"
            >communities</a
          >. For example, if you want to end up with the URI:
          <strong>https://gitter.im/badger/webapp</strong>, first create a
          <strong>badger</strong> community, then create a <strong>webapp</strong> room under that
          community. You can create many rooms under your community.
        </p>

        <p class="create-room-intro-text">
          If you need to create a community to put your rooms in first, jump to the
          <a href="#createcommunity">community create flow</a>
        </p>

        <hr />

        <group-and-room-input-section />

        <repo-select-section />

        <hr />

        <security-select-section />

        <create-room-extra-options />

        <section v-if="roomSubmitRequest.error" class="error-section">
          {{ roomSubmitRequest.error }}
        </section>
      </section>

      <footer class="modal--default__footer-wrapper">
        <div class="modal--default__footer">
          <button
            ref="submitButton"
            class="modal--default__footer__btn pull-right"
            :disabled="roomSubmitRequest.loading"
            @click="submitRoom"
          >
            <loading-spinner v-if="roomSubmitRequest.loading" /> Create
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) 'base-zindex-levels';

.root {
  box-sizing: border-box;

  z-index: @zIndexCommunityCreate;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;

  overflow-x: hidden;
  overflow-y: auto;

  display: flex;
  justify-content: center;
  align-items: center;

  &::v-deep *,
  &::v-deep *:before,
  &::v-deep *:after {
    box-sizing: inherit;
  }
}

a {
  text-decoration: underline;
}

.create-room-intro-text {
  margin-top: 0;
  margin-bottom: 0.8em;
}

.error-section {
  color: @error-red;
}
</style>
