'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var request = require('supertest');

var app = require('../../../../server/web');

describe('handlers/app/archive', () => {
  var fixture = fixtureLoader.setup({
    user1: {},
    troupe1: {
      users: ['user1']
    },
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      readBy: [],
      text: '3nd of January in Australia',
      sent: new Date('2018-01-02T20:00:00.000Z')
    }
  });

  describe('chat archive', () => {
    it('GET /{troupe.uri}/archives/2018/01/02?at={messageId} returns archive', async function() {
      // this test takes around 100ms when run in the whole suite
      // when running only this suite it can take around 3s
      this.timeout(5000);
      return request(app)
        .get(`/${fixture.troupe1.uri}/archives/2018/01/02?at=${fixture.message1.id}`)
        .set('Cookie', ['gitter_tz=-1000:Australian Eastern Standard Time:Australia/Melbourne'])
        .expect(200);
    });

    it('GET /{troupe.uri}/archives/2018/01/03?at={messageId} redirects to previous day archive', async function() {
      const response = await request(app)
        .get(`/${fixture.troupe1.uri}/archives/2018/01/03?at=${fixture.message1.id}`)
        .set('Cookie', ['gitter_tz=-0200:Central European Summer Time:Europe/Prague'])
        .expect(302);
      assert(response.headers.location.includes('/archives/2018/01/02?at='));
    });
  });
});
