'use strict';

const testRequire = require('../test-require');

const prerenderActivityHelper = testRequire('./web/prerender-activity-helper');
const assert = require('assert');
const _ = require('lodash');

// These fixture events are from using https://gitlab.com/gitlab-org/gitter/gitter-webhooks-handler#sending-fake-webhook-messages
// Then just logging them out in `server/handlers/renderers/chat-internal.js` via `console.log('activityEvents', JSON.stringify(activityEvents));`
const GITHUB_ISSUES_EVENT = {
  id: '5af926ff1568513a10cad246',
  text:
    '[Github] malditogeek opened an issue in malditogeek/hook: Issue E https://github.com/malditogeek/hook/issues/5',
  html:
    '[Github] malditogeek opened an issue in malditogeek/hook: Issue E <span data-link-type="issue" data-issue="5" data-issue-repo="malditogeek/hook" class="issue">malditogeek/hook#5</span>',
  sent: '2018-05-14T06:04:47.988Z',
  editedAt: null,
  meta: {
    repo: 'malditogeek/hook',
    url: 'https://github.com/malditogeek/hook/issues/5',
    title: 'Issue E',
    user: 'malditogeek',
    action: 'opened',
    event: 'issues',
    service: 'github',
    type: 'webhook'
  },
  payload: {
    sender: {
      site_admin: false,
      type: 'User',
      received_events_url: 'https://api.github.com/users/malditogeek/received_events',
      events_url: 'https://api.github.com/users/malditogeek/events{/privacy}',
      repos_url: 'https://api.github.com/users/malditogeek/repos',
      organizations_url: 'https://api.github.com/users/malditogeek/orgs',
      subscriptions_url: 'https://api.github.com/users/malditogeek/subscriptions',
      starred_url: 'https://api.github.com/users/malditogeek/starred{/owner}{/repo}',
      gists_url: 'https://api.github.com/users/malditogeek/gists{/gist_id}',
      following_url: 'https://api.github.com/users/malditogeek/following{/other_user}',
      followers_url: 'https://api.github.com/users/malditogeek/followers',
      html_url: 'https://github.com/malditogeek',
      url: 'https://api.github.com/users/malditogeek',
      gravatar_id: '4605adbcd13e20c14e82fcf528b516e6',
      avatar_url:
        'https://0.gravatar.com/avatar/4605adbcd13e20c14e82fcf528b516e6?d=https%3A%2F%2Fidenticons.github.com%2Fefad653e1abded64a74417c531cdca0f.png&r=x',
      id: 14751,
      login: 'malditogeek'
    },
    repository: {
      master_branch: 'master',
      default_branch: 'master',
      watchers: 0,
      open_issues: 5,
      forks: 0,
      open_issues_count: 5,
      mirror_url: null,
      forks_count: 0,
      has_wiki: true,
      has_downloads: true,
      has_issues: true,
      language: 'Shell',
      watchers_count: 0,
      stargazers_count: 0,
      size: 173,
      homepage: null,
      svn_url: 'https://github.com/malditogeek/hook',
      clone_url: 'https://github.com/malditogeek/hook.git',
      ssh_url: 'git@github.com:malditogeek/hook.git',
      git_url: 'git://github.com/malditogeek/hook.git',
      pushed_at: '2013-11-06T15:08:49Z',
      updated_at: '2013-11-06T15:08:51Z',
      created_at: '2013-08-20T11:34:27Z',
      releases_url: 'https://api.github.com/repos/malditogeek/hook/releases{/id}',
      labels_url: 'https://api.github.com/repos/malditogeek/hook/labels{/name}',
      notifications_url:
        'https://api.github.com/repos/malditogeek/hook/notifications{?since,all,participating}',
      milestones_url: 'https://api.github.com/repos/malditogeek/hook/milestones{/number}',
      pulls_url: 'https://api.github.com/repos/malditogeek/hook/pulls{/number}',
      issues_url: 'https://api.github.com/repos/malditogeek/hook/issues{/number}',
      downloads_url: 'https://api.github.com/repos/malditogeek/hook/downloads',
      archive_url: 'https://api.github.com/repos/malditogeek/hook/{archive_format}{/ref}',
      merges_url: 'https://api.github.com/repos/malditogeek/hook/merges',
      compare_url: 'https://api.github.com/repos/malditogeek/hook/compare/{base}...{head}',
      contents_url: 'https://api.github.com/repos/malditogeek/hook/contents/{+path}',
      issue_comment_url: 'https://api.github.com/repos/malditogeek/hook/issues/comments/{number}',
      comments_url: 'https://api.github.com/repos/malditogeek/hook/comments{/number}',
      git_commits_url: 'https://api.github.com/repos/malditogeek/hook/git/commits{/sha}',
      commits_url: 'https://api.github.com/repos/malditogeek/hook/commits{/sha}',
      subscription_url: 'https://api.github.com/repos/malditogeek/hook/subscription',
      subscribers_url: 'https://api.github.com/repos/malditogeek/hook/subscribers',
      contributors_url: 'https://api.github.com/repos/malditogeek/hook/contributors',
      stargazers_url: 'https://api.github.com/repos/malditogeek/hook/stargazers',
      languages_url: 'https://api.github.com/repos/malditogeek/hook/languages',
      statuses_url: 'https://api.github.com/repos/malditogeek/hook/statuses/{sha}',
      trees_url: 'https://api.github.com/repos/malditogeek/hook/git/trees{/sha}',
      git_refs_url: 'https://api.github.com/repos/malditogeek/hook/git/refs{/sha}',
      git_tags_url: 'https://api.github.com/repos/malditogeek/hook/git/tags{/sha}',
      blobs_url: 'https://api.github.com/repos/malditogeek/hook/git/blobs{/sha}',
      tags_url: 'https://api.github.com/repos/malditogeek/hook/tags',
      branches_url: 'https://api.github.com/repos/malditogeek/hook/branches{/branch}',
      assignees_url: 'https://api.github.com/repos/malditogeek/hook/assignees{/user}',
      events_url: 'https://api.github.com/repos/malditogeek/hook/events',
      issue_events_url: 'https://api.github.com/repos/malditogeek/hook/issues/events{/number}',
      hooks_url: 'https://api.github.com/repos/malditogeek/hook/hooks',
      teams_url: 'https://api.github.com/repos/malditogeek/hook/teams',
      collaborators_url:
        'https://api.github.com/repos/malditogeek/hook/collaborators{/collaborator}',
      keys_url: 'https://api.github.com/repos/malditogeek/hook/keys{/key_id}',
      forks_url: 'https://api.github.com/repos/malditogeek/hook/forks',
      url: 'https://api.github.com/repos/malditogeek/hook',
      fork: false,
      description: '',
      html_url: 'https://github.com/malditogeek/hook',
      private: false,
      owner: {
        site_admin: false,
        type: 'User',
        received_events_url: 'https://api.github.com/users/malditogeek/received_events',
        events_url: 'https://api.github.com/users/malditogeek/events{/privacy}',
        repos_url: 'https://api.github.com/users/malditogeek/repos',
        organizations_url: 'https://api.github.com/users/malditogeek/orgs',
        subscriptions_url: 'https://api.github.com/users/malditogeek/subscriptions',
        starred_url: 'https://api.github.com/users/malditogeek/starred{/owner}{/repo}',
        gists_url: 'https://api.github.com/users/malditogeek/gists{/gist_id}',
        following_url: 'https://api.github.com/users/malditogeek/following{/other_user}',
        followers_url: 'https://api.github.com/users/malditogeek/followers',
        html_url: 'https://github.com/malditogeek',
        url: 'https://api.github.com/users/malditogeek',
        gravatar_id: '4605adbcd13e20c14e82fcf528b516e6',
        avatar_url:
          'https://0.gravatar.com/avatar/4605adbcd13e20c14e82fcf528b516e6?d=https%3A%2F%2Fidenticons.github.com%2Fefad653e1abded64a74417c531cdca0f.png&r=x',
        id: 14751,
        login: 'malditogeek'
      },
      full_name: 'malditogeek/hook',
      name: 'hook',
      id: 12241610
    },
    issue: {
      body: '',
      pull_request: {
        patch_url: null,
        diff_url: null,
        html_url: null
      },
      closed_at: null,
      updated_at: '2013-11-06T15:45:49Z',
      created_at: '2013-11-06T15:45:49Z',
      comments: 0,
      milestone: null,
      assignee: null,
      state: 'open',
      labels: [],
      user: {
        site_admin: false,
        type: 'User',
        received_events_url: 'https://api.github.com/users/malditogeek/received_events',
        events_url: 'https://api.github.com/users/malditogeek/events{/privacy}',
        repos_url: 'https://api.github.com/users/malditogeek/repos',
        organizations_url: 'https://api.github.com/users/malditogeek/orgs',
        subscriptions_url: 'https://api.github.com/users/malditogeek/subscriptions',
        starred_url: 'https://api.github.com/users/malditogeek/starred{/owner}{/repo}',
        gists_url: 'https://api.github.com/users/malditogeek/gists{/gist_id}',
        following_url: 'https://api.github.com/users/malditogeek/following{/other_user}',
        followers_url: 'https://api.github.com/users/malditogeek/followers',
        html_url: 'https://github.com/malditogeek',
        url: 'https://api.github.com/users/malditogeek',
        gravatar_id: '4605adbcd13e20c14e82fcf528b516e6',
        avatar_url:
          'https://2.gravatar.com/avatar/4605adbcd13e20c14e82fcf528b516e6?d=https%3A%2F%2Fidenticons.github.com%2Fefad653e1abded64a74417c531cdca0f.png&r=x',
        id: 14751,
        login: 'malditogeek'
      },
      title: 'Issue E',
      number: 5,
      id: 22202629,
      html_url: 'https://github.com/malditogeek/hook/issues/5',
      events_url: 'https://api.github.com/repos/malditogeek/hook/issues/5/events',
      comments_url: 'https://api.github.com/repos/malditogeek/hook/issues/5/comments',
      labels_url: 'https://api.github.com/repos/malditogeek/hook/issues/5/labels{/name}',
      url: 'https://api.github.com/repos/malditogeek/hook/issues/5'
    },
    action: 'opened'
  },
  v: 1
};

