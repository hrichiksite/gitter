<script>
export default {
  name: 'LoadingSpinner'
};
</script>

<template>
  <span class="loading-spinner"><span class="loading-spinner-label">Loading</span></span>
</template>

<style lang="less" scoped>
@keyframes spinner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  position: relative;
  display: inline-block;
  width: 1em;
  height: 1em;

  &:after {
    content: '\e834';
    position: absolute;
    top: 0;
    right: 0;

    font-family: 'fontello';
    line-height: 1;

    animation-name: spinner-rotate;
    animation-duration: 0.75s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }
}

.loading-spinner-label {
  /* Visually hidden */
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
}
</style>
