<script>
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
import { types } from '../store';
import avatars from 'gitter-web-avatars';

import LoadingSpinner from '../../components/loading-spinner.vue';
import SelectDropdown from './select-dropdown.vue';

export default {
  name: 'RepoSelectSection',
  components: {
    LoadingSpinner,
    SelectDropdown
  },
  computed: {
    ...mapState({
      repoFilterText: state => state.createRoom.repoFilterText,
      reposRequest: state => state.createRoom.reposRequest
    }),
    ...mapGetters({
      hasProvider: 'hasProvider',
      hasGithubPrivateRepoScope: 'createRoom/hasGithubPrivateRepoScope',
      displayedFilteredRepos: 'createRoom/displayedFilteredRepos',
      selectedRepo: 'createRoom/selectedRepo'
    }),

    defaultAvatar() {
      return avatars.getDefault();
    }
  },
  methods: {
    ...mapActions({
      setSelectedRepoId: 'createRoom/setSelectedRepoId'
    }),
    ...mapMutations({
      setRepoFilterText: `createRoom/${types.SET_REPO_FILTER_TEXT}`
    }),

    onRepoSelected(repo) {
      this.setSelectedRepoId(repo ? repo.id : null);
    },

    isRepoGitlab(repo) {
      const type = repo.type;
      return type === 'GL_GROUP' || type === 'GL_PROJECT';
    },
    isRepoGithub(repo) {
      const type = repo.type;
      return type === 'GH_ORG' || type === 'GH_REPO';
    }
  }
};
</script>

<template>
  <section>
    <div class="repo-select-section">
      <h3 class="section-heading">
        <label>Repo association (optional)</label>
      </h3>

      <select-dropdown
        :items="displayedFilteredRepos"
        :selectedItem="selectedRepo"
        :filterText="repoFilterText"
        filterPlaceholder="Filter repos"
        :loading="reposRequest.loading"
        :error="reposRequest.error"
        @filterInput="setRepoFilterText"
        @itemSelected="onRepoSelected"
      >
        <template v-slot:button-content>
          <div v-if="selectedRepo" class="select-dropdown-displayed-item">
            <img :src="selectedRepo.avatar_url || defaultAvatar" class="select-dropdown-avatar" />
            <i v-if="isRepoGithub(selectedRepo)" class="repo-type-icon icon-github-circled"></i>
            <i v-if="isRepoGitlab(selectedRepo)" class="repo-type-icon icon-gitlab"></i>
            {{ selectedRepo.uri }}
          </div>
          <div v-else>
            Select repo (optional)
          </div>
          <loading-spinner v-if="reposRequest.loading" />
        </template>

        <template v-slot:item-content="item">
          <img :src="item.avatar_url || defaultAvatar" class="select-dropdown-avatar" />
          <i v-if="isRepoGithub(item)" class="repo-type-icon icon-github-circled"></i>
          <i v-if="isRepoGitlab(item)" class="repo-type-icon icon-gitlab"></i>
          {{ item.uri }}
        </template>
      </select-dropdown>

      <template v-if="hasProvider('github')">
        <p v-if="hasGithubPrivateRepoScope" class="repo-select-information">
          Private repo access is granted. If you don't see your repo listed, see our documentation
          section on
          <a
            href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/faq.md#why-isnt-my-github-organisation-or-repos-appearing"
            target="_blank"
            >"Why isn't my GitHub organisation or repos appearing?"</a
          >.
        </p>
        <p v-else class="repo-select-information">
          If you don't see your repo listed, try
          <a href="/login/upgrade?scopes=repo">allowing private repo access</a>. Also see our
          documentation section on
          <a
            href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/faq.md#why-isnt-my-github-organisation-or-repos-appearing"
            target="_blank"
            >"Why isn't my GitHub organisation or repos appearing?"</a
          >.
        </p>
      </template>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import (reference) '../styles/shared.less';

a {
  text-decoration: underline;
}

.section-heading {
  .section-heading();
}

.select-dropdown-displayed-item {
  .select-dropdown-displayed-item();
}

.select-dropdown-avatar {
  .select-dropdown-avatar();
}

.repo-select-section {
}

.repo-type-icon {
  margin-right: 0.25em;
}

.repo-select-information {
  margin-top: 0.5em;
}
</style>
