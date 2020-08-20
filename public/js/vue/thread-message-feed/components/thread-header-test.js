const mount = require('../../__test__/vuex-mount');
const { default: ThreadHeader } = require('./thread-header.vue');

describe('thread-message-feed thread-header', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(ThreadHeader);
    expect(wrapper.element).toMatchSnapshot();
  });
  it('close button calls toggleThreadMessageFeed action', () => {
    const { wrapper, stubbedActions } = mount(ThreadHeader);
    wrapper.find({ ref: 'close-button' }).trigger('click');

    expect(stubbedActions.threadMessageFeed.close).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      undefined
    );
  });
});
