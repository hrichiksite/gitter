jest.mock('gitter-web-avatars');

const mount = require('../../__test__/vuex-mount');
const avatars = require('gitter-web-avatars');
const { default: Avatar } = require('./avatar.vue');

describe('thread-message-feed avatar', () => {
  it('default size matches snapshot', () => {
    const { wrapper } = mount(Avatar, {
      user: {
        displayName: 'Test User',
        gravatarImageUrl:
          'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=60&d=identicon'
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('m size matches snapshot', () => {
    const { wrapper } = mount(Avatar, {
      size: 'm',
      user: {
        displayName: 'Test User',
        gravatarImageUrl:
          'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=60&d=identicon'
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('should use fallback image if there is a loading error', () => {
    avatars.getDefault.mockImplementation(() => 'https://default.png');
    const { wrapper } = mount(Avatar, {
      user: {
        displayName: 'Test User',
        gravatarImageUrl:
          'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=60&d=identicon'
      }
    });
    wrapper.find('img').trigger('error');
    expect(wrapper.element).toMatchSnapshot();
  });
});
