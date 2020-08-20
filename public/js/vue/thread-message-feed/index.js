import Vue from 'vue';
import ThreadMessageFeed from '../thread-message-feed/components/index.vue';

function renderThreadMessageFeed(el, store) {
  return new Vue({
    el,
    store,
    components: {
      ThreadMessageFeed
    },
    render(createElement) {
      return createElement('thread-message-feed', {});
    }
  });
}

export default renderThreadMessageFeed;
