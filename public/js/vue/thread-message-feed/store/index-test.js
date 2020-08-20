jest.mock('../../../utils/appevents');
jest.mock('../../../components/api-client');
jest.mock('../../../utils/log'); // don't show error messages in the test output
jest.spyOn(Date, 'now').mockImplementation(() => 1479427200000);

const testAction = require('../../store/__test__/vuex-action-helper');
const appEvents = require('../../../utils/appevents');
const apiClient = require('../../../components/api-client');
const { createSerializedMessageFixture } = require('../../__test__/fixture-helpers');
import * as rootTypes from '../../store/mutation-types';
const {
  default: { actions, mutations, getters },
  types,
  childMessagesVuexRequest
} = require('.');

describe('thread message feed store', () => {
  describe('actions', () => {
    beforeEach(() => {
      appEvents.trigger.mockReset();
      apiClient.room.get.mockReset();
      apiClient.room.put.mockReset();
      apiClient.room.delete.mockReset();
      apiClient.room.post.mockReset();
    });

    it('open shows TMF, clears state, hides right toolbar, sets parent id ', async () => {
      await testAction(
        actions.open,
        '5d147ea84dad9dfbc522317a',
        {},
        [
          { type: types.RESET_THREAD_STATE },
          { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: true },
          { type: types.SET_PARENT_MESSAGE_ID, payload: '5d147ea84dad9dfbc522317a' }
        ],
        [{ type: 'fetchInitialMessages' }]
      );
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', false);
    });

    // this is utilized by calling open by default before some other TMF actions
    it('open does nothing if TMF is already opened', () => {
      testAction(
        actions.open,
        '5d147ea84dad9dfbc522317a',
        { isVisible: true, parentId: '5d147ea84dad9dfbc522317a' },
        [],
        []
      );
    });

    it('close hides TMF, shows right toolbar, unsets parent id', async () => {
      await testAction(actions.close, undefined, {}, [
        { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: false }
      ]);
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', true);
    });

    it('updateDraftMessage changes draft message in the state', async () => {
      await testAction(actions.updateDraftMessage, 'testMessage', {}, [
        { type: types.UPDATE_DRAFT_MESSAGE, payload: 'testMessage' }
      ]);
    });

    describe('sendMessage', () => {
      let storedMessage, tmpMessage, initialState;
      beforeEach(() => {
        storedMessage = createSerializedMessageFixture({ id: '5d147ea84dad9dfbc522317a' });
        initialState = {
          parentId: '5d11d571a2405419771cd3ee',
          draftMessage: 'testMessage',
          user: { id: 'userId' }
        };
        tmpMessage = {
          id: `tmp-5d11d571a2405419771cd3ee-userId-testMessage`,
          fromUser: { id: 'userId' },
          text: initialState.draftMessage,
          parentId: initialState.parentId,
          sent: new Date(Date.now()),
          loading: true
        };
        apiClient.room.post.mockReset();
      });
      it('sendMessage creates message object, submits it to the collection and focuses UI on it', async () => {
        apiClient.room.post.mockResolvedValue(storedMessage);
        await testAction(
          actions.sendMessage,
          undefined,
          initialState,
          [
            { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [tmpMessage] },
            { type: types.UPDATE_DRAFT_MESSAGE, payload: '' },
            { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [storedMessage] }
          ],
          [{ type: 'focusOnMessage', payload: { id: storedMessage.id, block: 'end' } }]
        );
        expect(apiClient.room.post).toHaveBeenCalledWith('/chatMessages', {
          text: 'testMessage',
          parentId: '5d11d571a2405419771cd3ee'
        });
      });

      it('sendMessage marks failed message with an error', async () => {
        apiClient.room.post.mockRejectedValue(null);
        await testAction(actions.sendMessage, undefined, initialState, [
          { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [tmpMessage] },
          { type: types.UPDATE_DRAFT_MESSAGE, payload: '' },
          {
            type: rootTypes.ADD_TO_MESSAGE_MAP,
            payload: [{ ...tmpMessage, error: true, loading: false }]
          }
        ]);
      });

      it('sendMessage does not do anything when the draft message is empty', async () => {
        apiClient.room.post.mockRejectedValue(null);
        await testAction(actions.sendMessage, undefined, { ...initialState, draftMessage: '' }, []);
      });
    });

    describe('deleteMessage', () => {
      const storedMessage = createSerializedMessageFixture({ id: '5d147ea84dad9dfbc522317a' });
      const { id } = storedMessage;

      it('success', async () => {
        apiClient.room.delete.mockResolvedValue(null);

        await testAction(actions.deleteMessage, storedMessage, {}, [
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: true, error: false } },
          { type: rootTypes.REMOVE_MESSAGE, payload: storedMessage }
        ]);

        expect(apiClient.room.delete).toHaveBeenCalledWith(`/chatMessages/${storedMessage.id}`);
      });
      it('error', async () => {
        apiClient.room.delete.mockRejectedValue(null);

        await testAction(actions.deleteMessage, storedMessage, {}, [
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: true, error: false } },
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: false, error: true } }
        ]);
      });
    });
    describe('reportMessage', () => {
      const storedMessage = createSerializedMessageFixture({ id: '5d147ea84dad9dfbc522317a' });
      const { id } = storedMessage;

      it('success', async () => {
        apiClient.room.post.mockResolvedValue(null);

        await testAction(actions.reportMessage, storedMessage, {}, [
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: true, error: false } },
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: false, error: false } }
        ]);

        expect(apiClient.room.post).toHaveBeenCalledWith(
          `/chatMessages/${storedMessage.id}/report`
        );
      });
      it('error', async () => {
        apiClient.room.post.mockRejectedValue(null);

        await testAction(actions.reportMessage, storedMessage, {}, [
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: true, error: false } },
          { type: rootTypes.UPDATE_MESSAGE, payload: { id, loading: false, error: true } }
        ]);
      });
    });

    describe('quoteMessage', () => {
      const storedMessage = createSerializedMessageFixture({
        id: '5d147ea84dad9dfbc522317a',
        text: 'hello\nline2'
      });

      it('puts quote at the draft beginning if the message draft is empty', async () => {
        await testAction(
          actions.quoteMessage,
          storedMessage,
          { draftMessage: '' },
          [{ type: types.UPDATE_DRAFT_MESSAGE, payload: '> hello\n> line2\n\n' }],
          []
        );
      });

      it('separates quote from existing message draft by empty line', async () => {
        const storedMessage = createSerializedMessageFixture({
          id: '5d147ea84dad9dfbc522317a',
          text: 'hello\nline2'
        });
        await testAction(
          actions.quoteMessage,
          storedMessage,
          { draftMessage: 'original draft' },
          [{ type: types.UPDATE_DRAFT_MESSAGE, payload: 'original draft\n> hello\n> line2\n\n' }],
          []
        );
      });
    });

    describe('updateMessage', () => {
      it('success', async () => {
        const updatedApiResponseMessage = createSerializedMessageFixture({ id: '5d111' });

        apiClient.room.put.mockResolvedValue(updatedApiResponseMessage);

        await testAction(
          actions.updateMessage,
          null,
          { messageEditState: { id: '5d111', text: 'updated text' } },
          [
            { type: 'UPDATE_MESSAGE', payload: { id: '5d111', loading: true, error: false } },
            {
              type: 'UPDATE_MESSAGE',
              payload: { id: '5d111', loading: false, error: false, ...updatedApiResponseMessage }
            }
          ],
          [{ type: 'cancelEdit' }]
        );

        expect(apiClient.room.put).toHaveBeenCalledWith(`/chatMessages/5d111`, {
          text: 'updated text'
        });
      });
      it('failure', async () => {
        const originalMessage = createSerializedMessageFixture({ id: '5d111' });
        apiClient.room.put.mockRejectedValue(null);

        await testAction(
          actions.updateMessage,
          null,
          {
            messageEditState: { id: '5d111', text: 'updated text' },
            messageMap: { '5d111': originalMessage }
          },
          [
            { type: 'UPDATE_MESSAGE', payload: { id: '5d111', loading: true, error: false } },
            {
              type: 'UPDATE_MESSAGE',
              payload: {
                id: '5d111',
                loading: false,
                error: true,
                text: 'updated text',
                html: undefined
              }
            }
          ],
          [{ type: 'cancelEdit' }]
        );
      });
    });

    it('editMessage', async () => {
      const testMessage = createSerializedMessageFixture({
        id: '5dabc',
        text: 'hello',
        sent: new Date()
      });
      await testAction(actions.editMessage, testMessage, { user: testMessage.fromUser }, [
        { type: types.UPDATE_MESSAGE_EDIT_STATE, payload: { id: '5dabc', text: 'hello' } }
      ]);
    });

    it('cancelEdit', async () => {
      await testAction(actions.cancelEdit, null, {}, [
        {
          type: types.UPDATE_MESSAGE_EDIT_STATE,
          payload: { id: null, text: null }
        }
      ]);
    });

    it('updateEditedText', async () => {
      await testAction(actions.updateEditedText, 'edited text', {}, [
        { type: types.UPDATE_MESSAGE_EDIT_STATE, payload: { text: 'edited text' } }
      ]);
    });

    it('editLastMessage', async () => {
      const createTestMessage = (id, userId, sentDateISOString) =>
        createSerializedMessageFixture({
          id,
          fromUser: { id: userId },
          sent: sentDateISOString
        });
      const state = {
        user: { id: 'currentUserId' },
        childMessages: [
          createTestMessage('5d111', 'currentUserId', '2018-03-11:00:00:00.000Z'),
          //this is the latest message (latest as in order of `childMessages` array) that can be edited by currentUser
          createTestMessage('5d222', 'currentUserId', new Date().toISOString()),
          createTestMessage('5d333', 'currentUserId', '2018-03-11:00:00:00.000Z'),
          createTestMessage('5d444', 'otherUserId', new Date().toISOString())
        ]
      };
      await testAction(
        actions.editLastMessage,
        null,
        state,
        [],
        [{ type: 'editMessage', payload: state.childMessages[1] }]
      );
    });

    describe('fetchChildMessages', () => {
      it('success', async () => {
        apiClient.room.get.mockImplementation(() => Promise.resolve(['result1']));
        await testAction(
          actions.fetchChildMessages,
          undefined,
          { parentId: '5d11d571a2405419771cd3ee' },
          [
            { type: childMessagesVuexRequest.requestType },
            { type: childMessagesVuexRequest.successType },
            { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: ['result1'] }
          ]
        );
      });

      it('error', async () => {
        const testError = new Error();
        apiClient.room.get.mockImplementation(() => Promise.reject(testError));
        await testAction(
          actions.fetchChildMessages,
          undefined,
          { parentId: '5d11d571a2405419771cd3ee' },
          [
            { type: childMessagesVuexRequest.requestType },
            { type: childMessagesVuexRequest.errorType, payload: testError }
          ]
        );
      });
    });

    /**
     *  generateSequenceWithIds(3) = [{id:'0'},{id:'1'},{id:'2'}]
     */
    const generateSequenceWithIds = length =>
      new Array(length).fill(null).map((_, i) => ({ id: i.toString() }));

    describe('fetchInitialMessages', () => {
      it('calls fetchChildMessages', async () => {
        await testAction(
          actions.fetchInitialMessages,
          undefined,
          { parentId: 'parent-a1b2c3' },
          [{ type: types.SET_AT_BOTTOM_IF_SAME_PARENT, payload: 'parent-a1b2c3' }],
          [
            { type: 'fetchChildMessages' },
            { type: 'focusOnMessage', payload: { id: '49', block: 'end' } }
          ],
          { fetchChildMessages: generateSequenceWithIds(50) }
        );
      });

      it('calls fetchChildMessages and marks that we reached the top', async () => {
        await testAction(
          actions.fetchInitialMessages,
          undefined,
          { parentId: 'parent-a1b2c3' },
          [
            { type: types.SET_AT_BOTTOM_IF_SAME_PARENT, payload: 'parent-a1b2c3' },
            { type: types.SET_AT_TOP_IF_SAME_PARENT, payload: 'parent-a1b2c3' }
          ],
          [
            { type: 'fetchChildMessages' },
            { type: 'focusOnMessage', payload: { id: '9', block: 'end' } }
          ],
          { fetchChildMessages: generateSequenceWithIds(10) }
        );
      });
    });

    describe('fetchOlderMessages', () => {
      const testMessageOverrides = [{ id: '1' }, { id: '2' }];
      const childMessages = testMessageOverrides.map(m => createSerializedMessageFixture(m));

      it('calls fetchChildMessages with beforeId', async () => {
        await testAction(
          actions.fetchOlderMessages,
          undefined,
          { childMessages, childMessagesRequest: {} },
          [],
          [
            { type: 'fetchChildMessages', payload: { beforeId: '1' } },
            { type: 'focusOnMessage', payload: { id: '49', block: 'start' } }
          ],
          { fetchChildMessages: generateSequenceWithIds(50) }
        );
      });

      it('calls fetchChildMessages and marks that we reached the top', async () => {
        await testAction(
          actions.fetchOlderMessages,
          undefined,
          { childMessages, childMessagesRequest: {}, parentId: 'parent-a1b2c3' },
          [{ type: types.SET_AT_TOP_IF_SAME_PARENT, payload: 'parent-a1b2c3' }],
          [
            { type: 'fetchChildMessages', payload: { beforeId: '1' } },
            { type: 'focusOnMessage', payload: { id: '9', block: 'start' } }
          ],
          { fetchChildMessages: generateSequenceWithIds(10) }
        );
      });

      it('does nothing when we reached the top already', async () => {
        await testAction(
          actions.fetchOlderMessages,
          undefined,
          { atTop: true, childMessagesRequest: {} },
          [],
          []
        );
      });

      it('does nothing when there are no child messages', async () => {
        await testAction(
          actions.fetchOlderMessages,
          undefined,
          { childMessages: [], childMessagesRequest: {} },
          [],
          []
        );
      });

      // this happens when we close and open fully loaded thread
      it('can handle receiving empty list of messages', async () => {
        await testAction(
          actions.fetchOlderMessages,
          undefined,
          { childMessages, childMessagesRequest: {}, parentId: 'parent-a1b2c3' },
          [{ type: types.SET_AT_TOP_IF_SAME_PARENT, payload: 'parent-a1b2c3' }],
          [{ type: 'fetchChildMessages', payload: { beforeId: '1' } }],
          { fetchChildMessages: [] }
        );
      });
    });

    describe('fetchNewerMessages', () => {
      const testMessageOverrides = [{ id: '1' }, { id: '2' }];
      const childMessages = testMessageOverrides.map(m => createSerializedMessageFixture(m));

      it('calls fetchChildMessages with afterId', async () => {
        await testAction(
          actions.fetchNewerMessages,
          undefined,
          { childMessages, childMessagesRequest: {} },
          [],
          [
            { type: 'fetchChildMessages', payload: { afterId: '2' } },
            { type: 'focusOnMessage', payload: { id: '0', block: 'end' } }
          ],
          { fetchChildMessages: generateSequenceWithIds(50) }
        );
      });

      it('calls fetchChildMessages and marks that we reached the bottom', async () => {
        await testAction(
          actions.fetchNewerMessages,
          undefined,
          { childMessages, childMessagesRequest: {}, parentId: 'parent-a1b2c3' },
          [{ type: types.SET_AT_BOTTOM_IF_SAME_PARENT, payload: 'parent-a1b2c3' }],
          [
            { type: 'fetchChildMessages', payload: { afterId: '2' } },
            { type: 'focusOnMessage', payload: { id: '0', block: 'end' } }
          ],
          { fetchChildMessages: generateSequenceWithIds(10) }
        );
      });

      it('does nothing when we reached the bottom already', async () => {
        await testAction(
          actions.fetchNewerMessages,
          undefined,
          { atBottom: true, childMessagesRequest: {} },
          [],
          []
        );
      });

      it('does nothing when there are no child messages', async () => {
        await testAction(
          actions.fetchNewerMessages,
          undefined,
          { childMessages: [], childMessagesRequest: {} },
          [],
          []
        );
      });

      // this happens when we close and open fully loaded thread
      it('can handle receiving empty list of messages', async () => {
        await testAction(
          actions.fetchNewerMessages,
          undefined,
          { childMessages, childMessagesRequest: {}, parentId: 'parent-a1b2c3' },
          [{ type: types.SET_AT_BOTTOM_IF_SAME_PARENT, payload: 'parent-a1b2c3' }],
          [{ type: 'fetchChildMessages', payload: { afterId: '2' } }],
          { fetchChildMessages: [] }
        );
      });
    });

    it('highlightChildMessage opens TMF and highlights child message', async () => {
      await testAction(
        actions.highlightChildMessage,
        { parentId: 'abc', id: 'def' },
        {},
        // ideally, we would test the delayed mutation setting highlighted to false, but we won't wait
        // 5 seconds for it, the risk and impact of highlight staying on are low
        [{ type: rootTypes.UPDATE_MESSAGE, payload: { id: 'def', highlighted: true } }],
        [{ type: 'open', payload: 'abc' }]
      );
    });

    it('focusOnMessage opens TMF and sets message as focusedAt with given block', async () => {
      await testAction(
        actions.focusOnMessage,
        { id: 'abc', block: 'start' },
        { messageMap: { abc: { id: 'abc', parentId: 'def' } } },
        // ideally, we would test the delayed mutation setting focusedAt to false, but we won't wait
        // 5 seconds for it, the risk and impact of focusedAt staying on are low
        [
          {
            type: rootTypes.UPDATE_MESSAGE,
            payload: { id: 'abc', focusedAt: { block: 'start', timestamp: 1479427200000 } }
          }
        ],
        [
          {
            type: 'open',
            payload: 'def'
          }
        ]
      );
    });
  });

  describe('mutations', () => {
    it('TOGGLE_THREAD_MESSAGE_FEED sets new opened state', () => {
      const state = {};
      mutations[types.TOGGLE_THREAD_MESSAGE_FEED](state, true);
      expect(state.isVisible).toEqual(true);
    });

    it('UPDATE_DRAFT_MESSAGE', () => {
      const state = {};
      mutations[types.UPDATE_DRAFT_MESSAGE](state, 'new draft message');
      expect(state.draftMessage).toEqual('new draft message');
    });

    it('SET_PARENT_MESSAGE_ID', () => {
      const state = {};
      mutations[types.SET_PARENT_MESSAGE_ID](state, '5d147ea84dad9dfbc522317a');
      expect(state.parentId).toEqual('5d147ea84dad9dfbc522317a');
    });

    it('SET_AT_TOP_IF_SAME_PARENT', () => {
      const state = {};
      mutations[types.SET_AT_TOP_IF_SAME_PARENT](state);
      expect(state.atTop).toEqual(true);
    });

    it('SET_AT_BOTTOM_IF_SAME_PARENT', () => {
      const state = {};
      mutations[types.SET_AT_BOTTOM_IF_SAME_PARENT](state);
      expect(state.atBottom).toEqual(true);
    });

    it('RESET_THREAD_STATE', () => {
      const state = {
        parentId: '5d147ea84dad9dfbc522317a',
        draftMessage: 'abc',
        atTop: true,
        atBottom: true
      };
      mutations[types.RESET_THREAD_STATE](state);
      expect(state).toEqual({
        parentId: null,
        draftMessage: '',
        atTop: false,
        atBottom: false,
        messageEditState: { id: null, text: null }
      });
    });

    it('SET_MESSAGE_EDIT_STATE', () => {
      const state = {};
      mutations[types.UPDATE_MESSAGE_EDIT_STATE](state, { id: '5d123', text: 'hello' });
      expect(state.messageEditState).toEqual({ id: '5d123', text: 'hello' });
    });

    it('includes childMessageVuexRequest', () => {
      const state = childMessagesVuexRequest.initialState;
      mutations[childMessagesVuexRequest.errorType](state);
      expect(state.childMessagesRequest.error).toEqual(true);
    });
  });

  describe('getters', () => {
    it('parentMessage', () => {
      const parentMessage = createSerializedMessageFixture();
      const state = { parentId: parentMessage.id };
      const rootState = { messageMap: { [parentMessage.id]: parentMessage } };
      const result = getters.parentMessage(state, {}, rootState);
      expect(result).toEqual(parentMessage);
    });

    it('childMessages filters messages by parentId and sorts them by sent date', () => {
      const testMessageOverrides = [
        { id: '1' },
        { id: '2', parentId: '1a2b3c', sent: '2016-05-18T02:48:51.386Z' },
        { id: '3', parentId: '1a2b3c', sent: '2016-05-17T02:48:51.386Z' }
      ];
      const messageMap = testMessageOverrides.reduce(
        (acc, m) => ({ ...acc, [m.id]: createSerializedMessageFixture(m) }),
        {}
      );
      const state = { parentId: '1a2b3c' };
      const rootState = { messageMap };
      const result = getters.childMessages(state, {}, rootState);
      expect(result.map(m => m.id)).toEqual(['3', '2']);
    });
  });
});
