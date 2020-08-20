import Vue from 'vue';
import LeftMenu from './components/index.vue';

function renderLeftMenu(el, store) {
  return new Vue({
    el,
    store,
    components: {
      LeftMenu
    },
    render(createElement) {
      return createElement('left-menu', {});
    }
  });
}

export default renderLeftMenu;
