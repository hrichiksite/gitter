const mount = require('../../__test__/vuex-mount');
const { default: RepoSelectSection } = require('./repo-select-section.vue');

describe('RepoSelectSection', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(RepoSelectSection);
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('GitHub user', () => {
    it('no private repo scope', () => {
      const { wrapper } = mount(RepoSelectSection, {}, store => {
        store.state.user = {
          providers: ['github']
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('with private repo scope granted', () => {
      const { wrapper } = mount(RepoSelectSection, {}, store => {
        store.state.user = {
          providers: ['github'],
          scopes: {
            private_repo: true
          }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });
});
