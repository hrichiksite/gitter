'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest');

const app = require('../../../server/web');

describe('user-admin-groups-export-api', function() {
  fixtureLoader.ensureIntegrationEnvironment('#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;
  });

  var fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal',
      githubId: undefined,
      githubToken: undefined
    },
    userNoExport1: {
      accessToken: 'web-internal'
    },
    group1: {
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    },
    group2: {
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    },
    groupNoExport1: {
      securityDescriptor: {
        extraAdmins: ['userNoExport1']
      }
    }
  });

  it('GET /api_web/export/user/:user_id/admin-groups.ndjson as same user gets data', async () => {
    return request(app)
      .get(`/api_web/export/user/${fixture.user1.id}/admin-groups.ndjson`)
      .set('Accept', 'application/x-ndjson,application/json')
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(200)
      .then(function(result) {
        assert.strictEqual(
          result.text.split('\n').length,
          3,
          'includes 2 admin groups (extra newline at the end)'
        );
        assert(result.text.includes(fixture.group1.id), 'includes group1');
        assert(result.text.includes(fixture.group2.id), 'includes group2');
        assert(!result.text.includes(fixture.groupNoExport1.id), 'does not include groupNoExport1');
      });
  });
});
