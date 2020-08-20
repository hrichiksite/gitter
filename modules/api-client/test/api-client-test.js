'use strict';

const proxyquireNoCallThru = require('proxyquire').noCallThru();
const assert = require('assert');
const sinon = require('sinon');

const BASE_URL = 'http://test-api-url.com';
const ACCESS_TOKEN = 'test-token';
const USER_ID = 'user1';
const TROUPE_ID = 'troupe1';

describe('api-client', () => {
  const prepareTestApiClient = (status, data) => {
    const ajaxSpy = sinon.spy();
    const ajax = options => {
      ajaxSpy(options);
      options.success(data, null, { status });
    };
    const mockJQuery = { ajax };
    const Resource = proxyquireNoCallThru('../lib/resource', {
      jquery: mockJQuery
    });
    const ApiClient = proxyquireNoCallThru('../lib/api-client', {
      './resource': Resource
    });
    const apiClient = new ApiClient({
      baseUrl: BASE_URL,
      accessToken: ACCESS_TOKEN,
      getUserId: () => USER_ID,
      getTroupeId: () => TROUPE_ID
    });
    return { apiClient, ajaxSpy };
  };
  describe('users', () => {
    it('user config to get user resource', async () => {
      const { apiClient, ajaxSpy } = prepareTestApiClient(200, []);

      await apiClient.user.get('/settings');
      assert(ajaxSpy.called);
      const ajaxOptions = ajaxSpy.args[0][0];
      assert.equal(ajaxOptions.url, 'http://test-api-url.com/v1/user/user1/settings');
      assert.deepEqual(ajaxOptions.headers, { 'x-access-token': 'test-token' });
      assert.equal(ajaxOptions.type, 'get');
    });
  });

  describe('threads', () => {
    const PARENT_ID = '5d4033ed5c31fc3a315aa2aa';
    it('should call the thread endpoint', async () => {
      const { apiClient, ajaxSpy } = prepareTestApiClient(200, []);
      await apiClient.room.get(`/chatMessages/${PARENT_ID}/thread`);
      assert(ajaxSpy.called);
      const ajaxOptions = ajaxSpy.args[0][0];
      assert.equal(
        ajaxOptions.url,
        `${BASE_URL}/v1/rooms/${TROUPE_ID}/chatMessages/${PARENT_ID}/thread`
      );
      assert.deepEqual(ajaxOptions.headers, { 'x-access-token': 'test-token' });
      assert.equal(ajaxOptions.type, 'get');
    });
  });
});
