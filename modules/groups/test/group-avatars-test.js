'use strict';

const assert = require('assert');
const sinon = require('sinon');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('group-avatars', () => {
  const daysAgo = nmbOfDays => {
    const d = new Date();
    d.setDate(d.getDate() - nmbOfDays);
    return d;
  };
  let fixtures = fixtureLoader.setupEach({
    group1: {
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: 'test-org'
      },
      avatarVersion: 2,
      avatarCheckedDate: daysAgo(8)
    },
    group2: {
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: 'test-org'
      },
      avatarVersion: 2,
      avatarCheckedDate: daysAgo(6)
    },
    groupCustomAvatar3: {
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: 'test-org'
      },
      avatarVersion: 2,
      avatarCheckedDate: daysAgo(6),
      avatarUrl:
        'https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/original'
    },
    groupBasedOnGitlabGroup1: {
      securityDescriptor: {
        type: 'GL_GROUP',
        linkPath: 'test-group'
      },
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(8)
    },
    groupBasedOnGitlabGroup2: {
      securityDescriptor: {
        type: 'GL_GROUP',
        linkPath: 'test-group'
      },
      avatarUrl:
        'https://assets.gitlab-static.net/uploads/-/system/group/avatar/1540914/icon_128x128.png',
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(6)
    },
    groupBasedOnGitlabProject1: {
      securityDescriptor: {
        type: 'GL_PROJECT',
        linkPath: 'test-group/test-project'
      },
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(8)
    },
    groupBasedOnGitlabProject2: {
      securityDescriptor: {
        type: 'GL_GROUP',
        linkPath: 'test-group/test-project'
      },
      avatarUrl:
        'https://assets.gitlab-static.net/uploads/-/system/group/avatar/1540914/icon_128x128.png',
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(6)
    },
    groupBasedOnGitlabUser1: {
      securityDescriptor: {
        type: 'GL_USER',
        linkPath: 'some-user'
      },
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(8)
    },
    groupBasedOnGitlabUser2: {
      securityDescriptor: {
        type: 'GL_USER',
        linkPath: 'some-user'
      },
      avatarUrl:
        'https://assets.gitlab-static.net/uploads/-/system/group/avatar/1540914/icon_128x128.png',
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(6)
    }
  });

  describe('custom avatar', () => {
    it('should use custom avatar', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub.returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub,
        './is-gitter-internal-group-avatar-url': () => true
      });

      const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(
        fixtures.groupCustomAvatar3._id,
        64
      );

      assert.strictEqual(
        avatarUrl,
        `https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/64?v=2`
      );

      // avatar update shouldn't be triggered since it's been less than a week since the last check
      assert(updateGroupAvatarStub.notCalled);
    });
  });

  describe('GitLab', () => {
    describe('groups', () => {
      it('should update avatar if it has been a week since the last update', async () => {
        const updateGroupAvatarStub = sinon.stub();
        updateGroupAvatarStub
          .withArgs(sinon.match.has('_id', fixtures.groupBasedOnGitlabGroup1._id))
          .returns(Promise.resolve());

        const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
          './update-group-avatar': updateGroupAvatarStub
        });

        await groupAvatars.getAvatarUrlForGroupId(fixtures.groupBasedOnGitlabGroup1._id);

        // avatar update should be triggered since it's been over a week since the last check
        assert(updateGroupAvatarStub.calledOnce);
      });

      it('should use old avatar if it has been less than a week since the last update', async () => {
        const updateGroupAvatarStub = sinon.stub();
        updateGroupAvatarStub.returns(Promise.resolve());

        const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
          './update-group-avatar': updateGroupAvatarStub
        });

        const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(
          fixtures.groupBasedOnGitlabGroup2._id,
          64
        );

        assert.strictEqual(
          avatarUrl,
          `${fixtures.groupBasedOnGitlabGroup2.avatarUrl}?v=${fixtures.groupBasedOnGitlabGroup2.avatarVersion}&width=64`
        );

        // avatar update shouldn't be triggered since it's been less than a week since the last check
        assert(updateGroupAvatarStub.notCalled);
      });
    });

    describe('projects', () => {
      it('should update avatar if it has been a week since the last update', async () => {
        const updateGroupAvatarStub = sinon.stub();
        updateGroupAvatarStub
          .withArgs(sinon.match.has('_id', fixtures.groupBasedOnGitlabProject1._id))
          .returns(Promise.resolve());

        const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
          './update-group-avatar': updateGroupAvatarStub
        });

        await groupAvatars.getAvatarUrlForGroupId(fixtures.groupBasedOnGitlabProject1._id);

        // avatar update should be triggered since it's been over a week since the last check
        assert(updateGroupAvatarStub.calledOnce);
      });

      it('should use old avatar if it has been less than a week since the last update', async () => {
        const updateGroupAvatarStub = sinon.stub();
        updateGroupAvatarStub.returns(Promise.resolve());

        const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
          './update-group-avatar': updateGroupAvatarStub
        });

        const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(
          fixtures.groupBasedOnGitlabProject2._id,
          64
        );

        assert.strictEqual(
          avatarUrl,
          `${fixtures.groupBasedOnGitlabProject2.avatarUrl}?v=${fixtures.groupBasedOnGitlabProject2.avatarVersion}&width=64`
        );

        // avatar update shouldn't be triggered since it's been less than a week since the last check
        assert(updateGroupAvatarStub.notCalled);
      });
    });

    describe('users', () => {
      it('should update avatar if it has been a week since the last update', async () => {
        const updateGroupAvatarStub = sinon.stub();
        updateGroupAvatarStub
          .withArgs(sinon.match.has('_id', fixtures.groupBasedOnGitlabUser1._id))
          .returns(Promise.resolve());

        const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
          './update-group-avatar': updateGroupAvatarStub
        });

        await groupAvatars.getAvatarUrlForGroupId(fixtures.groupBasedOnGitlabUser1._id);

        // avatar update should be triggered since it's been over a week since the last check
        assert(updateGroupAvatarStub.calledOnce);
      });

      it('should use old avatar if it has been less than a week since the last update', async () => {
        const updateGroupAvatarStub = sinon.stub();
        updateGroupAvatarStub.returns(Promise.resolve());

        const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
          './update-group-avatar': updateGroupAvatarStub
        });

        const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(
          fixtures.groupBasedOnGitlabUser2._id,
          64
        );

        assert.strictEqual(
          avatarUrl,
          `${fixtures.groupBasedOnGitlabUser2.avatarUrl}?v=${fixtures.groupBasedOnGitlabUser2.avatarVersion}&width=64`
        );

        // avatar update shouldn't be triggered since it's been less than a week since the last check
        assert(updateGroupAvatarStub.notCalled);
      });
    });
  });

  describe('GitHub', () => {
    it('should update avatar if it has been a week since the last update', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub
        .withArgs(sinon.match.has('_id', fixtures.group1._id))
        .returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub
      });

      await groupAvatars.getAvatarUrlForGroupId(fixtures.group1._id);

      // avatar update should be triggered since it's been over a week since the last check
      assert(updateGroupAvatarStub.calledOnce);
    });

    it('should use old avatar if it has been less than a week since the last update', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub.returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub
      });

      const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(fixtures.group2._id, 64);

      assert.strictEqual(avatarUrl, `https://avatars.githubusercontent.com/test-org?s=64&v=2`);

      // avatar update shouldn't be triggered since it's been less than a week since the last check
      assert(updateGroupAvatarStub.notCalled);
    });
  });
});
