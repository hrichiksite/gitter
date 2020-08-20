'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var SecurityDescriptorSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        null, // No association
        'ONE_TO_ONE',
        'GL_GROUP', // Associated with GitLab group
        'GL_PROJECT', // Associated with GitLab project
        'GL_USER', // Associated with GitLab user
        'GH_REPO', // Associated with a GitHub repo
        'GH_ORG', // Associated with a GitHub org
        'GH_USER', // Associated with a GitHub user
        'GROUP' // Associated with a Gitter community
      ],
      required: false
    },
    members: {
      type: String,
      enum: [
        null, // For one-to-one
        'PUBLIC', // Anyone
        'INVITE', // Only invited users can join (private)
        'INVITE_OR_ADMIN', // Invited users or admins
        'GL_GROUP_MEMBER', // for GL_GROUP, must be member of group
        'GL_PROJECT_MEMBER', // for GL_PROJECT, must be member of project
        'GH_REPO_ACCESS', // for GH_REPO, must be able to see the repo
        'GH_REPO_PUSH', // for GH_REPO, must have repo push or admin
        'GH_ORG_MEMBER' // for GH_ORG, must be org member
      ]
    },
    admins: {
      type: String,
      enum: [
        null, // For one-to-one rooms
        'MANUAL', // Only users in extraUserIds are admins
        'GL_GROUP_MAINTAINER', // for GL_GROUP, must be maintainer in group
        'GL_PROJECT_MAINTAINER', // for GL_PROJECT, must be maintainer in project
        'GL_USER_SAME', // for GL_USER, user is same
        'GH_REPO_PUSH', // for GH_REPO, must have repo push or admin
        'GH_ORG_MEMBER', // for GH_ORG, must be org member
        'GH_USER_SAME', // For GH_USER, user is same
        'GROUP_ADMIN' // for GROUP, must be a group admin
      ]
    },
    public: { type: Boolean },
    linkPath: { type: String },
    externalId: { type: String },
    internalId: { type: ObjectId },
    extraMembers: { type: [ObjectId] }, // TODO: record who added etc?
    extraAdmins: { type: [ObjectId] } // TODO: record who added etc?
  },
  { strict: 'throw' }
);

SecurityDescriptorSchema.index({ extraMembers: 1 }, { background: true });
SecurityDescriptorSchema.index({ extraAdmins: 1 }, { background: true });

SecurityDescriptorSchema.extraIndices = [
  {
    keys: {
      'sd.type': 1,
      'sd.linkPath': 1
    },
    options: {
      name: 'partial_sd_type_sd_linkPath',
      background: true,
      partialFilterExpression: {
        'sd.linkPath': { $exists: true }
      }
    }
  },
  {
    keys: {
      'sd.type': 1,
      'sd.externalId': 1
    },
    options: {
      name: 'partial_sd_type_sd_externalId',
      background: true,
      partialFilterExpression: {
        'sd.externalId': { $exists: true }
      }
    }
  },
  {
    keys: {
      'sd.type': 1,
      'sd.internalId': 1
    },
    options: {
      name: 'partial_sd_type_sd_internalId',
      background: true,
      partialFilterExpression: {
        'sd.internalId': { $exists: true }
      }
    }
  }
];

module.exports = {
  Schema: SecurityDescriptorSchema
};
