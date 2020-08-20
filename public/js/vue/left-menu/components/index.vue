<script>
import { mapState, mapGetters, mapActions } from 'vuex';

import clientEnv from 'gitter-client-env';
import * as leftMenuConstants from '../constants';
import MenuBarBody from './menu-bar-body.vue';
import SearchBody from './search-body.vue';
import RoomList from './room-list.vue';
import Announcements from './announcements-body.vue';
import GitterLogoSvg from './gitter-logo-svg.vue';
import GitterLogoTextSvg from './gitter-logo-text-svg.vue';
import GitlabLogoSvg from './gitlab-logo-svg.vue';
import fingerSwipeMixin from '../mixins/finger-swipe';

export default {
  name: 'LeftMenu',
  mixins: [fingerSwipeMixin],
  components: {
    MenuBarBody,
    SearchBody,
    RoomList,
    Announcements,
    GitterLogoSvg,
    GitterLogoTextSvg,
    GitlabLogoSvg
  },
  computed: {
    ...mapState([
      'isLoggedIn',
      'darkTheme',
      'leftMenuState',
      'leftMenuPinnedState',
      'leftMenuExpandedState'
    ]),
    ...mapGetters(['displayedRooms']),
    isPinned() {
      return this.leftMenuPinnedState === true;
    },
    isExpanded() {
      return this.leftMenuExpandedState === true;
    },
    isAllState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_ALL_STATE;
    },
    isSearchState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_SEARCH_STATE;
    },
    isPeopleState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_PEOPLE_STATE;
    },
    isAnnouncementState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_ANNOUNCEMENTS_STATE;
    },

    gitterHomePageLink() {
      return `${clientEnv['basePath']}/?utm_source=left-menu-logo`;
    }
  },

  watch: {
    isPinned: function() {
      // Hack for Safari so the absolutely positioned room list goes in and out
      // of the document flow properly. Otherwise it was leaving a big blank space
      // Context: https://gitlab.com/gitlab-org/gitter/webapp/issues/2226
      //
      // Force a layout
      // https://gist.github.com/paulirish/5d52fb081b3570c81e3a
      if (window.safari) {
        this.$refs.root.style.display = 'none';
        this.$refs.root.offsetHeight;
        this.$refs.root.style.display = '';
      }
    }
  },

  methods: {
    ...mapActions(['toggleLeftMenu', 'trackStat']),
    onGitlabLinkClick() {
      this.trackStat('left-menu-gitlab-link-click');
    },
    onMouseleave() {
      this.toggleLeftMenu(false);
    }
  }
};
</script>

<template>
  <div
    ref="root"
    class="root js-left-menu-root"
    :class="{
      'logged-in': isLoggedIn,
      'dark-theme': darkTheme,
      pinned: isPinned,
      expanded: isExpanded
    }"
    :style="{
      transform: transformCssValue,
      transition: transitionCssValue
    }"
    @mouseleave="onMouseleave"
  >
    <header class="header">
      <section class="header-minibar layout-minibar">
        <a :href="gitterHomePageLink">
          <gitter-logo-svg class="logo-gitter-sign" />
        </a>
      </section>
      <section class="header-main-menu layout-main-menu">
        <a class="logo-text" :href="gitterHomePageLink">
          <gitter-logo-text-svg />
        </a>
        <span class="provided-by-text">
          by
        </span>
        <a
          class="gitlab-logo"
          href="https://about.gitlab.com?utm_source=gitter-left-menu-logo"
          target="_blank"
          @click="onGitlabLinkClick"
        >
          <gitlab-logo-svg />
        </a>
      </section>
    </header>

    <section v-if="isLoggedIn" class="body">
      <section class="layout-minibar">
        <menu-bar-body />
      </section>
      <section class="body-main-menu layout-main-menu scroller">
        <search-body v-if="isSearchState" />
        <announcements v-else-if="isAnnouncementState" />
        <template v-else>
          <h2 v-if="isAllState" class="room-list-title">All conversations</h2>
          <h2 v-if="isPeopleState" class="room-list-title">People</h2>

          <room-list :rooms="displayedRooms" />
        </template>
      </section>
    </section>
    <section v-else class="body nli-body">
      <h2 class="nli-primary-heading">Where communities thrive</h2>

      <br />

      <ul class="nli-info-block">
        <li class="nli-info-block-item">Join over <strong>1.5M+ people</strong></li>
        <li class="nli-info-block-item">Join over <strong>100K+ communities</strong></li>
        <li class="nli-info-block-item">Free <strong>without limits</strong></li>
        <li class="nli-info-block-item">Create <strong>your own community</strong></li>
      </ul>

      <ul class="nli-info-block">
        <li class="nli-info-block-item"><a href="/explore">Explore more communities</a></li>
      </ul>
    </section>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'base-zindex-levels';
