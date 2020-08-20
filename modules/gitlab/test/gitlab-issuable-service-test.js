'use strict';

const Promise = require('bluebird');
const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
//const GitLabIssuableService = require('..').GitLabIssuableService;
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('gitlab-issue-service #slow #gitlab', function() {
  // These tests timeout at 10000 sometimes otherwise
  this.timeout(30000);

  fixtureLoader.ensureIntegrationEnvironment(
    'GITLAB_USER_USERNAME',
    'GITLAB_USER_TOKEN',
    'GITLAB_PUBLIC_PROJECT1_URI',
    'GITLAB_PRIVATE_PROJECT1_URI',
    'GITLAB_UNAUTHORIZED_PRIVATE_PROJECT1_URI'
  );

  const FAKE_USER = {
    username: 'FAKE_USER'
  };

  let oauthToken = null;
  let GitLabIssuableService;

  beforeEach(() => {
    GitLabIssuableService = proxyquireNoCallThru('../lib/issuable-service', {
      './get-gitlab-access-token-from-user': function() {
        return Promise.resolve(oauthToken);
      }
    });
  });

  afterEach(() => {
    oauthToken = null;
  });

  describe('as a GitLab user', () => {
    beforeEach(() => {
      oauthToken = fixtureLoader.GITLAB_USER_TOKEN;
    });

    it('should fetch public issue', () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService.getIssue(fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, 1).then(issue => {
        assert.strictEqual(issue.iid, 1);
        assert.strictEqual(issue.state, 'open');
        assert.strictEqual(issue.author.username, fixtureLoader.GITLAB_USER_USERNAME);
      });
    });

    it("shouldn't fetch missing issue", () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService
        .getIssue(fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, 999999)
        .then(() => {
          assert.fail("Shouldn't be able to fetch missing issue");
        })
        .catch(err => {
          if (err instanceof assert.AssertionError) {
            throw err;
          }

          assert.strictEqual(err.status, 404);
        });
    });

    it('should fetch confidential issue', () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService.getIssue(fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, 2).then(issue => {
        assert.strictEqual(issue.iid, 2);
        assert.strictEqual(issue.state, 'open');
        assert.strictEqual(issue.author.username, fixtureLoader.GITLAB_USER_USERNAME);
      });
    });

    it('should fetch private issue', () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService.getIssue(fixtureLoader.GITLAB_PRIVATE_PROJECT1_URI, 1).then(issue => {
        assert.strictEqual(issue.iid, 1);
        assert.strictEqual(issue.state, 'open');
        assert.strictEqual(issue.author.username, fixtureLoader.GITLAB_USER_USERNAME);
      });
    });

    it("shouldn't fetch issue in unauthorized private project", () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService
        .getIssue(fixtureLoader.GITLAB_UNAUTHORIZED_PRIVATE_PROJECT1_URI, 1)
        .then(() => {
          assert.fail("Shouldn't be able to fetch issue in unauthorized private project");
        })
        .catch(err => {
          if (err instanceof assert.AssertionError) {
            throw err;
          }

          assert.strictEqual(err.status, 404);
        });
    });
  });

  describe('using public token pool', () => {
    beforeEach(() => {
      oauthToken = null;
    });

    it('should fetch public issue', () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService.getIssue(fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, 1).then(issue => {
        assert.strictEqual(issue.iid, 1);
        assert.strictEqual(issue.state, 'open');
        assert.strictEqual(issue.author.username, fixtureLoader.GITLAB_USER_USERNAME);
      });
    });

    it("shouldn't fetch confidential issue", () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService
        .getIssue(fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI, 2)
        .then(() => {
          assert.fail("Shouldn't be able to fetch confidential issue");
        })
        .catch(err => {
          if (err instanceof assert.AssertionError) {
            throw err;
          }

          assert.strictEqual(err.status, 404);
        });
    });

    it("shouldn't fetch private issue", () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService
        .getIssue(fixtureLoader.GITLAB_PRIVATE_PROJECT1_URI, 1)
        .then(() => {
          assert.fail("Shouldn't be able to fetch issue in unauthorized private project");
        })
        .catch(err => {
          if (err instanceof assert.AssertionError) {
            throw err;
          }

          assert.strictEqual(err.status, 404);
        });
    });

    it("shouldn't fetch issue in unauthorized private project", () => {
      const glService = new GitLabIssuableService(FAKE_USER, 'issues');
      return glService
        .getIssue(fixtureLoader.GITLAB_UNAUTHORIZED_PRIVATE_PROJECT1_URI, 1)
        .then(() => {
          assert.fail("Shouldn't be able to fetch issue in unauthorized private project");
        })
        .catch(err => {
          if (err instanceof assert.AssertionError) {
            throw err;
          }

          assert.strictEqual(err.status, 404);
        });
    });
  });
});
