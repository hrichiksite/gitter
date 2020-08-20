'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('admin-discovery', () => {
  describe('integration tests #slow', () => {
    fixtureLoader.disableMongoTableScans();

    let adminDiscovery;
    let githubOrgs;
    let gitlabGroups;
    let gitlabProjects;
    let URI = fixtureLoader.generateUri();

    const fixture = fixtureLoader.setup({
      userGithub1: {},
      userGithub2: {},
      userGithub1234: {
        githubId: 1234
      },
      groupBasedOnGithubUser1234: {
        securityDescriptor: {
          type: 'GH_USER',
          members: 'PUBLIC',
          admins: 'GH_USER_SAME',
          public: true,
          linkPath: 'some-fake-github-user',
          externalId: '1234'
        }
      },
      groupGithub1: {
        securityDescriptor: {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: URI,
          externalId: 'fakeExternalIdFor-groupGithub1',
          extraAdmins: ['userGithub1']
        }
      },

      userGitlab1: {},
      userGitlab2: {},
      userGitlab1234: {},
      identityGitlab1: {
        user: 'userGitlab1',
        provider: 'gitlab',
        providerKey: fixtureLoader.generateGithubId()
      },
      identityGitlab2: {
        user: 'userGitlab2',
        provider: 'gitlab',
        providerKey: fixtureLoader.generateGithubId()
      },
      identityGitlab1234: {
        user: 'userGitlab1234',
        provider: 'gitlab',
        providerKey: '1234'
      },
      groupBasedOnGitlabUser1234: {
        securityDescriptor: {
          type: 'GL_USER',
          members: 'PUBLIC',
          admins: 'GL_USER_SAME',
          public: true,
          linkPath: URI,
          externalId: '1234'
        }
      },
      groupBasedOnGitlabGroup1: {
        securityDescriptor: {
          type: 'GL_GROUP',
          members: 'PUBLIC',
          admins: 'GL_GROUP_MAINTAINER',
          public: true,
          linkPath: URI,
          externalId: 'fakeExternalIdFor-groupBasedOnGitlabGroup1',
          extraAdmins: ['userGitlab1']
        }
      },
      groupBasedOnGitlabProject1: {
        securityDescriptor: {
          type: 'GL_PROJECT',
          members: 'PUBLIC',
          admins: 'GL_PROJECT_MAINTAINER',
          public: true,
          linkPath: URI,
          externalId: 'fakeExternalIdFor-groupBasedOnGitlabProject1',
          extraAdmins: ['userGitlab1']
        }
      },

      deleteDocuments: {
        Group: [
          { 'sd.type': 'GH_USER', 'sd.externalId': '1234' },
          { 'sd.type': 'GH_ORG', 'sd.externalId': 'fakeExternalIdFor-groupGithub1' },
          { 'sd.type': 'GL_USER', 'sd.externalId': '1234' },
          { 'sd.type': 'GL_GROUP', 'sd.externalId': 'fakeExternalIdFor-groupBasedOnGitlabGroup1' },
          {
            'sd.type': 'GL_PROJECT',
            'sd.externalId': 'fakeExternalIdFor-groupBasedOnGitlabProject1'
          }
        ]
      }
    });

    beforeEach(() => {
      gitlabGroups = null;
      gitlabProjects = null;
      githubOrgs = null;
      adminDiscovery = proxyquireNoCallThru('../../lib/admin-discovery/index', {
        './gitlab-group': {
          getGitLabGroupAdminDescriptor: async () => {
            return gitlabGroups;
          }
        },
        './gitlab-project': {
          getGitLabProjectAdminDescriptor: async () => {
            return gitlabProjects;
          }
        },
        './github-org': {
          getGithubOrgAdminDescriptor: async () => {
            return githubOrgs;
          }
        }
      });
    });

    describe('discoverAdminGroups', () => {
      describe('GitLab', () => {
        it('should return nothing for users who are not admins of any groups', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
          assert.deepEqual(groups, []);
        });

        it('should return group for matching GitLab user', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab1234);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupBasedOnGitlabUser1234._id));
        });

        it('should return rooms where the user is in extraAdmins', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab1);

          assert.strictEqual(groups.length, 2);
          const groupIds = groups.map(group => String(group._id));
          assert(
            groupIds.includes(String(fixture.groupBasedOnGitlabGroup1._id)),
            `expected groupBasedOnGitlabGroup1(${fixture.groupBasedOnGitlabGroup1._id}) to be in groups returned ${groupIds}`
          );
          assert(
            groupIds.includes(String(fixture.groupBasedOnGitlabProject1._id)),
            `expected groupBasedOnGitlabProject1(${fixture.groupBasedOnGitlabProject1._id}) to be in groups returned ${groupIds}`
          );
        });

        it('should return rooms where the user is in extraAdmins and a group maintainer without dups', async () => {
          gitlabGroups = {
            type: 'GL_GROUP',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab1);
          assert.strictEqual(groups.length, 2);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupBasedOnGitlabGroup1._id));
          assert.strictEqual(String(groups[1]._id), String(fixture.groupBasedOnGitlabProject1._id));
        });

        describe('Groups', () => {
          it('should return groups where user can admin based on GitLab group URL', async () => {
            gitlabGroups = {
              type: 'GL_GROUP',
              linkPath: [URI]
            };

            const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
            assert.strictEqual(groups.length, 1);
            assert.strictEqual(String(groups[0]._id), String(fixture.groupBasedOnGitlabGroup1._id));
          });

          it('should return groups where user can admin based on GitLab group ID', async () => {
            gitlabGroups = {
              type: 'GL_GROUP',
              externalId: fixture.groupBasedOnGitlabGroup1.sd.externalId
            };

            const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
            assert.strictEqual(groups.length, 1);
            assert.strictEqual(String(groups[0]._id), String(fixture.groupBasedOnGitlabGroup1._id));
          });
        });

        describe('Projects', () => {
          it('should return groups where user can admin based on GitLab project URL', async () => {
            gitlabProjects = {
              type: 'GL_PROJECT',
              linkPath: [URI]
            };

            const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
            assert.strictEqual(groups.length, 1);
            assert.strictEqual(
              String(groups[0]._id),
              String(fixture.groupBasedOnGitlabProject1._id)
            );
          });

          it('should return groups where user can admin based on GitLab project ID', async () => {
            gitlabProjects = {
              type: 'GL_PROJECT',
              externalId: fixture.groupBasedOnGitlabProject1.sd.externalId
            };

            const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
            assert.strictEqual(groups.length, 1);
            assert.strictEqual(
              String(groups[0]._id),
              String(fixture.groupBasedOnGitlabProject1._id)
            );
          });
        });
      });

      describe('GitHub', () => {
        it('should return nothing for users who are not admins of any groups', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub2);
          assert.deepEqual(groups, []);
        });

        it('should return group for matching GitHub user', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub1234);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupBasedOnGithubUser1234._id));
        });

        it('should return groups where user can admin based on GitHub org URL', async () => {
          githubOrgs = {
            type: 'GH_ORG',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub2);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });

        it('should return groups where user can admin based on GitHub org ID', async () => {
          githubOrgs = {
            type: 'GH_ORG',
            externalId: fixture.groupGithub1.sd.externalId
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub2);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });

        it('should return rooms where the user is in extraAdmins', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub1);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });

        it('should return rooms where the user is in extraAdmins and an org member without dups', async () => {
          githubOrgs = {
            type: 'GH_ORG',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub1);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });
      });
    });
  });
});
