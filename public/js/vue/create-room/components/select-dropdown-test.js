const mount = require('../../__test__/vuex-mount');
const { default: SelectDropdown } = require('./select-dropdown.vue');

describe('SelectDropdown', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(SelectDropdown, {
      items: [
        {
          id: 1
        },
        {
          id: 2
        },
        {
          id: 3
        }
      ],
      filterText: '',
      filterPlaceholder: 'Filter items...'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('Inputting new filter text emits event', () => {
    const { wrapper } = mount(SelectDropdown, {
      items: [],
      filterText: '',
      filterPlaceholder: 'Filter items...'
    });

    wrapper.find({ ref: 'filterTextInput' }).element.value = 'lookingforyou';
    wrapper.find({ ref: 'filterTextInput' }).trigger('input');

    expect(wrapper.emitted().filterInput).toBeTruthy();
  });
});
