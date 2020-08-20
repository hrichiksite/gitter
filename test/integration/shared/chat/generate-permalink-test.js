'use strict';

const assert = require('assert');
const moment = require('moment');

const testRequire = require('../../test-require');
const generatePermalink = testRequire('../shared/chat/generate-permalink');
var clientEnv = require('gitter-client-env');

describe('generate-permalink', () => {
  const basePath = clientEnv['basePath'];
  const troupeName = 'group/room';
  const id = '5c94afb8b9552a27a7930fbb';
  const sent = moment('2019-03-22T09:49:43.939Z', moment.defaultFormat);

  it('should generate normal permalink', () => {
    const permalink = generatePermalink(troupeName, id, sent, false);
    assert.strictEqual(permalink, `${basePath}/group/room?at=5c94afb8b9552a27a7930fbb`);
  });

  it('should generate archive permalink', () => {
    const permalink = generatePermalink(troupeName, id, sent, true);
    assert.strictEqual(
      permalink,
      `${basePath}/group/room/archives/2019/03/22?at=5c94afb8b9552a27a7930fbb`
    );
  });
});
