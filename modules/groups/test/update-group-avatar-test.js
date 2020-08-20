'use strict';

const updateGroupAvatar = require('../lib/update-group-avatar');
const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const Group = require('gitter-web-persistence').Group;

describe('updateGroupAvatar', () => {
  describe('integration tests #slow', () => {
    const fixture = fixtureLoader.setup({
      group1: {
        securityDescriptor: {
          type: 'GH_USER',
          linkPath: 'suprememoocow'
        }
      },
      group2: {
        securityDescriptor: {
          type: 'GH_USER',
          linkPath: 'suprememoocow'
        }
      },
      groupBasedOnGitlabGroup1: {
        securityDescriptor: {
          type: 'GL_GROUP',
          linkPath: 'gitter-integration-tests-group',
          externalId: 3281315
        }
      },
      groupBasedOnGitlabProject1: {
        securityDescriptor: {
          type: 'GL_PROJECT',
          linkPath: 'gitter-integration-tests-group/public-project1',
          externalId: 7616684
        }
      },
      groupBasedOnGitlabUser1: {
        securityDescriptor: {
          type: 'GL_USER',
          linkPath: 'gitter-integration-tests',
          externalId: 2619770
        }
      }
    });

    it('should update GitHub avatar', async () => {
      const n = Date.now();

      const result = await updateGroupAvatar(fixture.group1);
      assert.strictEqual(result, true);

      const group1 = await Group.findById(fixture.group1._id).exec();
      assert(group1.avatarVersion >= 3);
      assert(group1.avatarCheckedDate >= n);
    });

    it('should update GitLab group avatar', async () => {
      const n = Date.now();

      const result = await updateGroupAvatar(fixture.groupBasedOnGitlabGroup1);
      assert.strictEqual(result, true);

      const groupBasedOnGitlabGroup1 = await Group.findById(
        fixture.groupBasedOnGitlabGroup1._id
      ).exec();
      assert(groupBasedOnGitlabGroup1.avatarUrl);
      assert.strictEqual(groupBasedOnGitlabGroup1.avatarVersion, 1);
      assert(groupBasedOnGitlabGroup1.avatarCheckedDate >= n);
    });

    it('should update GitLab project avatar', async () => {
      const n = Date.now();

      const result = await updateGroupAvatar(fixture.groupBasedOnGitlabProject1);
      assert.strictEqual(result, true);

      const groupBasedOnGitlabProject1 = await Group.findById(
        fixture.groupBasedOnGitlabProject1._id
      ).exec();
      assert(groupBasedOnGitlabProject1.avatarUrl);
      assert.strictEqual(groupBasedOnGitlabProject1.avatarVersion, 1);
      assert(groupBasedOnGitlabProject1.avatarCheckedDate >= n);
    });

    it('should update GitLab user avatar', async () => {
      const n = Date.now();

      const result = await updateGroupAvatar(fixture.groupBasedOnGitlabUser1);
      assert.strictEqual(result, true);

      const groupBasedOnGitlabUser1 = await Group.findById(
        fixture.groupBasedOnGitlabUser1._id
      ).exec();
      assert(groupBasedOnGitlabUser1.avatarUrl);
      assert.strictEqual(groupBasedOnGitlabUser1.avatarVersion, 1);
      assert(groupBasedOnGitlabUser1.avatarCheckedDate >= n);
    });

    it('should not perform double fetches', async () => {
      const a = await updateGroupAvatar(fixture.group2);
      const b = await updateGroupAvatar(fixture.group2);
      assert(
        Boolean(a) !== Boolean(b),
        `expected one updateGroupAvatar call to return false (a=${a}, b=${b})`
      );
    });
  });
});
