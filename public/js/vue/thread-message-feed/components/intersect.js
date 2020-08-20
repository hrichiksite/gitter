const log = require('../../../utils/log');

/**
 * Slimmed down version of https://github.com/heavyy/vue-intersect/blob/master/src/index.js
 */
export default {
  name: 'intersect',
  abstract: true,
  created() {
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          this.$emit('enter', [entries[0]]);
        } else {
          this.$emit('leave', [entries[0]]);
        }
        this.$emit('change', [entries[0]]);
      },
      {
        threshold: [0, 0.2],
        root: null,
        rootMargin: '0px 0px 0px 0px'
      }
    );
  },
  mounted() {
    if (!this.$slots.default || this.$slots.default.length !== 1) {
      log.warn('[VueIntersect] You must wrap exactly one element in a <intersect> component.');
    }

    this.observer.observe(this.$slots.default[0].elm);
  },
  destroyed() {
    this.observer.disconnect();
  },
  render() {
    return this.$slots.default ? this.$slots.default[0] : null;
  }
};
