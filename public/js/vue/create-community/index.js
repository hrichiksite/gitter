import Vue from 'vue';
import CreateCommunityView from './components/index.vue';

function renderCreateCommunityView(el, store) {
  return new Vue({
    el,
    store,
    components: {
      CreateCommunityView
    },
    render(createElement) {
      return createElement('create-community-view', {});
    }
  });
}

export default renderCreateCommunityView;
