<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import { types } from '../store';
import avatars from 'gitter-web-avatars';

import LoadingSpinner from '../../components/loading-spinner.vue';
import SelectDropdown from './select-dropdown.vue';

export default {
  name: 'GroupAndRoomInputSection',
  components: {
    LoadingSpinner,
    SelectDropdown
  },
  computed: {
    ...mapState({
      groupFilterText: state => state.createRoom.groupFilterText,
      groupsRequest: state => state.createRoom.groupsRequest,
      groupError: state => state.createRoom.groupError,

      roomName: state => state.createRoom.roomName,
      roomNameError: state => state.createRoom.roomNameError,

      reposRequest: state => state.createRoom.reposRequest
    }),
    ...mapGetters({
      displayedFilteredGroups: 'createRoom/displayedFilteredGroups',
      selectedGroup: 'createRoom/selectedGroup'
    }),

    roomNameModel: {
      get() {
        return this.roomName;
      },
      set(newRoomName) {
        this.setRoomName(newRoomName);
      }
    },

    defaultAvatar() {
      return avatars.getDefault();
    }
  },
  methods: {
    ...mapActions({
      setRoomName: 'createRoom/setRoomName',
      setSelectedGroupId: 'createRoom/setSelectedGroupId'
    }),
    ...mapMutations({
      setGroupFilterText: `createRoom/${types.SET_GROUP_FILTER_TEXT}`
    }),
    onGroupSelected(group) {
      this.setSelectedGroupId(group ? group.id : null);
    }
  }
};
</script>

<template>
  <section>
    <div class="name-input-section">
      <div class="group-select-section">
        <h3 class="section-heading">
          <label>Community</label>
        </h3>

        <select-dropdown
          :items="displayedFilteredGroups"
          :selectedItem="selectedGroup"
          :filterText="groupFilterText"
          filterPlaceholder="Filter communities"
          :loading="groupsRequest.loading"
          :error="groupsRequest.error"
          @filterInput="setGroupFilterText"
          @itemSelected="onGroupSelected"
        >
          <template v-slot:button-content>
            <div v-if="selectedGroup" class="select-dropdown-displayed-item">
              <img :src="selectedGroup.avatarUrl || defaultAvatar" class="select-dropdown-avatar" />
              {{ selectedGroup.uri }}
            </div>
            <div v-else>
              Select community
            </div>
            <loading-spinner v-if="groupsRequest.loading" />
          </template>

          <template v-slot:item-content="item">
            <img :src="item.avatarUrl || defaultAvatar" class="select-dropdown-avatar" />
            {{ item.uri }}
          </template>
        </select-dropdown>
      </div>

      <div class="room-name-section">
        <h3 class="section-heading">
          <label for="create-room-name-input">Room name</label>
        </h3>
        <input
          ref="roomNameInput"
          v-model="roomNameModel"
          id="create-room-name-input"
          class="create-room-name-input"
          placeholder="my-awesome-room"
          pattern="[a-zA-Z0-9\-_\.]+"
          required
        />
      </div>
    </div>

    <div class="name-input-error-area">
      {{ groupError }}
      {{ roomNameError }}
      <span v-if="groupsRequest.error">
        Error occured while fetching your communities: {{ groupsRequest.error }}
      </span>
      <span v-if="reposRequest.error">
        Error occured while fetching your repos: {{ reposRequest.error }}
      </span>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) '../styles/shared.less';

.section-heading {
  .section-heading();
}

.select-dropdown-displayed-item {
  .select-dropdown-displayed-item();
}

.select-dropdown-avatar {
  .select-dropdown-avatar();
}

.name-input-section {
  display: flex;
}

.group-select-section,
.room-name-section {
  width: 50%;
}

.group-select-section {
  padding-right: 5px;
}

.create-room-name-input {
  .input-styles();
}

.name-input-error-area {
  min-height: 1em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;

  color: @error-red;
}
</style>
