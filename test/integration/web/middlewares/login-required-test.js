'use strict';

var loginRequired = require('../../test-require')('./web/middlewares/login-required');
var assert = require('assert');

describe('login-required', function() {
  it('redirects to /login by default', function(done) {
    var req = {
      nonApiRoute: true,
      query: {}
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('redirects to /login/gitlab if GitLab provider is given', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'gitlab'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login/gitlab');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('redirects to /login/twitter if twitter provider is given', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'twitter'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login/twitter');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('redirects to /login/github if github provider is given', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'github'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login/github');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('redirects to /login/google if google provider is given', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'google'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login/google');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('redirects to /login/linkedin if linkedin provider is given', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'linkedin'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login/linkedin');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('redirects to /login if a garbage provider is given', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'mcdonalds'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('passes tracking info to /login/github if tracking info is present', function(done) {
    var req = {
      nonApiRoute: true,
      query: {
        auth_provider: 'github',
        action: 'login',
        source: 'login_page-login'
      }
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login/github?action=login&source=login_page-login');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('sets the returnTo if redirecting', function(done) {
    var req = {
      nonApiRoute: true,
      originalUrl: '/my-secret-page',
      query: {},
      session: {}
    };

    var res = {
      relativeRedirect: function() {
        assert.equal(req.session.returnTo, '/my-secret-page');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('sends a 401 for json api requests', function(done) {
    var req = {
      nonApiRoute: false,
      query: {},
      accepts: function() {
        return 'json';
      }
    };

    var res = {
      status: function(number) {
        assert.equal(number, '401');
        return {
          send: function() {
            done();
          }
        };
      }
    };

    loginRequired(req, res);
  });
});