@import (reference) 'components/m-header-title';
@import (reference) 'dark-theme';

.root {
  box-sizing: border-box;
  z-index: @zIndexLeftMenu;

  display: flex;
  flex-direction: column;
  height: 100%;

  will-change: transform;
  transition: transform 0.05s ease;

  &::v-deep *,
  &::v-deep *:before,
  &::v-deep *:after {
    box-sizing: inherit;
  }

  @media @mobile-screen-breakpoint {
    & {
      position: absolute;

      transform: translateX(-100%);
    }

    &.expanded {
      transform: translateX(0%);
    }
  }
}

.layout-minibar {
  z-index: 1;
  width: 7.5rem;
}

.layout-main-menu {
  width: 26.5rem;

  transition: transform 0.1s ease;

  @media @large-screen-breakpoint {
    // .logged-in is here so the left-menu header stays in one piece regardless of pinned
    // The NLI left-menu does not have a pinned state, just mobile and not mobile
    .root:not(.pinned).logged-in & {
      position: absolute;
      left: 7.5rem;

      transform: translateX(-100%);
    }

    .root.expanded:not(.pinned).logged-in & {
      transform: translateX(0%);
    }
  }
}

.header {
  position: relative;
  display: flex;
  flex-shrink: 0;
  height: @desktop-header-height;

  color: #ffffff;
}

.header-minibar {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  background-color: @header-base-bg-color;

  .dark-theme & {
    background-color: @dark-theme-app-header-bg-color;
  }
}

.header-main-menu {
  display: flex;
  align-items: center;
  height: 100%;

  background-color: @header-base-bg-color;

  .dark-theme & {
    background-color: @dark-theme-app-header-bg-color;
  }
}

.logo-gitter-sign {
  display: block;
  width: 18px;

  fill: #ffffff;
}

.logo-text {
  display: block;
  width: 7rem;

  &::v-deep > svg {
    fill: #ffffff;
  }
}

.provided-by-text {
  margin-left: 1.3em;
  margin-right: 0.7em;

  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  text-transform: uppercase;
}

.gitlab-logo {
  width: 42px;
  height: 42px;
}

.body {
  position: relative;
  flex: 1;
  display: flex;
  // Fix overflow in Firefox
  //
  // > Whenever you've got an element with overflow: [hidden|scroll|auto] inside of a flex item,
  // > you need to give its ancestor flex item min-width:0 (in a horizontal flex container) or
  // > min-height:0 (in a vertical flex container), to disable this min-sizing behavior, or
  // > else the flex item will refuse to shrink smaller than the child's min-content size.
  //
  // https://stackoverflow.com/a/28639686/796832
  // <- https://stackoverflow.com/a/44948507/796832
  min-height: 0;
}

.body-main-menu {
  overflow-x: hidden;
  overflow-y: auto;
  // https://github.com/html-next/ember-gestures/issues/104
  touch-action: pan-y;
  height: 100%;

  background-color: @main-application-bg-color;
  border-right: 1px solid @menu-border-color;

  .dark-theme & {
    background-color: @dark-theme-left-menu-bg-color;
    border-right-color: @dark-theme-left-menu-minibar-border-color;
  }
}

.room-list-title {
  .m-header-title();
}

.room-list {
  margin-left: 0;
  list-style: none;
}

.nli-body {
  flex: 1;
  display: block;
  width: 34rem;
  height: 100%;
  padding: 20px;

  background-color: @header-base-bg-color;

  color: #ffffff;

  & a {
    color: #ffffff;
  }
}

.nli-primary-heading {
  font-family: 'source-sans-pro';
  font-weight: 200;
  font-size: 47px;
  line-height: 43px;
}

.nli-info-block {
  padding: 1vh 15px;
  margin: 10px 0px;
  list-style: none;

  background-color: rgba(255, 255, 255, 0.1);

  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nli-info-block-item {
  margin-top: 4px;
  margin-bottom: 4px;
}
</style>
