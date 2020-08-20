'use strict';

const assert = require('assert');
const userLoaderFactory = require('../lib/user-loader-factory');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('user-loader-factory', function() {
  const fixture = fixtureLoader.setup({
    user1: {}
  });

  it('should return null if the userId is falsy', async () => {
    const user = await userLoaderFactory(undefined, { _id: '1' })();
    assert.equal(user, null);
  });

  it('should return user object if id is present', async () => {
    const user = await userLoaderFactory('1', { _id: '1' })();
    assert.deepEqual(user, { _id: '1' });
  });

  it('should lookup user by id if user object is not present', async () => {
    const user = await userLoaderFactory(fixture.user1._id, null)();
    assert.deepEqual(user._id, fixture.user1._id);
  });
});
