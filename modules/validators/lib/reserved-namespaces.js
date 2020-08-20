'use strict';

// These are top-level namespaces, so used to validate things like group uris,
// usernames and org rooms.

var namespaces = [
  '_s',
  'about',
  'api',
  'explore',
  'home',
  'login',
  'mobile',
  'settings',
  'logout',
  'apps',
  'topic',
  'topics',
  'archive',
  'archives',
  'integration',
  'integrations',
  '-',
  'x',
  'learn',
  'org',
  'orgs',
  'team',
  'teams',
  'developer',
  'developers',
  'job',
  'jobs',
  'support',
  'contact',
  'app',
  'private',
  'c',
  'u'
];

module.exports = {
  list: namespaces,
  hash: namespaces.reduce(function(memo, name) {
    memo[name.toLowerCase()] = true;
    return memo;
  }, {})
};
