'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var validateGithubUri = require('gitter-web-github').GitHubUriValidator;
const validateGitlabUri = require('gitter-web-gitlab').GitLabUriValidator;
var securityDescriptorGenerator = require('./security-descriptor-generator');
var policyFactory = require('./policy-factory');

/**
 * Ensures the security descriptor type matches the backend object type
 * and resolves the backend type in the case of the nasty
 * `GH_GUESS` option
 * @private
 */
function validateGithubType(requestedType, actualGitHubType) {
  var expectedGitHubType;

  switch (requestedType) {
    case 'GH_GUESS':
      switch (actualGitHubType) {
        case 'ORG':
          return 'GH_ORG';
        case 'REPO':
          return 'GH_REPO';
        case 'USER':
          return 'GH_USER';
        default:
          throw new StatusError('Unknown GitHub type:' + actualGitHubType);
      }
    /* break; */

    case 'GH_ORG':
      expectedGitHubType = 'ORG';
      break;

    case 'GH_REPO':
      expectedGitHubType = 'REPO';
      break;

    case 'GH_USER':
      expectedGitHubType = 'USER';
      break;

    default:
      throw new StatusError('Unknown type:' + requestedType);
  }

  if (expectedGitHubType !== actualGitHubType) {
    throw new StatusError(
      400,
      'Backing object does not match type: ' + expectedGitHubType + ' vs ' + actualGitHubType
    );
  }

  return requestedType;
}

/**
 * Ensures the security descriptor type matches the backend object type
 * and resolves the backend type in the case of the nasty
 * @private
 */
function validateGitlabType(requestedType, actualGitlabType) {
  var expectedGitlabType;

  switch (requestedType) {
    case 'GL_USER':
      expectedGitlabType = 'USER';
      break;

    case 'GL_GROUP':
      expectedGitlabType = 'GROUP';
      break;

    case 'GL_PROJECT':
      expectedGitlabType = 'PROJECT';
      break;

    default:
      throw new StatusError('Unknown type:' + requestedType);
  }

  if (expectedGitlabType !== actualGitlabType) {
    throw new StatusError(
      400,
      'Backing object does not match type: ' + expectedGitlabType + ' vs ' + actualGitlabType
    );
  }

  return requestedType;
}

function validateAndFetchBackingInfoForGithub(user, options) {
  if (!options.linkPath) {
    throw new StatusError(400, 'GitHub objects must have a linkPath');
  }

  return validateGithubUri(user, options.linkPath).then(function(githubInfo) {
    if (!githubInfo) throw new StatusError(404);
    var type = validateGithubType(options.type, githubInfo.type);

    var policyEvaluator;
    if (options.obtainAccessFromGitHubRepo) {
      policyEvaluator = policyFactory.getPreCreationPolicyEvaluatorWithRepoFallback(
        user,
        type,
        options.linkPath,
        options.obtainAccessFromGitHubRepo
      );
    } else {
      policyEvaluator = policyFactory.getPreCreationPolicyEvaluator(user, type, options.linkPath);
    }

    return policyEvaluator.canAdmin().then(function(isAdmin) {
      if (!isAdmin) throw new StatusError(403);

      return [type, githubInfo];
    });
  });
}

async function validateAndFetchBackingInfoForGitlab(user, options) {
  if (!options.linkPath) {
    throw new StatusError(400, 'GitLab objects must have a linkPath');
  }

  const gitlabInfo = await validateGitlabUri(user, options.linkPath);
  if (!gitlabInfo) throw new StatusError(404);
  const type = validateGitlabType(options.type, gitlabInfo.type);

  var policyEvaluator = policyFactory.getPreCreationPolicyEvaluator(user, type, options.linkPath);

  const isAdmin = await policyEvaluator.canAdmin();
  if (!isAdmin) throw new StatusError(403);

  return [type, gitlabInfo];
}

function validateAndFetchBackingInfo(user, options) {
  switch (options.type || null) {
    case null:
      // No backing object. Nothing to do
      return Promise.resolve([null, null]);

    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
    case 'GH_GUESS':
      return validateAndFetchBackingInfoForGithub(user, options);

    case 'GL_USER':
    case 'GL_GROUP':
    case 'GL_PROJECT':
      return validateAndFetchBackingInfoForGitlab(user, options);

    case 'GROUP':
      return Promise.resolve(['GROUP', null]);

    default:
      throw new StatusError(400, 'Unknown type: ' + options.type);
  }
}

async function ensureAccessAndFetchDescriptor(user, options) {
  const security = options.security || 'PUBLIC';
  const linkPath = options.linkPath;
  const internalId = options.internalId;

  const [type, info] = await validateAndFetchBackingInfo(user, options);

  return securityDescriptorGenerator.generate(user, {
    type,
    linkPath,
    externalId: info && info.externalId,
    internalId,
    security
  });
}

module.exports = Promise.method(ensureAccessAndFetchDescriptor);
