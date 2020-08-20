<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import isGitlabSecurityDescriptorType from 'gitter-web-shared/is-gitlab-security-descriptor-type';

import LoadingSpinner from '../../components/loading-spinner.vue';
import iconClose from '../../../../images/svg/close.svg';

import {
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB,
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB
} from '../constants';

export default {
  name: 'StepMain',
  components: {
    LoadingSpinner
  },
  iconClose,
  computed: {
    ...mapState({
      communityName: state => state.createCommunity.communityName,
      communityNameError: state => state.createCommunity.communityNameError,
      communitySlug: state => state.createCommunity.communitySlug,
      communitySlugError: state => state.createCommunity.communitySlugError,
      selectedBackingEntity: state => state.createCommunity.selectedBackingEntity,
      allowBadger: state => state.createCommunity.allowBadger,
      communitySubmitRequest: state => state.createCommunity.communitySubmitRequest
    }),
    ...mapGetters({
      hasProvider: 'hasProvider',
      identityUsername: 'identityUsername'
    }),
    communityNameModel: {
      get() {
        return this.communityName;
      },
      set(newCommunityName) {
        this.setCommunityName(newCommunityName);
      }
    },
    communitySlugModel: {
      get() {
        return this.communitySlug;
      },
      set(newCommunitySlug) {
        this.updateCommunitySlug(newCommunitySlug);
      }
    },
    allowBadgerModel: {
      get() {
        return this.allowBadger;
      },
      set(checked) {
        this.setAllowBadger(checked);
      }
    },
    isGitlabSelected() {
      return isGitlabSecurityDescriptorType(this.selectedBackingEntity.type);
    },
    isGithubSelected() {
      const type = this.selectedBackingEntity.type;
      return type === 'GH_ORG' || type === 'GH_REPO' || type === 'GH_USER';
    },
    isRepoSelected() {
      return this.selectedBackingEntity.type === 'GH_REPO';
    }
  },

  methods: {
    ...mapActions({
      moveToStep: 'createCommunity/moveToStep',
      setCommunityName: 'createCommunity/setCommunityName',
      updateCommunitySlug: 'createCommunity/updateCommunitySlug',
      associateUserToCommunity: 'createCommunity/associateUserToCommunity',
      clearBackingEntity: 'createCommunity/clearBackingEntity',
      setAllowBadger: 'createCommunity/setAllowBadger',
      submitCommunity: 'createCommunity/submitCommunity'
    }),
    onMoveToBackingEntityGitlabStepLinkClicked() {
      this.moveToStep(CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB);
    },
    onMoveToBackingEntityGithubStepLinkClicked() {
      this.moveToStep(CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB);
    },
    onChangeBackingEntityClicked() {
      if (this.isGitlabSelected) {
        this.moveToStep(CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB);
      } else if (this.isGithubSelected) {
        this.moveToStep(CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB);
      }
    },
    onClearAssociationClicked() {
      this.clearBackingEntity();
    },
    onCommunitySubmit() {
      this.submitCommunity();
    }
  }
};
</script>

