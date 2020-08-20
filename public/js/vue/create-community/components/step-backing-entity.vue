<script>
import { mapState, mapActions } from 'vuex';
import EntityList from './entity-list.vue';
import {
  CREATE_COMMUNITY_STEP_MAIN,
  CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE,
  CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE
} from '../constants';

export default {
  name: 'StepBackingEntity',
  components: {
    EntityList
  },
  props: {
    orgName: {
      type: String,
      required: true
    },
    orgList: {
      type: Array,
      required: true,
      default: () => {
        return [];
      }
    },
    repoName: {
      type: String
    },
    repoList: {
      type: Array
    }
  },
  computed: {
    ...mapState({
      tabState: state => state.createCommunity.entityTypeTabState,
      orgsRequest: state => state.createCommunity.orgsRequest,
      reposRequest: state => state.createCommunity.reposRequest
    }),
    isOrgTabState() {
      return this.tabState === CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE;
    },
    isRepoTabState() {
      return this.tabState === CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE;
    }
  },

  methods: {
    ...mapActions({
      moveToStep: 'createCommunity/moveToStep',
      setEntityTypeTabState: 'createCommunity/setEntityTypeTabState'
    }),
    onOrgTabClicked() {
      this.setEntityTypeTabState(CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE);
    },
    onRepoTabClicked() {
      this.setEntityTypeTabState(CREATE_COMMUNITY_ENTITY_TYPE_TAB_REPOS_STATE);
    },
    onBackClicked() {
      this.moveToStep(CREATE_COMMUNITY_STEP_MAIN);
    }
  }
};
</script>

<template>
  <div>
    <h2 class="secondary-community-heading">
      Use any of your {{ orgName }} or {{ repoName }} to create a community
    </h2>

    <ul class="tabbed-navigation-list scroller">
      <li class="tabbed-navigation-list-item">
        <button
          ref="orgTabButton"
          class="tabbed-navigation-button"
          :class="{
            active: isOrgTabState
          }"
          @click="onOrgTabClicked"
        >
          {{ orgName }}
        </button>
      </li>
      <li v-if="repoName" class="tabbed-navigation-list-item">
        <button
          ref="repoTabButton"
          class="tabbed-navigation-button"
          :class="{
            active: isRepoTabState
          }"
          @click="onRepoTabClicked"
        >
          {{ repoName }}
        </button>
      </li>
    </ul>

    <entity-list
      v-if="isOrgTabState"
      :display-name="orgName"
      :list="orgList"
      :loading="orgsRequest.loading"
      :error="orgsRequest.error"
    />
    <entity-list
      v-if="repoName && repoList && isRepoTabState"
      :display-name="repoName"
      :list="repoList"
      :loading="reposRequest.loading"
      :error="reposRequest.error"
    />

    <slot name="notes"></slot>

    <button ref="backButton" class="back-button secondary-button-clouds" @click="onBackClicked">
      Back
    </button>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) '../styles/shared';

a {
  color: @caribbean;
  text-decoration: underline;
}

.secondary-community-heading {
  .secondary-community-heading();
}

.tabbed-navigation-list {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;

  margin-top: 1em;
  margin-bottom: 1em;
}

.tabbed-navigation-list-item {
  &:first-child {
    & > .tabbed-navigation-button {
      padding-left: 0;
    }
  }

  & + & {
    border-left: 3px solid rgba(255, 255, 255, 0.4);
  }
}

.tabbed-navigation-button {
  display: block;
  padding: 0.2em 0.75em;

  background-color: transparent;
  border: 0;

  color: fade(@base-text-color, 40%);
  font-size: @primary-input-font-size;
  line-height: 1;
  font-weight: 300;

  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover,
  &:focus {
    color: @base-text-color;
  }
  &:focus {
    background: rgba(255, 255, 255, 0.08);
    outline: none;
  }

  &.active {
    color: @ruby;
  }
}

.back-button {
  padding-left: 0;
}
</style>
