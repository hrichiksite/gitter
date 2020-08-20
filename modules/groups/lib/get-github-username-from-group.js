'use strict';

function getGithubUsernameFromGroup(group) {
  const type = group.sd && group.sd.type;
  const linkPath = group.sd && group.sd.linkPath;

  let githubUsername;
  switch (type) {
    case 'GH_ORG':
    case 'GH_USER':
      githubUsername = linkPath;
      break;

    case 'GH_REPO':
      githubUsername = linkPath.split('/')[0];
  }

  return githubUsername;
}

module.exports = getGithubUsernameFromGroup;
