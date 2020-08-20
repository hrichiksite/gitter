<script>
import moment from 'moment';
import { mapGetters, mapActions } from 'vuex';

import generatePermalink from 'gitter-web-shared/chat/generate-permalink';

export default {
  name: 'SearchBodyMessageResultItem',
  props: {
    messageSearchResult: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters(['displayedRoom'])
  },

  methods: {
    ...mapActions(['jumpToMessageId']),

    getPermalink(messageSearchResult) {
      return generatePermalink(
        this.displayedRoom.uri,
        messageSearchResult.id,
        messageSearchResult.sent,
        false
      );
    },
    getMessageDisplayDate(sentTimestamp) {
      return moment(sentTimestamp).format('MMM Do LT');
    },

    onClick(messageSearchResult) {
      this.jumpToMessageId(messageSearchResult.id);
    }
  }
};
</script>

<template>
  <li ref="root" class="message-search-item" @click.prevent="onClick(messageSearchResult)">
    <span class="message-search-item-detail">
      <a class="message-search-item-detail-author-link" :href="messageSearchResult.fromUser.url"
        >{{ messageSearchResult.fromUser.displayName }}
        <span>@{{ messageSearchResult.fromUser.username }}</span>
      </a>
      <span>&#9679;</span>
      <a class="message-search-item-detail-permalink" :href="getPermalink(messageSearchResult)">{{
        getMessageDisplayDate(messageSearchResult.sent)
      }}</a>
    </span>
    <span class="message-search-item-text">
      {{ messageSearchResult.text }}
    </span>
  </li>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'components/m-header-title';
@import (reference) 'dark-theme';

.message-search-item {
  display: block;
  padding-top: @desktop-menu-left-padding / 2.6;
  padding-left: @desktop-menu-left-padding / 2;
  padding-bottom: @desktop-menu-left-padding / 1.44;
  padding-right: @desktop-menu-left-padding / 2;

  &:hover,
  &:focus {
    cursor: pointer;
    background-color: @room-item-active-bg;
    color: black;
    outline: none;
    text-decoration: none;

    .dark-theme & {
      background-color: @dark-theme-left-menu-active-item-bg-color;
    }
  }
}

.message-search-item-detail {
  overflow: hidden;
  display: block;
  margin-bottom: 0.5em;
  padding-right: @desktop-menu-left-padding / 2;

  color: @menu-item-color;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: @search-message-detail-color;
  font-size: 1.3rem;

  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
  }
}

.message-search-item-detail-author-link {
  color: inherit;
}

.message-search-item-detail-permalink {
  color: inherit;
}

.message-search-item-text {
  display: block;

  color: @menu-item-color;
  font-size: 1.4rem;
  font-weight: 300;
  line-height: 1.25em;
  white-space: normal;
  word-break: break-all;
  text-overflow: ellipsis;

  .fonts-loaded & {
    font-size: 1.5rem;
    font-weight: 400;
  }

  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
  }
}
</style>
