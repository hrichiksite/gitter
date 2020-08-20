<script>
import { mapState, mapActions } from 'vuex';

import { VALID_LEFT_MENU_STATES } from '../constants';

export default {
  name: 'MenuBarItem',
  props: {
    type: {
      type: String,
      required: true,
      validator: function(value) {
        return VALID_LEFT_MENU_STATES.includes(value);
      }
    },
    label: {
      type: String,
      default: ''
    },
    hasUnreads: {
      type: Boolean,
      default: false
    },
    hasMentions: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(['leftMenuState', 'leftMenuExpandedState']),
    isActive() {
      return this.type === this.leftMenuState;
    }
  },

  methods: {
    ...mapActions(['setLeftMenuState', 'toggleLeftMenu']),
    onClick(type) {
      if (this.isActive) {
        // If you're clicking on the same item, toggle the left menu if it isn't pinned
        this.toggleLeftMenu(!this.leftMenuExpandedState);
      } else {
        // Expand the left menu if it isn't pinned so you can see the new state you switched to
        this.toggleLeftMenu(true);
      }

      // Change the left menu view
      this.setLeftMenuState(type);
    }
  }
};
</script>

<template>
  <button
    ref="root"
    class="item"
    :class="{
      active: isActive
    }"
    type="button"
    :aria-label="label"
    @click.prevent="onClick(type)"
  >
    <div
      class="unread-indicator"
      :class="{
        'has-unreads': hasUnreads,
        'has-mentions': hasMentions
      }"
    ></div>
    <span class="icon-wrapper" aria-hidden="true">
      <slot name="icon"></slot>
    </span>
  </button>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'dark-theme';

.item {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: @desktop-header-height;

  background: transparent;
  border: 0;

  &:hover,
  &:focus {
    background-color: @room-item-active-bg;
    outline: none;

    .dark-theme & {
      background-color: @dark-theme-left-menu-active-item-bg-color;
    }
  }

  &:before {
    content: '';
    display: inline-block;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0.5rem;
    transform: translateX(-100%);
    transition: transform 0.2s linear;
  }

  &.active {
    &:before {
      transform: translateX(0);
      background-color: currentColor;
    }
  }
}

.item-toggle {
  & .icon-wrapper {
    width: 30px;
    height: 34px;

    & > svg {
      stroke-width: 1px;
    }
  }
}

.unread-indicator {
  visibility: hidden;

  &.has-unreads,
  &.has-mentions {
    visibility: visible;

    position: absolute;
    top: 38%;
    left: 63%;
    transform: translateX(-50%) translateY(-50%);

    display: block;
    width: 1.4rem;
    height: 1.4rem;

    border: 2px solid @main-application-bg-color;
    border-radius: 100%;
    color: transparent;

    .dark-theme & {
      border-color: @dark-theme-left-menu-bg-color;
    }
  }

  &.has-unreads {
    background-color: @caribbean;
  }

  &.has-mentions {
    background-color: @jaffa;
  }
}

.icon-wrapper {
  width: 22px;
  height: 22px;

  & > svg {
    width: 100%;
    height: 100%;

    opacity: 0.45;
    fill: #7f8080;
    stroke: #7f8080;
    stroke-width: 0.5px;
    vector-effect: non-scaling-stroke;

    .active & {
      opacity: 1;
    }

    .dark-theme & {
      fill: @dark-theme-left-menu-minibar-icon-color;
      stroke: @dark-theme-left-menu-minibar-icon-color;
    }
  }
}
</style>
