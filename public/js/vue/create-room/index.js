import Vue from 'vue';
import CreateRoomView from './components/index.vue';

function renderCreateRoomView(el, store) {
  return new Vue({
    el,
    store,
    components: {
      CreateRoomView
    },
    render(createElement) {
      return createElement('create-room-view', {});
    }
  });
}

export default renderCreateRoomView;
