<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { types } from '../store';

export default {
  name: 'CreateRoomExtraOptions',
  computed: {
    ...mapState({
      roomSecurity: state => state.createRoom.roomSecurity,

      onlyGithubUsers: state => state.createRoom.onlyGithubUsers,
      allowGroupAdmins: state => state.createRoom.allowGroupAdmins,
      allowBadger: state => state.createRoom.allowBadger
    }),
    ...mapGetters({
      selectedGroup: 'createRoom/selectedGroup',
      selectedRepo: 'createRoom/selectedRepo'
    }),

    onlyGitHubUsersModel: {
      get() {
        return this.onlyGithubUsers;
      },
      set(newValue) {
        this.setOnlyGithubUsers(newValue);
      }
    },
    allowGroupAdminsModel: {
      get() {
        return this.allowGroupAdmins;
      },
      set(newValue) {
        this.setAllowGroupAdmins(newValue);
      }
    },
    allowBadgerModel: {
      get() {
        return this.allowBadger;
      },
      set(newValue) {
        this.setAllowBadger(newValue);
      }
    },

    isRoomPublic() {
      return this.roomSecurity === 'PUBLIC';
    },
    isRoomPrivate() {
      return this.roomSecurity === 'PRIVATE';
    },
    isRoomAssociatedWithGitHubRepo() {
      return this.selectedRepo && this.selectedRepo.type === 'GH_REPO';
    },

    canUseAllowGroupAdminsOption() {
      return (
        // If the room is public, then anyone can join the room, no need for this setting at all
        this.isRoomPrivate &&
        // If someone selected a repo, we use admin/member permissions from the repo no matter what and
        // the endpoint will just return a 400 `Validation failed` if we try to allow this
        !this.selectedRepo
      );
    },
    selectedGroupUriHintText() {
      if (this.selectedGroup) {
        return `(${this.selectedGroup.uri})`;
      }
      return '';
    },

    canUseAllowBadgerOption() {
      // The Gitter badger can only work on public GitHub repos
      return this.isRoomAssociatedWithGitHubRepo && !this.selectedRepo.private;
    }
  },
  methods: {
    ...mapMutations({
      setOnlyGithubUsers: `createRoom/${types.SET_ONLY_GITHUB_USERS}`,
      setAllowGroupAdmins: `createRoom/${types.SET_ALLOW_GROUP_ADMINS}`,
      setAllowBadger: `createRoom/${types.SET_ALLOW_BADGER}`
    })
  }
};
</script>

<template>
  <section class="create-room-detail-section">
    <ul class="option-list">
      <li v-if="isRoomAssociatedWithGitHubRepo" class="option-item">
        <input
          ref="onlyGitHubUsersCheckbox"
          v-model="onlyGitHubUsersModel"
          type="checkbox"
          class="option-item-input"
          id="create-room-only-github-users"
        />
        <label class="option-item-label" for="create-room-only-github-users">
          Only GitHub users can join this room
        </label>
      </li>
      <li v-if="canUseAllowGroupAdminsOption" class="option-item">
        <input
          ref="allowGroupAdminsCheckbox"
          v-model="allowGroupAdminsModel"
          type="checkbox"
          class="option-item-input"
          id="create-room-allow-group-admins"
        />
        <label class="option-item-label" for="create-room-allow-group-admins">
          Inherit permissions from the community{{ selectedGroupUriHintText }} and allow other
          community admins to join this room
        </label>
      </li>
      <li v-if="canUseAllowBadgerOption" class="option-item">
        <input
          ref="allowBadgerCheckbox"
          v-model="allowBadgerModel"
          type="checkbox"
          class="option-item-input"
          id="create-room-allow-badger"
        />
        <label class="option-item-label" for="create-room-allow-badger">
          Send PR to add the Gitter badge to your README
        </label>
      </li>
    </ul>
  </section>
</template>

<style lang="less" scoped>
.option-list {
  margin-left: 0;
  list-style: none;
}

.option-item {
  margin-bottom: 1rem;
}

.option-item-input {
  width: 2.5rem;
  box-shadow: none;
}

.option-item-label {
}
</style>
