const assert = require('assert');

const VuexMessageRequest = require('./vuex-message-request').default;

describe('VuexApiRequest', () => {
  const testInstance = new VuexMessageRequest('5d123');

  it('loadingMutation', () => {
    const mutation = testInstance.loadingMutation({ extra: 'prop' });
    assert.deepStrictEqual(mutation, [
      'UPDATE_MESSAGE',
      { id: '5d123', loading: true, error: false, extra: 'prop' },
      { root: true }
    ]);
  });

  it('errorMutation', () => {
    const mutation = testInstance.errorMutation({ extra: 'prop' });
    assert.deepStrictEqual(mutation, [
      'UPDATE_MESSAGE',
      { id: '5d123', loading: false, error: true, extra: 'prop' },
      { root: true }
    ]);
  });

  it('successMutation', () => {
    const mutation = testInstance.successMutation({ extra: 'prop' });
    assert.deepStrictEqual(mutation, [
      'UPDATE_MESSAGE',
      { id: '5d123', loading: false, error: false, extra: 'prop' },
      { root: true }
    ]);
  });
});
