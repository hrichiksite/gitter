'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;

var GitHubUserSchema = new Schema({
  uri: { type: String },
  lcUri: { type: String },
  githubId: { type: Number }
});

GitHubUserSchema.schemaTypeName = 'GitHubUserSchema';
GitHubUserSchema.index({ uri: 1 }, { unique: true });
GitHubUserSchema.index({ lcUri: 1 }, { unique: true });
GitHubUserSchema.index({ githubId: 1 }, { unique: true });

var GitHubOrgSchema = new Schema({
  uri: { type: String },
  lcUri: { type: String },
  githubId: { type: Number }
});

GitHubOrgSchema.schemaTypeName = 'GitHubOrgSchema';
GitHubOrgSchema.index({ uri: 1 }, { unique: true });
GitHubOrgSchema.index({ lcUri: 1 }, { unique: true });
GitHubOrgSchema.index({ githubId: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    return {
      GitHubUser: mongooseConnection.model('GitHubUser', GitHubUserSchema),
      GitHubUserSchema: GitHubUserSchema,
      GitHubOrg: mongooseConnection.model('GitHubOrg', GitHubOrgSchema),
      GitHubOrgSchema: GitHubOrgSchema
    };
  }
};
