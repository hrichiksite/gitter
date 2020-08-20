'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');

describe('ensure-access-and-fetch-descriptor #slow', function() {
  this.timeout(10000);

  fixtureLoader.disableMongoTableScans();
  fixtureLoader.ensureIntegrationEnvironment(
    '#integrationUser1',
    '#integrationGitlabUser1',
    'GITLAB_GROUP1_ID',
    'GITLAB_GROUP1_URI',
    'GITLAB_PUBLIC_PROJECT1_ID',
    'GITLAB_PUBLIC_PROJECT1_URI'
  );

  var fixture = fixtureLoader.setup({
    user1: '#integrationUser1',
    userGitlab1: '#integrationGitlabUser1'
  });

  it('should return a descriptor for type null', async () => {
    const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
      security: 'PUBLIC'
    });

    assert.deepEqual(sd, {
      type: null,
      admins: 'MANUAL',
      public: true,
      members: 'PUBLIC',
      extraMembers: [],
      extraAdmins: [fixture.user1._id]
    });
  });

  it('should throw an error if you give it an unknown type', async () => {
    await assert.rejects(ensureAccessAndFetchDescriptor(fixture.user1, { type: 'foo' }), err => {
      assert.strictEqual(err.status, 400);
      return true;
    });
  });

  describe('GitHub', () => {
    it('should return a descriptor for a github org if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_ORG',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
      });
    });

    it('should return a descriptor for a github user if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_USER',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_USER',
        members: 'PUBLIC',
        admins: 'GH_USER_SAME',
        public: true,
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID,
        extraAdmins: [] // no user id because the username matches
      });
    });

    it('should return a descriptor for a github repo if the user has access', async () => {
      const linkPath = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;

      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_REPO',
        linkPath: linkPath,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
      });
    });

    it('should return a descriptor for an unknown github owner if the user has access', async () => {
      // suppose you don't know if linkPath is an org or user and you're just
      // upserting a group for it
      const linkPath = fixtureLoader.GITTER_INTEGRATION_ORG;

      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_GUESS',
        linkPath: linkPath,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
      });
    });

    it('should throw an error if the returned github type does not match as expected', async () => {
      await assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.user1, {
          type: 'GH_ORG',
          linkPath: fixtureLoader.GITTER_INTEGRATION_REPO_FULL,
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    it('should throw an error if the user does not have access', async () => {
      assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.user1, {
          type: 'GH_ORG',
          linkPath: 'gitterHQ',
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });

    it('should throw an error if the github object does not exist', async () => {
      assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.user1, {
          type: 'GH_ORG',
          linkPath: 'foo-foo-does-not-exist',
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 404);
          return true;
        }
      );
    });
  });

  describe('GitLab', () => {
    it('should return a descriptor for a GitLab user if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
        type: 'GL_USER',
        linkPath: fixtureLoader.GITLAB_USER_USERNAME,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GL_USER',
        members: 'PUBLIC',
        admins: 'GL_USER_SAME',
        public: true,
        linkPath: fixtureLoader.GITLAB_USER_USERNAME,
        externalId: fixtureLoader.GITLAB_USER_ID
      });
    });

    it('should return a descriptor for a GitLab group if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
        type: 'GL_GROUP',
        linkPath: fixtureLoader.GITLAB_GROUP1_URI,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GL_GROUP',
        members: 'PUBLIC',
        admins: 'GL_GROUP_MAINTAINER',
        public: true,
        linkPath: fixtureLoader.GITLAB_GROUP1_URI,
        externalId: fixtureLoader.GITLAB_GROUP1_ID
      });
    });

    it('should return a descriptor for a GitLab project if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
        type: 'GL_PROJECT',
        linkPath: fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GL_PROJECT',
        members: 'PUBLIC',
        admins: 'GL_PROJECT_MAINTAINER',
        public: true,
        linkPath: fixtureLoader.GITLAB_PUBLIC_PROJECT1_URI,
        externalId: fixtureLoader.GITLAB_PUBLIC_PROJECT1_ID
      });
    });

    it('should throw an error if the returned GitLab type does not match as expected', async () => {
      assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_GROUP',
          linkPath: fixtureLoader.GITLAB_USER_USERNAME,
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 400);
          return true;
        }
      );
    });

    it('should throw an error if the user does not have access to group', async () => {
      assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_GROUP',
          linkPath: 'gitlab-org/gitter',
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });

    it('should throw an error if the user does not have access to project', async () => {
      assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_PROJECT',
          linkPath: 'gitlab-org/gitter/webapp',
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });

    it('should throw an error if the GitLab object does not exist', async () => {
      assert.rejects(
        ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_GROUP',
          linkPath: 'foo-foo-does-not-exist',
          security: 'PUBLIC'
        }),
        err => {
          assert.strictEqual(err.status, 404);
          return true;
        }
      );
    });
  });
});
