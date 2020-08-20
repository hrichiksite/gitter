<script>
import { mapState, mapActions } from 'vuex';
const avatars = require('gitter-web-avatars');

import LoadingSpinner from '../../components/loading-spinner.vue';
import { CREATE_COMMUNITY_STEP_MAIN } from '../constants';

export default {
  name: 'EntityList',
  components: {
    LoadingSpinner
  },
  props: {
    displayName: {
      type: String,
      required: true
    },
    list: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean
    },
    error: {
      type: [Error, Boolean]
    }
  },
  computed: {
    ...mapState({
      selectedBackingEntity: state => state.createCommunity.selectedBackingEntity
    }),
    isListEmpty() {
      return this.list.length === 0;
    },
    defaultAvatar() {
      return avatars.getDefault();
    }
  },
  methods: {
    ...mapActions({
      moveToStep: 'createCommunity/moveToStep',
      setSelectedBackingEntity: 'createCommunity/setSelectedBackingEntity'
    }),
    isEntitySelected(entity) {
      return (
        this.selectedBackingEntity &&
        entity.type === this.selectedBackingEntity.type &&
        entity.id === this.selectedBackingEntity.id
      );
    },
    onEntityClicked(entity) {
      // If it is already selected, deselect it
      if (this.isEntitySelected(entity)) {
        this.setSelectedBackingEntity(null);
      } else {
        this.setSelectedBackingEntity(entity);
      }

      this.moveToStep(CREATE_COMMUNITY_STEP_MAIN);
    }
  }
};
</script>

<template>
  <ul class="entity-list" aria-live="polite">
    <li v-if="loading">Loading {{ displayName }}... <loading-spinner /></li>
    <li v-else-if="error">
      <div class="error-text error-box">Error: {{ displayName }} can't be fetched.</div>
    </li>
    <li v-else-if="isListEmpty">No {{ displayName }} available</li>

    <li v-for="item in list" :key="item.id" class="entity-list-item">
      <a
        :href="item.absoluteUri"
        class="entity-list-item-link"
        :class="{
          active: isEntitySelected(item)
        }"
        data-disable-routing="1"
        @click.prevent="onEntityClicked(item)"
      >
        <img :src="item.avatar_url || defaultAvatar" class="entity-list-item-avatar" />
        {{ item.name }}
      </a>
    </li>
  </ul>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) '../styles/shared';

.entity-list {
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-wrap: wrap;

  max-height: 50vh;
  margin: 0;
  padding: 1em;
  list-style: none;

  background-color: rgba(0, 0, 0, 0.2);
}

.entity-list-item {
  width: 50%;

  @media (max-width: 700px) {
    width: 100%;
  }
}

.entity-list-item-link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px;

  border: 1px solid transparent;

  color: @base-text-color;
  text-decoration: none;

  &.active {
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid fadeout(@ruby, 50%);
  }

  &:hover,
  &:focus {
    background-color: rgba(255, 255, 255, 0.075);
    border: 1px solid fadeout(@caribbean, 25%);
  }
}

.entity-list-item-avatar {
  width: 3.6rem;
  height: 3.6rem;
  margin-right: 1em;
}
</style>
