'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var GithubRepoService = require('gitter-web-github').GitHubRepoService;
var securityDescriptorUpdater = require('gitter-web-permissions/lib/security-descriptor/updater');

/**
 * Will change a security descriptor to public but
 * will no longer change it to private when the
 * change is public->private as there are
 * edge-cases which are not handled (and difficult to handle)
 */
function checkRepoPrivacy(uri) {
  var repoService = new GithubRepoService();

  return repoService.getRepo(uri).then(function(repo) {
    if (repo && !repo.private) {
      logger.info('GitHub repo is public. Updating security descriptors', {
        uri: uri
      });

      return securityDescriptorUpdater.updatePublicFlagForRepo(uri, true);
    }

    logger.info('GitHub repo not found. It may either be private or deleting. Ignoring for now', {
      uri: uri
    });
  });
}

module.exports = checkRepoPrivacy;
