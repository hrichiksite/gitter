'use strict';

var env = require('gitter-web-env');
var config = env.config;

var configurationMappings = {
  GITTER_INTEGRATION_USERNAME: 'integrationTests:test_user:username',
  GITTER_INTEGRATION_USER_SCOPE_TOKEN: 'integrationTests:test_user:user_scope_token',
  GITTER_INTEGRATION_REPO_SCOPE_TOKEN: 'integrationTests:test_user:repo_scope_token',
  GITTER_INTEGRATION_USER_ID: 'integrationTests:test_user:user_id',
  GITTER_INTEGRATION_EMAIL: 'integrationTests:test_user:email',

  GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN: 'integrationTests:collab_user:user_scope_token',
  GITTER_INTEGRATION_COLLAB_USERNAME: 'integrationTests:collab_user:username',
  GITTER_INTEGRATION_COLLAB_USER_ID: 'integrationTests:collab_user:user_id',

  GITTER_INTEGRATION_ORG: 'integrationTests:org1:org_name',
  GITTER_INTEGRATION_ORG_ID: 'integrationTests:org1:org_id',

  GITTER_INTEGRATION_REPO: 'integrationTests:repo1:repo_name',
  GITTER_INTEGRATION_REPO_ID: 'integrationTests:repo1:repo_id',

  GITTER_INTEGRATION_REPO2: 'integrationTests:repo2:repo_name',
  GITTER_INTEGRATION_REPO2_ID: 'integrationTests:repo2:repo_id',

  GITTER_INTEGRATION_REPO_WITH_COLLAB: 'integrationTests:collabRepos:repo1',
  GITTER_INTEGRATION_REPO_WITH_COLLAB2: 'integrationTests:collabRepos:repo2',
  GITTER_INTEGRATION_REPO_WITH_COLLAB_ONLY_READ: 'integrationTests:collabRepos:repoReadOnly',

  GITHUB_PRIVATE_CLIENT_ID: 'github:client_id',
  GITHUB_PRIVATE_CLIENT_SECRET: 'github:client_secret',
  GITHUB_USER_CLIENT_ID: 'github:user_client_id',
  GITHUB_USER_SECRET: 'github:user_client_secret',
  GITHUB_ANON_CLIENT_ID: 'github:anonymous_app:client_id',
  GITHUB_ANON_CLIENT_SECRET: 'github:anonymous_app:client_secret',
  TWITTER_CONSUMER_KEY: 'twitteroauth:consumer_key',
  TWITTER_CONSUMER_SECRET: 'twitteroauth:consumer_secret',
  GITLAB_OAUTH_CLIENT_ID: 'gitlaboauth:client_id',
  GITLAB_OAUTH_CLIENT_SECRET: 'gitlaboauth:client_secret',

  GITLAB_USER_ID: 'integrationTests:gitlabTestUser:id',
  GITLAB_USER_USERNAME: 'integrationTests:gitlabTestUser:username',
  GITLAB_USER_TOKEN: 'integrationTests:gitlabTestUser:token',
  GITLAB_GROUP1_ID: 'integrationTests:gitlabGroup1:id',
  GITLAB_GROUP1_URI: 'integrationTests:gitlabGroup1:uri',
  GITLAB_PUBLIC_PROJECT1_ID: 'integrationTests:gitlabPublicProject1:id',
  GITLAB_PUBLIC_PROJECT1_URI: 'integrationTests:gitlabPublicProject1:uri',
  GITLAB_PRIVATE_PROJECT1_ID: 'integrationTests:gitlabPrivateProject1:id',
  GITLAB_PRIVATE_PROJECT1_URI: 'integrationTests:gitlabPrivateProject1:uri',
  GITLAB_UNAUTHORIZED_PRIVATE_PROJECT1_ID: 'integrationTests:gitlabUnauthorizedPrivateProject1:id',
  GITLAB_UNAUTHORIZED_PRIVATE_PROJECT1_URI: 'integrationTests:gitlabUnauthorizedPrivateProject1:uri'
};

var configSets = {
  '#integrationUser1': [
    'GITTER_INTEGRATION_USER_SCOPE_TOKEN',
    'GITTER_INTEGRATION_USERNAME',
    'GITTER_INTEGRATION_USER_ID'
  ],
  '#integrationCollabUser1': [
    'GITTER_INTEGRATION_COLLAB_USERNAME',
    'GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN'
  ],
  '#integrationGitlabUser1': ['GITLAB_USER_ID', 'GITLAB_USER_USERNAME', 'GITLAB_USER_TOKEN'],
  '#oauthTokens': [
    'GITHUB_PRIVATE_CLIENT_ID',
    'GITHUB_PRIVATE_CLIENT_SECRET',
    'GITHUB_USER_CLIENT_ID',
    'GITHUB_USER_SECRET',
    'GITHUB_ANON_CLIENT_ID',
    'GITHUB_ANON_CLIENT_SECRET',
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
    'GITLAB_OAUTH_CLIENT_ID',
    'GITLAB_OAUTH_CLIENT_SECRET'
  ]
};

var missingIntegrationConfigs = [];
var fixtures = Object.keys(configurationMappings).reduce(function(memo, key) {
  var configKey = configurationMappings[key];
  var value = config.get(configKey) || '';

  if (!value) {
    missingIntegrationConfigs.push(configKey);
  }

  memo[key] = value;
  return memo;
}, {});

// Derived and constant values
fixtures.GITTER_INTEGRATION_REPO_FULL =
  fixtures.GITTER_INTEGRATION_USERNAME + '/' + fixtures.GITTER_INTEGRATION_REPO;
fixtures.GITTER_INTEGRATION_REPO2_FULL =
  fixtures.GITTER_INTEGRATION_USERNAME + '/' + fixtures.GITTER_INTEGRATION_REPO2;

fixtures.GITTER_INTEGRATION_COMMUNITY = '_I-heart-cats-Test-LOL';
fixtures.GITTER_INTEGRATION_ROOM = 'all-about-kitty-litter';

function checkConfigSet(requiredSets) {
  var set = requiredSets.reduce(function(memo, requiredSet) {
    var requiredItems = configSets[requiredSet];

    if (!requiredItems && configurationMappings.hasOwnProperty(requiredSet)) {
      requiredItems = [requiredSet];
    }

    if (!requiredItems) {
      requiredItems = [requiredSet];
    }

    requiredItems.forEach(function(item) {
      if (!fixtures[item] && !config.get(item)) {
        memo[item] = true;
      }
    });

    return memo;
  }, {});

  return Object.keys(set);
}

module.exports = {
  fixtures: fixtures,
  getMissingConfigs: function() {
    return missingIntegrationConfigs;
  },
  checkConfigSet: checkConfigSet
};
