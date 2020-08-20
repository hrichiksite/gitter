import Vue from 'vue';
import ExportUserDataView from './components/index.vue';

function renderExportUserDataView(el, store) {
  return new Vue({
    el,
    store,
    components: {
      ExportUserDataView
    },
    render(createElement) {
      return createElement('export-user-data-view', {});
    }
  });
}

export default renderExportUserDataView;
