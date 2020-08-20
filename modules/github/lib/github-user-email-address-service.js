'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger.get('github');
var Promise = require('bluebird');
var GitHubUserService = require('./github-user-service');
var GitHubRepoService = require('./github-repo-service');
var isValidEmail = require('email-validator').validate;

function GitHubUserEmailAddressService(user) {
  this.user = user;
}

/**
 * On behalf of the calling user, find another users email address, given their username.
 * Will use various discovery methods to attempt to find it.
 */
GitHubUserEmailAddressService.prototype.findEmailAddressForGitHubUser = Promise.method(function(
  username
) {
  // attempt to get a public email address
  return this._getValidPublicEmailAddress(username)
    .bind(this)
    .then(function(email) {
      if (email) return email; // we have found a valid public email address

      // try get an email from commit
      return this._getEmailFromCommit(username).then(function(email) {
        if (email && isValidEmail(email)) return email;
      });
    })
    .catch(function(err) {
      logger.warn('Unable to discover email address for GitHub user', {
        username: username,
        exception: err
      });
      stats.event('github.email.discovery.failed'); // sadpanda
      return null;
    });
});

GitHubUserEmailAddressService.prototype._getValidPublicEmailAddress = function(username) {
  var ghUser = new GitHubUserService(this.user);
  return ghUser.getUser(username).then(function(githubUser) {
    if (githubUser && githubUser.email && isValidEmail(githubUser.email)) {
      return githubUser.email;
    }
  });
};

// Try to get email from the user commits if the user has at least one repo
GitHubUserEmailAddressService.prototype._getEmailFromCommit = function(username) {
  var ghRepo = new GitHubRepoService(this.user);

  return ghRepo
    .getReposForUser(username, {
      firstPageOnly: true,
      sort: 'pushed',
      perPage: 10,
      type: 'owner'
    })
    .then(function(repos) {
      if (!repos.length) {
        logger.info('User does not have any repos', { username: username });
        return null;
      }

      // We're going to try three repos, all non-forks to try find commits
      var validRepos = repos
        .filter(function(repo) {
          return repo.owner.login === username && !repo.fork;
        })
        .slice(0, 3);

      if (!validRepos.length) {
        return null;
      }

      // Loop through the repos, trying to find
      // a valid commit
      return (function findCommitsInNextRepo() {
        var repo = validRepos.shift();
        if (!repo) return null;

        var repoFullname = repo.full_name;

        // Find the most recent commits by the author
        return ghRepo
          .getCommits(repoFullname, {
            firstPageOnly: true,
            author: username,
            perPage: 5
          })
          .then(function(commits) {
            if (!commits) return null;

            if (!commits.length) {
              logger.info('User does not have any commits', { username: username });
              return null;
            }

            var emails = commits
              .map(function(commit) {
                return (
                  commit.commit &&
                  commit.commit.author &&
                  commit.commit.author.email &&
                  commit.commit.author.email.toLowerCase()
                );
              })
              .filter(function(email) {
                return email && isValidEmail(email);
              });

            if (!emails.length) {
              return null;
            }

            // If we found multiple email addresses, check that theyre all
            // the same, as an additional confirmation
            var first = emails[0];
            var allEqual = emails.every(function(e) {
              return e === first;
            });

            if (allEqual) {
              return first;
            }
          })
          .catch(function(err) {
            logger.verbose('Unable to get commits from repo', {
              repo: repoFullname,
              exception: err
            });

            return null;
          })
          .then(function(email) {
            if (email) return email;
            return findCommitsInNextRepo();
          });
      })();
    })
    .then(function(email) {
      if (email) {
        logger.info('Found email for GitHub user', {
          username: username,
          email: email
        });
      } else {
        logger.info('Did not find valid email for GitHub user', {
          username: username
        });
      }

      return email;
    });
};

module.exports = GitHubUserEmailAddressService;
