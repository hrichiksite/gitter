<script>
import { mapState, mapMutations } from 'vuex';
import { types } from '../store';

export default {
  name: 'SecuritySelectSection',

  computed: {
    ...mapState({
      roomSecurity: state => state.createRoom.roomSecurity
    }),

    roomSecurityModel: {
      get() {
        return this.roomSecurity;
      },
      set(newRoomSecurity) {
        this.setRoomSecurity(newRoomSecurity);
      }
    }
  },
  methods: {
    ...mapMutations({
      setRoomSecurity: `createRoom/${types.SET_ROOM_SECURITY}`
    })
  }
};
</script>

<template>
  <section class="security-select-section">
    <ul class="security-list">
      <li class="security-list-item">
        <input
          ref="publicSecurityRadio"
          v-model="roomSecurityModel"
          type="radio"
          class="security-list-item-radio"
          id="public-security"
          name="security"
          value="PUBLIC"
        />
        <label class="security-list-item-label" for="public-security">
          <i class="security-list-item-icon octicon octicon-globe"></i>
          <span>
            <span class="security-list-item-name">Public</span>
            <br />
            <span>
              Anyone in the world can join.
            </span>
          </span>
        </label>
      </li>
      <li class="security-list-item">
        <input
          ref="privateSecurityRadio"
          v-model="roomSecurityModel"
          type="radio"
          class="security-list-item-radio"
          id="private-security"
          name="security"
          value="PRIVATE"
        />
        <label class="security-list-item-label" for="private-security">
          <i class="security-list-item-icon octicon octicon-lock"></i>
          <span>
            <span class="security-list-item-name">Private</span>
            <br />
            <span>
              Only people added to the room can join.
            </span>
          </span>
        </label>
      </li>
    </ul>
  </section>
</template>

<style lang="less" scoped>
@import (reference) 'colors';

.security-select-section {
  margin-top: 2em;
  margin-bottom: 2em;
}

.security-list {
  margin-left: 0;
  list-style: none;
}

.security-list-item {
  display: flex;
  align-items: baseline;
  margin-bottom: 2rem;
}

.security-list-item-radio {
  margin-right: 1rem;
}

.security-list-item-label {
  display: flex;

  .security-list-item-radio:disabled + & {
    color: fade(@trpDarkGrey, 30%);
  }
}

.security-list-item-icon {
  width: 3rem;
  font-size: 2.5rem;
}

.security-list-item-name {
  font-weight: bold;
}
</style>
