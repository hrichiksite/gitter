<script>
import { mapState, mapActions } from 'vuex';
import apiClient from '../../../components/api-client';
import appEvents from '../../../utils/appevents';

export default {
  name: 'ExportUserDataView',
  components: {},
  computed: {
    ...mapState({
      user: state => state.user
    }),
    exportBaseUrl() {
      return apiClient.web.uri(`/api_web/export/user/${this.user.id}`);
    }
  },
  methods: {
    ...mapActions({
      // ...
    }),
    onCloseClicked() {
      appEvents.trigger('destroy-export-user-data-view');
    }
  }
};
</script>

<template>
  <div ref="root" class="root modal-backdrop js-export-user-data-view-root" @click="onCloseClicked">
    <div ref="modal" class="modal--default" @click.stop>
      <header class="modal--default__header">
        <h1 class="modal--default__header__title js-modal-title-text">Export user data</h1>
        <span
          ref="closeButton"
          class="modal--default__header__icon icon-cancel-circle"
          data-action="close"
          @click="onCloseClicked"
        ></span>
      </header>

      <section class="modal--default__content">
        <p class="export-rate-limit-note">
          Each export link is rate-limited to once every 3 hours. You will see a "429 - Too many
          requests" error once you reach the limit.
        </p>

        <h3 class="heading">Most relevant data</h3>

        <ul class="export-link-list">
          <li>
            <a :href="`${exportBaseUrl}/me.ndjson`" target="_blank">My user data</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/admin-groups.ndjson`" target="_blank"
              >Communities I admin</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/rooms.ndjson`" target="_blank">My rooms</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/messages.ndjson`" target="_blank">My messages</a>
          </li>
        </ul>

        <hr />

        <h3 class="heading">Other data</h3>

        <ul class="export-link-list">
          <li>
            <a :href="`${exportBaseUrl}/user-settings.ndjson`" target="_blank">User settings</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/identities.ndjson`" target="_blank">Identities</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/group-favourites.ndjson`" target="_blank"
              >Community favourites</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/room-favourites.ndjson`" target="_blank">Room favourites</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/room-last-access-times.ndjson`" target="_blank"
              >Room last access times</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/room-invites.ndjson`" target="_blank"
              >Room invites from others</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/room-sent-invites.ndjson`" target="_blank"
              >Room invites I sent to others</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/room-removed-users.ndjson`" target="_blank"
              >When I was removed or left a room</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/push-notification-devices.ndjson`" target="_blank"
              >Push notification devices</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/uri-lookups.ndjson`" target="_blank"
              >URI lookups for your userId</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/subscriptions.ndjson`" target="_blank"
              >Subscriptions (legacy billing)</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/known-external-access.ndjson`" target="_blank"
              >Cached known external access</a
            >
          </li>
          <li>
            <a :href="`${exportBaseUrl}/fingerprints.ndjson`" target="_blank">Fingerprints</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/oauth-clients.ndjson`" target="_blank">OAuth clients</a>
          </li>
          <li>
            <a :href="`${exportBaseUrl}/oauth-access-tokens.ndjson`" target="_blank"
              >OAuth access tokens</a
            >
          </li>
        </ul>
      </section>

      <footer class="modal--default__footer-wrapper">
        <div class="modal--default__footer"></div>
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

.export-rate-limit-note {
  margin-top: 0;
}

.heading {
  margin-bottom: 0.5em;
}

.export-link-list {
  & > li {
    margin-bottom: 0.3em;
  }
}
</style>