const GITHUB_PULL_REQUEST_EVENT = {
  id: '5cc76975de72d55a94c69437',
  text:
    '[Github] suprememoocow opened a Pull Request to malditogeek/hook: Hook em up https://github.com/malditogeek/hook/pull/6',
  html:
    '[Github] suprememoocow opened a Pull Request to malditogeek/hook: Hook em up <a target="_blank" data-link-type="pr" data-issue="6" href="https://github.com/malditogeek/hook/pull/6" data-provider="github" data-issue-repo="malditogeek/hook" class="pr">malditogeek/hook#6</a>',
  sent: '2019-04-29T21:15:33.989Z',
  editedAt: null,
  meta: {
    title: 'Hook em up',
    repo: 'malditogeek/hook',
    url: 'https://github.com/malditogeek/hook/pull/6',
    user: 'suprememoocow',
    action: 'opened',
    event: 'pull_request',
    service: 'github',
    type: 'webhook'
  },
  payload: {
    sender: {
      site_admin: false,
      type: 'User',
      received_events_url: 'https://api.github.com/users/suprememoocow/received_events',
      events_url: 'https://api.github.com/users/suprememoocow/events{/privacy}',
      repos_url: 'https://api.github.com/users/suprememoocow/repos',
      organizations_url: 'https://api.github.com/users/suprememoocow/orgs',
      subscriptions_url: 'https://api.github.com/users/suprememoocow/subscriptions',
      starred_url: 'https://api.github.com/users/suprememoocow/starred{/owner}{/repo}',
      gists_url: 'https://api.github.com/users/suprememoocow/gists{/gist_id}',
      following_url: 'https://api.github.com/users/suprememoocow/following{/other_user}',
      followers_url: 'https://api.github.com/users/suprememoocow/followers',
      html_url: 'https://github.com/suprememoocow',
      url: 'https://api.github.com/users/suprememoocow',
      gravatar_id: '2644d6233d2c210258362f7f0f5138c2',
      avatar_url:
        'https://1.gravatar.com/avatar/2644d6233d2c210258362f7f0f5138c2?d=https%3A%2F%2Fidenticons.github.com%2F2b1d492e1509be7ee3b7bb3906a75619.png&r=x',
      id: 594566,
      login: 'suprememoocow'
    },
    repository: {
      master_branch: 'master',
      default_branch: 'master',
      watchers: 0,
      open_issues: 6,
      forks: 1,
      open_issues_count: 6,
      mirror_url: null,
      forks_count: 1,
      has_wiki: true,
      has_downloads: true,
      has_issues: true,
      language: 'Shell',
      watchers_count: 0,
      stargazers_count: 0,
      size: 173,
      homepage: 'Web',
      svn_url: 'https://github.com/malditogeek/hook',
      clone_url: 'https://github.com/malditogeek/hook.git',
      ssh_url: 'git@github.com:malditogeek/hook.git',
      git_url: 'git://github.com/malditogeek/hook.git',
      pushed_at: '2013-11-06T15:08:49Z',
      updated_at: '2013-11-06T15:57:43Z',
      created_at: '2013-08-20T11:34:27Z',
      releases_url: 'https://api.github.com/repos/malditogeek/hook/releases{/id}',
      labels_url: 'https://api.github.com/repos/malditogeek/hook/labels{/name}',
      notifications_url:
        'https://api.github.com/repos/malditogeek/hook/notifications{?since,all,participating}',
      milestones_url: 'https://api.github.com/repos/malditogeek/hook/milestones{/number}',
      pulls_url: 'https://api.github.com/repos/malditogeek/hook/pulls{/number}',
      issues_url: 'https://api.github.com/repos/malditogeek/hook/issues{/number}',
      downloads_url: 'https://api.github.com/repos/malditogeek/hook/downloads',
      archive_url: 'https://api.github.com/repos/malditogeek/hook/{archive_format}{/ref}',
      merges_url: 'https://api.github.com/repos/malditogeek/hook/merges',
      compare_url: 'https://api.github.com/repos/malditogeek/hook/compare/{base}...{head}',
      contents_url: 'https://api.github.com/repos/malditogeek/hook/contents/{+path}',
      issue_comment_url: 'https://api.github.com/repos/malditogeek/hook/issues/comments/{number}',
      comments_url: 'https://api.github.com/repos/malditogeek/hook/comments{/number}',
      git_commits_url: 'https://api.github.com/repos/malditogeek/hook/git/commits{/sha}',
      commits_url: 'https://api.github.com/repos/malditogeek/hook/commits{/sha}',
      subscription_url: 'https://api.github.com/repos/malditogeek/hook/subscription',
      subscribers_url: 'https://api.github.com/repos/malditogeek/hook/subscribers',
      contributors_url: 'https://api.github.com/repos/malditogeek/hook/contributors',
      stargazers_url: 'https://api.github.com/repos/malditogeek/hook/stargazers',
      languages_url: 'https://api.github.com/repos/malditogeek/hook/languages',
      statuses_url: 'https://api.github.com/repos/malditogeek/hook/statuses/{sha}',
      trees_url: 'https://api.github.com/repos/malditogeek/hook/git/trees{/sha}',
      git_refs_url: 'https://api.github.com/repos/malditogeek/hook/git/refs{/sha}',
      git_tags_url: 'https://api.github.com/repos/malditogeek/hook/git/tags{/sha}',
      blobs_url: 'https://api.github.com/repos/malditogeek/hook/git/blobs{/sha}',
      tags_url: 'https://api.github.com/repos/malditogeek/hook/tags',
      branches_url: 'https://api.github.com/repos/malditogeek/hook/branches{/branch}',
      assignees_url: 'https://api.github.com/repos/malditogeek/hook/assignees{/user}',
      events_url: 'https://api.github.com/repos/malditogeek/hook/events',
      issue_events_url: 'https://api.github.com/repos/malditogeek/hook/issues/events{/number}',
      hooks_url: 'https://api.github.com/repos/malditogeek/hook/hooks',
      teams_url: 'https://api.github.com/repos/malditogeek/hook/teams',
      collaborators_url:
        'https://api.github.com/repos/malditogeek/hook/collaborators{/collaborator}',
      keys_url: 'https://api.github.com/repos/malditogeek/hook/keys{/key_id}',
      forks_url: 'https://api.github.com/repos/malditogeek/hook/forks',
      url: 'https://api.github.com/repos/malditogeek/hook',
      fork: false,
      description: 'Desc',
      html_url: 'https://github.com/malditogeek/hook',
      private: false,
      owner: {
        site_admin: false,
        type: 'User',
        received_events_url: 'https://api.github.com/users/malditogeek/received_events',
        events_url: 'https://api.github.com/users/malditogeek/events{/privacy}',
        repos_url: 'https://api.github.com/users/malditogeek/repos',
        organizations_url: 'https://api.github.com/users/malditogeek/orgs',
        subscriptions_url: 'https://api.github.com/users/malditogeek/subscriptions',
        starred_url: 'https://api.github.com/users/malditogeek/starred{/owner}{/repo}',
        gists_url: 'https://api.github.com/users/malditogeek/gists{/gist_id}',
        following_url: 'https://api.github.com/users/malditogeek/following{/other_user}',
        followers_url: 'https://api.github.com/users/malditogeek/followers',
        html_url: 'https://github.com/malditogeek',
        url: 'https://api.github.com/users/malditogeek',
        gravatar_id: '4605adbcd13e20c14e82fcf528b516e6',
        avatar_url:
          'https://2.gravatar.com/avatar/4605adbcd13e20c14e82fcf528b516e6?d=https%3A%2F%2Fidenticons.github.com%2Fefad653e1abded64a74417c531cdca0f.png&r=x',
        id: 14751,
        login: 'malditogeek'
      },
      full_name: 'malditogeek/hook',
      name: 'hook',
      id: 12241610
    },
    pull_request: {
      changed_files: 1,
      deletions: 0,
      additions: 1,
      commits: 1,
      review_comments: 0,
      comments: 0,
      merged_by: null,
      mergeable_state: 'unknown',
      mergeable: null,
      merged: false,
      _links: {
        statuses: [null],
        review_comments: [null],
        comments: [null],
        issue: [null],
        html: [null],
        self: [null]
      },
      base: {
        repo: [null],
        user: [null],
        sha: '4f7866e2845df6decf6e2aaf764ef018ca85d57d',
        ref: 'master',
        label: 'malditogeek:master'
      },
      head: {
        repo: [null],
        user: [null],
        sha: '34a0f092520c7701c70f40502be0e3d926d63976',
        ref: 'master',
        label: 'suprememoocow:master'
      },
      statuses_url:
        'https://api.github.com/repos/malditogeek/hook/statuses/34a0f092520c7701c70f40502be0e3d926d63976',
      comments_url: 'https://api.github.com/repos/malditogeek/hook/issues/6/comments',
      review_comment_url: '/repos/malditogeek/hook/pulls/comments/{number}',
      review_comments_url: 'https://github.com/malditogeek/hook/pull/6/comments',
      commits_url: 'https://github.com/malditogeek/hook/pull/6/commits',
      milestone: null,
      assignee: null,
      merge_commit_sha: null,
      merged_at: null,
      closed_at: null,
      updated_at: '2013-11-06T15:59:54Z',
      created_at: '2013-11-06T15:59:54Z',
      body: '',
      user: {
        site_admin: false,
        type: 'User',
        received_events_url: 'https://api.github.com/users/suprememoocow/received_events',
        events_url: 'https://api.github.com/users/suprememoocow/events{/privacy}',
        repos_url: 'https://api.github.com/users/suprememoocow/repos',
        organizations_url: 'https://api.github.com/users/suprememoocow/orgs',
        subscriptions_url: 'https://api.github.com/users/suprememoocow/subscriptions',
        starred_url: 'https://api.github.com/users/suprememoocow/starred{/owner}{/repo}',
        gists_url: 'https://api.github.com/users/suprememoocow/gists{/gist_id}',
        following_url: 'https://api.github.com/users/suprememoocow/following{/other_user}',
        followers_url: 'https://api.github.com/users/suprememoocow/followers',
        html_url: 'https://github.com/suprememoocow',
        url: 'https://api.github.com/users/suprememoocow',
        gravatar_id: '2644d6233d2c210258362f7f0f5138c2',
        avatar_url:
          'https://0.gravatar.com/avatar/2644d6233d2c210258362f7f0f5138c2?d=https%3A%2F%2Fidenticons.github.com%2F2b1d492e1509be7ee3b7bb3906a75619.png&r=x',
        id: 594566,
        login: 'suprememoocow'
      },
      title: 'Hook em up',
      state: 'open',
      number: 6,
      issue_url: 'https://github.com/malditogeek/hook/pull/6',
      patch_url: 'https://github.com/malditogeek/hook/pull/6.patch',
      diff_url: 'https://github.com/malditogeek/hook/pull/6.diff',
      html_url: 'https://github.com/malditogeek/hook/pull/6',
      id: 9723078,
      url: 'https://api.github.com/repos/malditogeek/hook/pulls/6'
    },
    number: 6,
    action: 'opened'
  },
  v: 1
};

