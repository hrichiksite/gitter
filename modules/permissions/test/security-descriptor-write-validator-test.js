'use strict';

var securityDescriptorWriteValidator = require('../lib/security-descriptor-write-validator');
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

describe('security-descriptor-write-validator', function() {
  it('should validate GL_GROUP correctly', function() {
    const sd = {
      type: 'GL_GROUP',
      externalId: '3281315',
      linkPath: 'gitter-integration-tests-group',
      public: true,
      admins: 'GL_GROUP_MAINTAINER',
      members: 'PUBLIC'
    };

    securityDescriptorWriteValidator(sd);
  });

  it('should validate sub-group GL_GROUP correctly', function() {
    const sd = {
      type: 'GL_GROUP',
      externalId: '1540914',
      linkPath: 'gitlab-org/gitter',
      public: true,
      admins: 'GL_GROUP_MAINTAINER',
      members: 'PUBLIC'
    };

    securityDescriptorWriteValidator(sd);
  });

  // Just a sanity check that it fails for some invalid data that could happen
  // from some manual database tinkering
  it('should fail for invalid GL_GROUP', function() {
    const sd = {
      type: 'GL_GROUP',
      internalId: '3281315',
      linkPath: 'gitter-integration-tests-group',
      public: true,
      admins: 'MANUAL',
      members: 'PUBLIC'
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.status, 403);
    }
  });

  it('should validate GL_PROJECT correctly', function() {
    const sd = {
      type: 'GL_PROJECT',
      externalId: '7616684',
      linkPath: 'gitter-integration-tests-group/public-project1',
      public: true,
      admins: 'GL_PROJECT_MAINTAINER',
      members: 'PUBLIC'
    };

    securityDescriptorWriteValidator(sd);
  });

  it('should validate sub-group GL_PROJECT correctly', function() {
    const sd = {
      type: 'GL_PROJECT',
      externalId: '3601513',
      linkPath: 'gitlab-org/gitter/webapp',
      public: true,
      admins: 'GL_PROJECT_MAINTAINER',
      members: 'PUBLIC'
    };

    securityDescriptorWriteValidator(sd);
  });

  // Just a sanity check that it fails for some invalid data that could happen
  // from some manual database tinkering
  it('should fail for invalid GL_PROJECT', function() {
    const sd = {
      type: 'GL_PROJECT',
      externalId: '7616684',
      linkPath: 'gitter-integration-tests-group/public-project1',
      public: true,
      admins: 'MANUAL',
      members: 'PUBLIC'
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.status, 403);
    }
  });

  it('should validate GL_USER correctly', function() {
    const sd = {
      type: 'GL_USER',
      externalId: '7616684',
      linkPath: 'my-user',
      public: true,
      admins: 'GL_USER_SAME',
      members: 'PUBLIC'
    };

    securityDescriptorWriteValidator(sd);
  });

  // Just a sanity check that it fails for some invalid data that could happen
  // from some manual database tinkering
  it('should fail for invalid GL_USER', function() {
    const sd = {
      type: 'GL_USER',
      externalId: '7616684',
      linkPath: 'my-user/but-some-project-this-not-right',
      public: true,
      admins: 'MANUAL',
      members: 'PUBLIC'
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.status, 403);
    }
  });

  it('should validate GH_REPO correctly', function() {
    var sd = {
      type: 'GH_REPO',
      linkPath: 'gitterHQ/gitter',
      admins: 'GH_REPO_PUSH',
      members: 'PUBLIC',
      public: true
    };

    securityDescriptorWriteValidator(sd);
  });

  it('should fail correctly, 1', function() {
    var sd = {
      type: null,
      admins: 'MANUAL',
      members: 'PUBLIC',
      public: true
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.status, 400);
    }
  });

  it('should fail correctly, 2', function() {
    var sd = {
      type: null,
      admins: 'MANUAL',
      members: 'PUBLIC',
      public: true,
      extraAdmins: []
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.status, 400);
    }
  });

  it('should succeed for extraAdmins', function() {
    var sd = {
      type: null,
      admins: 'MANUAL',
      members: 'PUBLIC',
      public: true,
      extraAdmins: [new ObjectID()]
    };

    securityDescriptorWriteValidator(sd);
  });
});
