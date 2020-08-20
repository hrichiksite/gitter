jest.mock('../../../utils/appevents');

const mount = require('../../__test__/vuex-mount');
const { default: Index } = require('./index.vue');
const appEvents = require('../../../utils/appevents');

const STUB_USER = {
  id: '123'
};

describe('Export user data dialog', () => {
  beforeEach(() => {
    appEvents.trigger.mockReset();
  });

  it('matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.user = STUB_USER;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('clicking on the modal does NOT close the modal', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.user = STUB_USER;
    });

    wrapper.find({ ref: 'modal' }).trigger('click');

    expect(appEvents.trigger.mock.calls[0]).toEqual(undefined);
  });

  it('closes modal when close button is clicked', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.user = STUB_USER;
    });

    wrapper.find({ ref: 'closeButton' }).trigger('click');

    expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-export-user-data-view']);
  });

  it('closes modal when modal backdrop is clicked', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.user = STUB_USER;
    });

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-export-user-data-view']);
  });
});
