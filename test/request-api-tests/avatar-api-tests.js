'use strict';

process.env.DISABLE_API_LISTEN = '1';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const sinon = require('sinon');
const express = require('express');

describe('avatar-api', function() {
  var app, request;

  fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USERNAME', '#oauthTokens');

  before(function() {
    if (this._skipFixtureSetup) return;

    request = require('supertest');
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }]
    },
    user1: {
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      gravatarImageUrl: 'https://avatars.githubusercontent.com/gitter-integration-tests?v=3'
    },
    group1: {
      uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase(),
      avatarVersion: 6,
      avatarCheckedDate: new Date(),
      securityDescriptor: {
        type: 'GH_USER',
        admins: 'GH_USER_SAME',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
      }
    },
    group2: {
      avatarUrl:
        'https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/original',
      avatarVersion: 1,
      avatarCheckedDate: new Date(),
      securityDescriptor: {
        type: null
      }
    }
  });

  var FIXTURES_TEMPLATES = [
    {
      name: '/group/i/:groupId',
      url: null,
      expected: null,
      proxyRedirect:
        '/fetch/https://avatars.githubusercontent.com/gitter-integration-tests?s=128&v=6'
    },
    {
      name: '/group/i/:groupId - custom avatar',
      url: null,
      expected: null,
      proxyRedirect:
        '/fetch/https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/128?v=1'
    },
    {
      name: '/group/iv/:version/:groupId',
      url: null,
      expected: null,
      proxyRedirect:
        '/fetch_lt/https://avatars.githubusercontent.com/gitter-integration-tests?s=128&v=6'
    },
    {
      name: '/group/iv/:version/:groupId - custom avatar',
      url: null,
      expected: null,
      proxyRedirect:
        '/fetch_lt/https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/128?v=1'
    },
    {
      name: '/g/u/:username',
      url: '/g/u/' + fixtureLoader.GITTER_INTEGRATION_USERNAME,
      expected: null,
      proxyRedirect:
        '/fetch_lt/https://avatars.githubusercontent.com/gitter-integration-tests?v=3&s=128'
    },
    {
      name: '/gravatar/e/:email',
      url: '/gravatar/e/andrewn@datatribe.net',
      expected: null,
      proxyRedirect:
        '/fetch_lt/https://secure.gravatar.com/avatar/2644d6233d2c210258362f7f0f5138c2?d=https%3A%2F%2Favatars.gitter.im%2Fdefault.png&s=128'
    },
    {
      name: '/gravatar/m/:md5',
      url: '/gravatar/m/2644d6233d2c210258362f7f0f5138c2',
      expected: null,
      proxyRedirect:
        '/fetch_lt/https://secure.gravatar.com/avatar/2644d6233d2c210258362f7f0f5138c2?d=https%3A%2F%2Favatars.gitter.im%2Fdefault.png&s=128'
    },
    {
      name: '/tw/i/:id/:filename',
      url: '/tw/i/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg',
      expected: null,
      proxyRedirect:
        '/fetch/https://pbs.twimg.com/profile_images/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg'
    },
    {
      name: '/gh/u/:username',
      url: '/gh/u/suprememoocow',
      expected: null,
      proxyRedirect: '/fetch/https://avatars.githubusercontent.com/suprememoocow?s=128'
    },
    {
      name: '/gh/uv/:version/:username',
      url: '/gh/uv/3/' + fixtureLoader.GITTER_INTEGRATION_USERNAME,
      expected: null,
      proxyRedirect:
        '/fetch_lt/https://avatars.githubusercontent.com/gitter-integration-tests?v=3&s=128'
    },
    {
      name: '/invalid_does_not_exist',
      url: '/invalid_does_not_exist',
      expected: 302,
      proxyRedirect: '/missing'
    }
  ];

  before(function() {
    if (this._skipFixtureSetup) return;

    FIXTURES_TEMPLATES[0].url = '/group/i/' + fixture.group1.id;
    FIXTURES_TEMPLATES[1].url = '/group/i/' + fixture.group2.id;
    FIXTURES_TEMPLATES[2].url = '/group/iv/1/' + fixture.group1.id;
    FIXTURES_TEMPLATES[3].url = '/group/iv/1/' + fixture.group2.id;
  });

  describe('direct', function() {
    FIXTURES_TEMPLATES.forEach(function(META) {
      it('GET /private/avatars' + META.name, function() {
        return request(app)
          .get('/private/avatars' + META.url)
          .expect(META.expected || 302);
      });
    });
  });

  describe('via avatar proxy', function() {
    FIXTURES_TEMPLATES.forEach(function(META) {
      it('GET /private/avatars' + META.name, function() {
        return request(app)
          .get('/private/avatars' + META.url)
          .set('x-avatar-server', '1')
          .expect(200)
          .then(function(response) {
            assert.strictEqual(response.headers['x-accel-redirect'], META.proxyRedirect);
          });
      });
    });
  });

  describe('GitLab user avatar', () => {
    it('GET /private/avatars/gl/u/:username direct', async () => {
      const requestStub = sinon.stub();
      requestStub.callsArgWith(1, null, {
        body: {
          avatar_url: 'http://example.com/avatar'
        }
      });
      const avatarIndex = proxyquireNoCallThru('../../server/api/private/avatars/index.js', {
        request: requestStub
      });
      const app = express();
      app.use(avatarIndex);

      // testing both valid characters and characters that need to be escaped
      const response = await request(app)
        .get('/gl/u/validUsername~_.-no%C4%A0')
        .expect(302);

      assert.strictEqual(response.headers['location'], 'http://example.com/avatar');
      assert.deepStrictEqual(
        requestStub.firstCall.args[0].uri,
        'https://gitlab.com/api/v4/users?username=validUsername~_.-no%C4%A0'
      );
    });
  });
});
