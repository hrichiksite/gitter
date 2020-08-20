'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const assert = require('assert');
const request = require('supertest');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const express = require('express');

const router = express.Router({ caseSensitive: true, mergeParams: true });

// Borrow the health check routes from /api/
router.get('/private/health_check', function() {
  throw new Error('My fake error for testing');
});

const app = proxyquireNoCallThru('../../../../server/web', {
  './api-web/': router
});

describe('express-error-handler', function() {
  it('handles error thrown and presents error page', function() {
    return request(app)
      .get(`/api_web/private/health_check`)
      .expect(500)
      .then(function(result) {
        assert(result.text.includes('Gitter – Internal Server Error'), 'response has error title');
        assert(result.text.includes('Something went wrong'), 'response has friendly message');
      });
  });
});
