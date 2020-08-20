'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../server/web');

// Finds the regex in the text and creates an excerpt so the test failure message can more easily be understood
function findInText(text, regex, excerptBufferLength = 16) {
  const result = text.match(regex);

  if (result) {
    return {
      excerpt: text.substring(
        Math.max(0, result.index - excerptBufferLength),
        Math.min(result.index + result[0].length + excerptBufferLength, text.length - 1)
      )
    };
  }
}

describe('Rooms', function() {
  const fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    troupeUnjoined1: {}
  });

  it(`Ensure there aren't unserialized documents handed off to the frontend`, async () => {
    const result = await request(app)
      .get(`/${fixture.troupeUnjoined1.uri}`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200);

    const idFindResults = findInText(result.text, /\b_id\b/m);
    assert(
      !idFindResults,
      `response should not include unserialized \`_id\` property (expecting \`id\`): ${idFindResults &&
        idFindResults.excerpt}`
    );

    const versionFindResults = findInText(result.text, /\b__v\b/m);
    assert(
      !versionFindResults,
      `response should not include unserialized \`__v\` property (expecting \`v\` or nothing): ${versionFindResults &&
        versionFindResults.excerpt}`
    );
  });
});
