<script>
import { mapActions } from 'vuex';

export default {
  name: 'ThreadHeader',
  methods: {
    ...mapActions({ close: 'threadMessageFeed/close' })
  }
};
</script>

<template>
  <header>
    <h2 class="title">Thread</h2>
    <button ref="close-button" class="close-button" @click="close()">
      <span class="icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30.5 30.5">
          <path
            d="M30,30.5c-0.1,0-0.3,0-0.4-0.1L0.1,0.9C0,0.7,0,0.3,0.1,0.1s0.5-0.2,0.7,0l29.5,29.5c0.2,0.2,0.2,0.5,0,0.7
    C30.3,30.5,30.2,30.5,30,30.5z"
          />
          <path
            d="M0.5,30.5c-0.1,0-0.3,0-0.4-0.1c-0.2-0.2-0.2-0.5,0-0.7L29.7,0.1c0.2-0.2,0.5-0.2,0.7,0s0.2,0.5,0,0.7L0.9,30.4
    C0.8,30.5,0.6,30.5,0.5,30.5z"
          />
        </svg>
      </span>
    </button>
  </header>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'colors';
@import (reference) 'components/m-header-title';

.title {
  .m-header-title();
}

.close-button {
  position: absolute;
  top: 0;
  right: 0;

  padding: 2.3rem;

  background-color: transparent;
  border: 0;

  opacity: 0.5;

  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
  &:focus {
    outline: none;
    color: @jaffa;
  }
}

.icon-wrapper {
  width: 22px;
  height: 22px;
  display: flex;

  & > svg {
    width: 100%;
    height: 100%;

    fill: #7f8080;
    stroke: #7f8080;
    stroke-width: 0.5px;
    vector-effect: non-scaling-stroke;
  }
}
</style>