// Wiki event
const GITHUB_GOLLUM_EVENT = {
  id: '5cc76e6cde72d55a94c6951d',
  text:
    '[Github] malditogeek updated the wiki on malditogeek/hook: https://github.com/malditogeek/hook',
  html:
    '[Github] malditogeek updated the wiki on malditogeek/hook: <a href="https://github.com/malditogeek/hook" rel="nofollow noopener noreferrer" target="_blank" class="link">https://github.com/malditogeek/hook</a>',
  sent: '2019-04-29T21:36:44.270Z',
  editedAt: null,
  meta: {
    repo: 'malditogeek/hook',
    url: 'https://github.com/malditogeek/hook',
    user: 'malditogeek',
    event: 'gollum',
    service: 'github',
    type: 'webhook'
  },
  payload: {
    sender: {
      site_admin: false,
      type: 'User',
      received_events_url: 'https://api.github.com/users/malditogeek/received_events',
      events_url: 'https://api.github.com/users/malditogeek/events{/privacy}',
      repos_url: 'https://api.github.com/users/malditogeek/repos',
      organizations_url: 'https://api.github.com/users/malditogeek/orgs',
      subscriptions_url: 'https://api.github.com/users/malditogeek/subscriptions',
      starred_url: 'https://api.github.com/users/malditogeek/starred{/owner}{/repo}',
      gists_url: 'https://api.github.com/users/malditogeek/gists{/gist_id}',
      following_url: 'https://api.github.com/users/malditogeek/following{/other_user}',
      followers_url: 'https://api.github.com/users/malditogeek/followers',
      html_url: 'https://github.com/malditogeek',
      url: 'https://api.github.com/users/malditogeek',
      gravatar_id: '4605adbcd13e20c14e82fcf528b516e6',
      avatar_url:
        'https://0.gravatar.com/avatar/4605adbcd13e20c14e82fcf528b516e6?d=https%3A%2F%2Fidenticons.github.com%2Fefad653e1abded64a74417c531cdca0f.png&r=x',
      id: 14751,
      login: 'malditogeek'
    },
    repository: {
      master_branch: 'master',
      default_branch: 'master',
      watchers: 0,
      open_issues: 5,
      forks: 0,
      open_issues_count: 5,
      mirror_url: null,
      forks_count: 0,
      has_wiki: true,
      has_downloads: true,
      has_issues: true,
      language: 'Shell',
      watchers_count: 0,
      stargazers_count: 0,
      size: 173,
      homepage: null,
      svn_url: 'https://github.com/malditogeek/hook',
      clone_url: 'https://github.com/malditogeek/hook.git',
      ssh_url: 'git@github.com:malditogeek/hook.git',
      git_url: 'git://github.com/malditogeek/hook.git',
      pushed_at: '2013-11-06T15:08:49Z',
      updated_at: '2013-11-06T15:51:20Z',
      created_at: '2013-08-20T11:34:27Z',
      releases_url: 'https://api.github.com/repos/malditogeek/hook/releases{/id}',
      labels_url: 'https://api.github.com/repos/malditogeek/hook/labels{/name}',
      notifications_url:
        'https://api.github.com/repos/malditogeek/hook/notifications{?since,all,participating}',
      milestones_url: 'https://api.github.com/repos/malditogeek/hook/milestones{/number}',
      pulls_url: 'https://api.github.com/repos/malditogeek/hook/pulls{/number}',
      issues_url: 'https://api.github.com/repos/malditogeek/hook/issues{/number}',
      downloads_url: 'https://api.github.com/repos/malditogeek/hook/downloads',
      archive_url: 'https://api.github.com/repos/malditogeek/hook/{archive_format}{/ref}',
      merges_url: 'https://api.github.com/repos/malditogeek/hook/merges',
      compare_url: 'https://api.github.com/repos/malditogeek/hook/compare/{base}...{head}',
      contents_url: 'https://api.github.com/repos/malditogeek/hook/contents/{+path}',
      issue_comment_url: 'https://api.github.com/repos/malditogeek/hook/issues/comments/{number}',
      comments_url: 'https://api.github.com/repos/malditogeek/hook/comments{/number}',
      git_commits_url: 'https://api.github.com/repos/malditogeek/hook/git/commits{/sha}',
      commits_url: 'https://api.github.com/repos/malditogeek/hook/commits{/sha}',
      subscription_url: 'https://api.github.com/repos/malditogeek/hook/subscription',
      subscribers_url: 'https://api.github.com/repos/malditogeek/hook/subscribers',
      contributors_url: 'https://api.github.com/repos/malditogeek/hook/contributors',
      stargazers_url: 'https://api.github.com/repos/malditogeek/hook/stargazers',
      languages_url: 'https://api.github.com/repos/malditogeek/hook/languages',
      statuses_url: 'https://api.github.com/repos/malditogeek/hook/statuses/{sha}',
      trees_url: 'https://api.github.com/repos/malditogeek/hook/git/trees{/sha}',
      git_refs_url: 'https://api.github.com/repos/malditogeek/hook/git/refs{/sha}',
      git_tags_url: 'https://api.github.com/repos/malditogeek/hook/git/tags{/sha}',
      blobs_url: 'https://api.github.com/repos/malditogeek/hook/git/blobs{/sha}',
      tags_url: 'https://api.github.com/repos/malditogeek/hook/tags',
      branches_url: 'https://api.github.com/repos/malditogeek/hook/branches{/branch}',
      assignees_url: 'https://api.github.com/repos/malditogeek/hook/assignees{/user}',
      events_url: 'https://api.github.com/repos/malditogeek/hook/events',
      issue_events_url: 'https://api.github.com/repos/malditogeek/hook/issues/events{/number}',
      hooks_url: 'https://api.github.com/repos/malditogeek/hook/hooks',
      teams_url: 'https://api.github.com/repos/malditogeek/hook/teams',
      collaborators_url:
        'https://api.github.com/repos/malditogeek/hook/collaborators{/collaborator}',
      keys_url: 'https://api.github.com/repos/malditogeek/hook/keys{/key_id}',
      forks_url: 'https://api.github.com/repos/malditogeek/hook/forks',
      url: 'https://api.github.com/repos/malditogeek/hook',
      fork: false,
      description: '',
      html_url: 'https://github.com/malditogeek/hook',
      private: false,
      owner: {
        site_admin: false,
        type: 'User',
        received_events_url: 'https://api.github.com/users/malditogeek/received_events',
        events_url: 'https://api.github.com/users/malditogeek/events{/privacy}',
        repos_url: 'https://api.github.com/users/malditogeek/repos',
        organizations_url: 'https://api.github.com/users/malditogeek/orgs',
        subscriptions_url: 'https://api.github.com/users/malditogeek/subscriptions',
        starred_url: 'https://api.github.com/users/malditogeek/starred{/owner}{/repo}',
        gists_url: 'https://api.github.com/users/malditogeek/gists{/gist_id}',
        following_url: 'https://api.github.com/users/malditogeek/following{/other_user}',
        followers_url: 'https://api.github.com/users/malditogeek/followers',
        html_url: 'https://github.com/malditogeek',
        url: 'https://api.github.com/users/malditogeek',
        gravatar_id: '4605adbcd13e20c14e82fcf528b516e6',
        avatar_url:
          'https://0.gravatar.com/avatar/4605adbcd13e20c14e82fcf528b516e6?d=https%3A%2F%2Fidenticons.github.com%2Fefad653e1abded64a74417c531cdca0f.png&r=x',
        id: 14751,
        login: 'malditogeek'
      },
      full_name: 'malditogeek/hook',
      name: 'hook',
      id: 12241610
    },
    pages: [
      {
        html_url: 'https://github.com/malditogeek/hook/wiki/Home',
        sha: 'e5ae6096283b1b0e14f0d2d6c303fdfbe36f415e',
        action: 'created',
        summary: null,
        title: 'Home',
        page_name: 'Home'
      }
    ]
  },
  v: 1
};

