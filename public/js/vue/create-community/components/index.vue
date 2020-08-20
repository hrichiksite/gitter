<script>
import { mapState, mapGetters } from 'vuex';
import appEvents from '../../../utils/appevents';

import iconClose from '../../../../images/svg/close.svg';
import StepMain from './step-main.vue';
import StepBackingEntity from './step-backing-entity.vue';

import {
  CREATE_COMMUNITY_STEP_MAIN,
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB,
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB
} from '../constants';

export default {
  name: 'CreateCommunityView',
  components: {
    StepMain,
    StepBackingEntity
  },
  iconClose,
  computed: {
    ...mapState({
      currentStep: state => state.createCommunity.currentStep
    }),
    ...mapGetters({
      gitlabGroups: 'createCommunity/gitlabGroups',
      gitlabProjects: 'createCommunity/gitlabProjects',
      githubOrgs: 'createCommunity/githubOrgs',
      githubRepos: 'createCommunity/githubRepos'
    }),
    isOnMainStep() {
      return this.currentStep === CREATE_COMMUNITY_STEP_MAIN;
    },
    isOnBackingEntityGitlabStep() {
      return this.currentStep === CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB;
    },
    isOnBackingEntityGithubStep() {
      return this.currentStep === CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB;
    }
  },
  methods: {
    onCloseClicked() {
      appEvents.trigger('destroy-create-community-view');
    }
  }
};
</script>

<template>
  <div ref="root" class="root js-create-community-view-root">
    <div class="container">
      <button ref="closeButton" class="close-button" @click="onCloseClicked">
        <span class="close-icon" v-html="$options.iconClose"></span>
      </button>

      <step-main v-if="isOnMainStep" />

      <step-backing-entity
        v-if="isOnBackingEntityGitlabStep"
        org-name="groups"
        :org-list="gitlabGroups"
        repo-name="projects"
        :repo-list="gitlabProjects"
      />

      <step-backing-entity
        v-if="isOnBackingEntityGithubStep"
        org-name="orgs"
        :org-list="githubOrgs"
        repo-name="repos"
        :repo-list="githubRepos"
      >
        <template v-slot:notes>
          <p>
            If you are missing some orgs, you will need to manually grant access on a per-org basis.
            See
            <a
              href="https://gitlab.com/gitlab-org/gitter/webapp/blob/develop/docs/faq.md#why-isnt-my-github-organisation-or-repos-appearing"
              target="_blank"
              >this article</a
            >
            for more info.
          </p>
        </template>
      </step-backing-entity>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) 'base-zindex-levels';
@import (reference) '../styles/shared';

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

  background-color: #151236;
  /*background-image: url('../images/home/banner.jpg');*/
  background-repeat: no-repeat;
  background-size: cover;

  color: @base-text-color;

  &::v-deep *,
  &::v-deep *:before,
  &::v-deep *:after {
    box-sizing: inherit;
  }
}

.container {
  position: relative;
  max-width: 840px;

  margin-left: 200px;
  padding-top: 4em;
  padding-left: 20px;
  padding-bottom: 8em;
  padding-right: 20px;

  @media (max-width: 1040px) {
    margin-left: 0;
  }
}

.close-button {
  position: absolute;
  top: 0;
  right: 0;

  padding: 20px;

  background: none;
  border: 0;
}

.close-icon {
  &::v-deep > svg {
    width: 36px;
    height: 36px;

    fill: @base-text-color;
  }
}
</style>
