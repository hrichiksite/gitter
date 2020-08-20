jest.mock('../../../utils/appevents');

const mount = require('../../__test__/vuex-mount');
const { default: Index } = require('./index.vue');
const appEvents = require('../../../utils/appevents');

describe('CreateRoom', () => {
  beforeEach(() => {
    appEvents.trigger.mockReset();
  });

  it('matches snapshot', () => {
    const { wrapper } = mount(Index);
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room submit loading matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.createRoom.roomSubmitRequest = { loading: true };
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room submit error matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.createRoom.roomSubmitRequest = { error: 'some-error' };
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('clicking submit fires store action', () => {
    const { wrapper, stubbedActions } = mount(Index);

    wrapper.find({ ref: 'submitButton' }).trigger('click');

    expect(stubbedActions.createRoom.submitRoom).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined
    );
  });

  it('clicking on the modal does NOT close the modal', () => {
    const { wrapper } = mount(Index);

    wrapper.find({ ref: 'modal' }).trigger('click');

    expect(appEvents.trigger.mock.calls[0]).toEqual(undefined);
  });

  it('closes modal when close button is clicked', () => {
    const { wrapper } = mount(Index);

    wrapper.find({ ref: 'closeButton' }).trigger('click');

    expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
  });

  it('closes modal when modal backdrop is clicked', () => {
    const { wrapper } = mount(Index);

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(appEvents.trigger.mock.calls[0]).toEqual(['destroy-create-room-view']);
  });
});