const PARAMS = { data: { root: {} }, hash: {} };

describe('prerenderActivityHelper', function() {
  it('should prerender GitHub issues event', function() {
    const events = [GITHUB_ISSUES_EVENT];

    const result = prerenderActivityHelper(events, PARAMS);
    const issueNumberMatch = result.match(/data-issue="(.*?)"/);
    // Looking for payload.issue.number
    assert.strictEqual(issueNumberMatch[1], '5');
  });

  it('should prerender GitHub pull_request event', function() {
    const events = [GITHUB_PULL_REQUEST_EVENT];

    const result = prerenderActivityHelper(events, PARAMS);
    const pullRequestHrefMatch = result.match(/href="(.*?)"/);
    // Looking for payload.pull_request.html_url
    assert.strictEqual(pullRequestHrefMatch[1], 'https://github.com/malditogeek/hook/pull/6');
  });

  it('should prerender GitHub gollum(wiki) event', function() {
    const events = [GITHUB_GOLLUM_EVENT];

    const result = prerenderActivityHelper(events, PARAMS);
    const pullRequestHrefMatch = result.match(/activity-detail"><a href="(.*?)"/);
    // Looking for payload.pages[0].html_url
    assert.strictEqual(pullRequestHrefMatch[1], 'https://github.com/malditogeek/hook/wiki/Home');
  });

  it('should avoid XSS in GitHub pull_request event (javascript: schema)', function() {
    const eventWithXSS = _.cloneDeep(GITHUB_PULL_REQUEST_EVENT);
    eventWithXSS.payload.pull_request.html_url = 'javascript:alert(1)';
    const events = [eventWithXSS];

    const result = prerenderActivityHelper(events, PARAMS);
    const pullRequestHrefMatch = result.match(/href="(.*?)"/);
    // Looking for payload.pull_request.html_url but empty because detected XSS link
    assert.strictEqual(pullRequestHrefMatch[1], '');
    assert(result.indexOf('javascript:') === -1);
  });

  it('should avoid XSS in GitHub gollum(wiki) event (data: schema)', function() {
    const eventWithXSS = _.cloneDeep(GITHUB_GOLLUM_EVENT);
    eventWithXSS.payload.pages[0].html_url = 'data:text/html,<script>alert(1)</script>;?sss';
    const events = [eventWithXSS];

    const result = prerenderActivityHelper(events, PARAMS);
    const pullRequestHrefMatch = result.match(/activity-detail"><a href="(.*?)"/);
    // Looking for payload.pages[0].html_url but empty because detected XSS link
    assert.strictEqual(pullRequestHrefMatch[1], '');
    assert(result.indexOf('data:') === -1);
  });

  it('should avoid XSS in GitHub gollum(wiki) event (HTML)', function() {
    const eventWithXSS = _.cloneDeep(GITHUB_GOLLUM_EVENT);
    eventWithXSS.payload.pages[0].html_url =
      'http://example.com/test?q=" target="_blank"><script>alert(1)</script>';
    const events = [eventWithXSS];

    const result = prerenderActivityHelper(events, PARAMS);
    const pullRequestHrefMatch = result.match(/activity-detail"><a href="(.*?)"/);
    // Looking for payload.pages[0].html_url but empty because detected XSS link
    assert.strictEqual(
      pullRequestHrefMatch[1],
      'http://example.com/test?q=&quot; target=&quot;_blank&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    assert(result.indexOf('<script>') === -1);
  });
});
