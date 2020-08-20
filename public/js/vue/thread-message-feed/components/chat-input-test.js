jest.mock('../../../utils/is-touch');

const mount = require('../../__test__/vuex-mount');
const { default: ChatInput } = require('./chat-input.vue');
import isTouch from '../../../utils/is-touch';

describe('thread-message-feed chat-input', () => {
  const defaultProps = {
    user: { displayName: 'John Smith' },
    thread: true
  };

  beforeEach(() => {
    isTouch.mockReturnValue(false);
  });

  it('matches snapshot for thread', () => {
    const { wrapper } = mount(ChatInput, defaultProps);
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('sending message', () => {
    it('should update draft message when user adds input', () => {
      const { wrapper, stubbedActions } = mount(ChatInput, defaultProps);
      wrapper.find({ ref: 'chatInputTextArea' }).element.value = 'hello';
      wrapper.find({ ref: 'chatInputTextArea' }).trigger('input');
      expect(stubbedActions.threadMessageFeed.updateDraftMessage).toHaveBeenCalledWith(
        expect.anything(),
        'hello',
        undefined
      );
    });

    it('should render draft message when it is in state', () => {
      const { wrapper } = mount(
        ChatInput,
        defaultProps,
        store => (store.state.threadMessageFeed.draftMessage = 'new message')
      );
      expect(wrapper.find({ ref: 'chatInputTextArea' }).element.value).toEqual('new message');
    });

    it('should trigger send action when enter key is pressed', () => {
      const { wrapper, stubbedActions } = mount(ChatInput, defaultProps, store => {
        store.state.user = { id: 'userId' };
      });
      wrapper.find({ ref: 'chatInputTextArea' }).trigger('keydown.enter');
      expect(stubbedActions.threadMessageFeed.sendMessage).toHaveBeenCalled();
    });
  });

  it('should edit last message when key up is pressed', () => {
    const { wrapper, stubbedActions } = mount(ChatInput, defaultProps, store => {
      store.state.user = { id: 'userId' };
    });
    wrapper.find({ ref: 'chatInputTextArea' }).trigger('keyup.up');
    expect(stubbedActions.threadMessageFeed.editLastMessage).toHaveBeenCalled();
  });
});
