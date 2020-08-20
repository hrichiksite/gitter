const mount = require('../__test__/vuex-mount');
const { default: LoadingSpinner } = require('./loading-spinner.vue');

describe('loading-spinner', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(LoadingSpinner);
    expect(wrapper.element).toMatchSnapshot();
  });
});
