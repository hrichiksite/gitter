'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var appVersion = require('gitter-app-version');

var stagingText, stagingLink;

/* App tag */
var staging = nconf.get('STAGING');
switch (nconf.get('NODE_ENV')) {
  case 'prod':
    if (staging) {
      stagingText = 'NEXT';
      stagingLink = 'http://next.gitter.im';
    }
    break;
  case 'beta':
    var branch = appVersion.getBranch();
    stagingText = branch ? branch.split('/').pop() : 'BETA';
    stagingLink = appVersion.getGitlabLink();
    break;
  case 'dev':
    stagingText = 'DEV';
    stagingLink = 'https://gitlab.com/gitlab-org/gitter/webapp';
    break;
}

module.exports = {
  text: stagingText,
  link: stagingLink
};