<template>
  <div>
    <h1 class="primary-community-heading">
      Create community
    </h1>

    <h2 class="secondary-community-heading">
      Think big,<br />
      start small, grow fast
    </h2>

    <input
      ref="communityNameInput"
      v-model="communityNameModel"
      class="primary-community-name-input"
      placeholder="your community name"
      pattern=".+"
      maxlength="80"
      required
    />
    <div v-if="communityNameError" class="error-text error-box">
      {{ communityNameError }}
    </div>

    <div class="slug-input-wrapper">
      <span class="slug-input-prefix">gitter.im/</span>
      <input
        ref="communitySlugInput"
        v-model="communitySlugModel"
        class="slug-input"
        placeholder="your-community-uri"
        pattern="[a-zA-Z0-9\-_]+"
        maxlength="80"
        required=""
      />
    </div>
    <div v-if="communitySlugError" class="error-text error-box">
      {{ communitySlugError }}
    </div>

    <p v-if="hasProvider('gitlab') && !selectedBackingEntity" class="backing-entity-prompt-copy">
      do you want to start a community for one of your
      <a
        ref="backingEntityPromptGitlabLink"
        href="#0"
        data-disable-routing="1"
        @click.prevent="onMoveToBackingEntityGitlabStepLinkClicked"
      >
        GitLab groups/projects?
      </a>
    </p>

    <p v-if="hasProvider('github') && !selectedBackingEntity" class="backing-entity-prompt-copy">
      do you want to start a community for one of your
      <a
        ref="backingEntityPromptGithubLink"
        href="#0"
        data-disable-routing="1"
        @click.prevent="onMoveToBackingEntityGithubStepLinkClicked"
      >
        GitHub orgs/repos?
      </a>
    </p>

    <p v-if="(hasProvider('gitlab') || hasProvider('github')) && !selectedBackingEntity">
      do you want to start a communtiy for your
      <a
        ref="backingUserPromptGithubLink"
        href="#0"
        data-disable-routing="1"
        @click.prevent="associateUserToCommunity"
      >
        <template v-if="hasProvider('gitlab')"
          >GitLab</template
        >
        <template v-else-if="hasProvider('github')"
          >GitHub</template
        >
        @{{ identityUsername }} user
      </a>
    </p>

    <div v-if="selectedBackingEntity" class="backing-entity-copy">
      Associated with
      <div class="backing-entity-copy-main">
        <a :href="selectedBackingEntity.absoluteUri" target="_blank" data-disable-routing="1">
          <i v-if="isGithubSelected" class="icon-github-circled"></i>
          <i v-if="isGitlabSelected" class="icon-gitlab"></i>
          <span>{{ selectedBackingEntity.uri }}</span>
        </a>
        <button
          ref="clearAssociationButton"
          class="clear-association-button"
          @click="onClearAssociationClicked"
        >
          <span class="clear-association-icon" v-html="$options.iconClose"></span>
        </button>
        <p v-if="isRepoSelected">
          <input
            ref="allowBadgerCheckbox"
            type="checkbox"
            v-model="allowBadgerModel"
            id="community-create-associated-project-badger-option-input"
            checked
          />
          <label for="community-create-associated-project-badger-option-input">
            Add badge to README on GitHub (via pull request)
          </label>
        </p>
      </div>
      <button
        ref="changeBackingEntityLink"
        class="secondary-button-caribbean"
        @click.prevent="onChangeBackingEntityClicked"
      >
        change
      </button>
    </div>

    <div class="submit-button-container">
      <loading-spinner v-if="communitySubmitRequest.loading" />
      <div v-else-if="communitySubmitRequest.error" class="error-text error-box">
        Error submitting community: {{ communitySubmitRequest.error }}.
      </div>
      <button
        ref="submitButton"
        type="submit"
        class="submit-button button-caribbean"
        @click="onCommunitySubmit"
      >
        Submit
      </button>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) '../styles/shared';

a {
  color: @caribbean;
  text-decoration: underline;
}

.primary-community-heading {
  .primary-community-heading();
}

.secondary-community-heading {
  .secondary-community-heading();
}

.primary-community-name-input {
  .primary-bare-input();

  margin-top: 1em;
}

.slug-input-wrapper {
  display: flex;
  align-items: baseline;
}

.slug-input-prefix {
  margin-right: 0.5rem;
  font-weight: 300;
}

.slug-input {
  .secondary-bare-input();

  flex: 1;
  margin-top: 1em;
}

.backing-entity-prompt-copy {
  margin-top: 1em;
}

.backing-entity-copy {
  display: flex;
  align-items: flex-start;

  margin-top: 1em;
}

.backing-entity-copy-main {
  flex: 1;
  padding-left: 6px;
}

.backing-entity-link {
}

.clear-association-button {
  background: none;
  border: 0;
}

.clear-association-icon {
  &::v-deep > svg {
    width: 1em;
    height: 1em;

    fill: @base-text-color;
  }
}

.submit-button-container {
  display: flex;
  justify-content: flex-end;

  margin-top: 2em;
}
</style>
