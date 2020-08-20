const assert = require('assert');

const VuexApiRequest = require('./vuex-api-request').default;

describe('VuexApiRequest', () => {
  const testInstance = new VuexApiRequest('CHAT_MESSAGES', 'path.to.state');

  describe('types', () => {
    it('should correctly create all types', () => {
      assert.equal(testInstance.requestType, 'REQUEST_CHAT_MESSAGES');
      assert.equal(testInstance.successType, 'RECEIVE_CHAT_MESSAGES_SUCCESS');
      assert.equal(testInstance.errorType, 'RECEIVE_CHAT_MESSAGES_ERROR');
    });
  });

  describe('initialState', () => {
    it('should create nested structure', () => {
      const initialState = testInstance.initialState;
      assert.deepEqual(initialState, {
        path: { to: { state: { loading: false, error: null, results: [] } } }
      });
    });
  });

  describe('mutations', () => {
    it('should correctly set state during request', () => {
      const testState = testInstance.initialState;
      testInstance.mutations[testInstance.requestType](testState);
      assert.deepEqual(testState, {
        path: { to: { state: { loading: true, error: false, results: [] } } }
      });
    });

    it('should correctly set state after success', () => {
      const testState = testInstance.initialState;
      testInstance.mutations[testInstance.successType](testState, ['result1']);
      assert.deepEqual(testState, {
        path: { to: { state: { loading: false, error: false, results: ['result1'] } } }
      });
    });

    it('should correctly set state after error', () => {
      const testState = testInstance.initialState;
      testInstance.mutations[testInstance.errorType](testState);
      assert.deepEqual(testState, {
        path: { to: { state: { loading: false, error: true, results: [] } } }
      });
    });

    it('should correctly add error object to the state', () => {
      const testState = testInstance.initialState;
      const testError = new Error();
      testInstance.mutations[testInstance.errorType](testState, testError);
      assert.deepEqual(testState, {
        path: { to: { state: { loading: false, error: testError, results: [] } } }
      });
    });
  });
});
