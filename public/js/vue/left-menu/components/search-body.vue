<script>
import _ from 'lodash';
import { mapState, mapGetters, mapActions } from 'vuex';

import LoadingSpinner from '../../components/loading-spinner.vue';
import SearchBodyMessageResultItem from './search-body-message-result-item.vue';
import ListItem from './list-item.vue';

const SEARCH_DEBOUNCE_INTERVAL = 1000;

export default {
  name: 'SearchBody',
  components: {
    LoadingSpinner,
    SearchBodyMessageResultItem,
    ListItem
  },
  props: {
    // We use this in tests so we don't have to wait for the search to happen
    searchImmediately: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState({
      searchInputValue: state => state.search.searchInputValue,

      roomSearchLoading: state => {
        return (
          state.search.repo.loading || state.search.room.loading || state.search.people.loading
        );
      },

      repoSearchError: state => state.search.repo.error,
      roomSearchError: state => state.search.room.error,
      peopleSearchError: state => state.search.people.error,

      messageSearchLoading: state => state.search.message.loading,
      messageSearchError: state => state.search.message.error,
      messageSearchResults: state => state.search.message.results
    }),
    ...mapGetters(['displayedRoomSearchResults']),

    searchInputModel: {
      get() {
        return this.searchInputValue;
      },
      set(value) {
        this.updateSearchInputValue(value);
        this.debouncedFetchSearchResults();
      }
    },
    hasSearchInputText() {
      return this.searchInputValue && this.searchInputValue.length;
    },
    hasRoomSearchResults() {
      return !_.isEmpty(this.displayedRoomSearchResults);
    },
    hasMessageSearchResults() {
      return !_.isEmpty(this.messageSearchResults);
    }
  },

  methods: {
    ...mapActions([
      'updateSearchInputValue',
      'fetchRoomSearchResults',
      'fetchMessageSearchResults'
    ]),

    fetchSearchResults() {
      this.fetchRoomSearchResults();
      this.fetchMessageSearchResults();
    },

    _debouncedFetchSearchResults: _.debounce(function() {
      this.fetchSearchResults();
    }, SEARCH_DEBOUNCE_INTERVAL),

    debouncedFetchSearchResults() {
      if (this.searchImmediately) {
        this.fetchSearchResults();
      } else {
        this._debouncedFetchSearchResults();
      }
    }
  }
};
</script>

<template>
  <div class="search-body-root">
    <h2 class="search-body-title">Search</h2>

    <div class="search-input-wrapper">
      <input
        ref="search-input"
        v-model="searchInputModel"
        class="search-input"
        placeholder="What are you looking for?"
      />
    </div>

    <ul v-if="!hasSearchInputText" class="syntax-list">
      <li class="syntax-list-item">
        <code>from:username</code>
      </li>
      <li class="syntax-list-item">
        <code>text:@username</code>
      </li>
      <li class="syntax-list-item">
        <code>sent:[2020-06-08 TO 2020-06-09]</code>
      </li>
      <li class="syntax-list-item">
        <code>sent:[2020-06-09T16:17-03:00 TO 2020-06-09T16:21-03:00]</code>
      </li>
      <li class="syntax-list-item">
        <code>text:@(username1 OR username2)</code>
        <br />
        <code>text:@(username1 AND username2)</code>
      </li>
    </ul>

    <h2 class="search-body-title">
      Rooms & People
      <loading-spinner v-if="roomSearchLoading" />
    </h2>

    <ul v-if="hasRoomSearchResults" class="room-search-list">
      <list-item v-for="room in displayedRoomSearchResults" :key="room.id" :item="room" />
    </ul>
    <div v-else class="search-result-empty-message">
      No room search results...
    </div>

    <div v-if="repoSearchError" class="search-result-error-message">
      Error fetching repos
    </div>

    <div v-if="roomSearchError" class="search-result-error-message">
      Error fetching rooms
    </div>

    <div v-if="peopleSearchError" class="search-result-error-message">
      Error fetching people
    </div>

    <h2 class="search-body-title">
      Chat messages
      <loading-spinner v-if="messageSearchLoading" />
    </h2>

    <div v-if="messageSearchError" class="search-result-error-message">
      Error fetching messages
    </div>
    <ul v-else-if="hasMessageSearchResults" class="message-search-list">
      <search-body-message-result-item
        v-for="messageSearchResult in messageSearchResults"
        :key="messageSearchResult.id"
        :message-search-result="messageSearchResult"
      />
    </ul>
    <div v-else class="search-result-empty-message">
      No message search results...
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'components/m-header-title';
@import (reference) 'dark-theme';

.search-body-root {
}

.search-body-title {
  .m-header-title();
}

@searchInputSpacing: 12px;

.search-input-wrapper {
  padding-left: ~'calc(@{desktop-menu-left-padding} - @{searchInputSpacing})';
  padding-right: ~'calc(@{desktop-menu-left-padding} - @{searchInputSpacing})';
}

.search-input {
  box-sizing: initial;
  width: 100%;
  height: 36px;
  padding: 8px @searchInputSpacing;

  border-radius: 18px;

  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
    background-color: @dark-theme-left-menu-active-item-bg-color;
    border-color: darken(@dark-theme-left-menu-text-color, 40%);
  }
}

.syntax-list {
  font-size: 0.9em;
}

.syntax-list-item {
  margin-bottom: 0.6em;

  .dark-theme & code {
    border-color: @app-single-line-code-color;
    background-color: @app-single-line-code-color;

    color: @dark-theme-left-menu-text-color;
  }
}

.search-result-empty-message {
  padding-left: @desktop-menu-left-padding;
  padding-right: @desktop-menu-left-padding;

  color: @menu-item-color;

  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
  }
}

.search-result-error-message {
  padding-left: @desktop-menu-left-padding;
  padding-right: @desktop-menu-left-padding;

  color: @menu-item-color;

  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
  }
}

.room-search-list {
  margin-left: 0;
  list-style: none;
}

.message-search-list {
  margin-left: 0;
  list-style: none;
}
</style>
