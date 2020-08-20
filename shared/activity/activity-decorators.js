'use strict';

var decorators = {
  trello: function(meta, payload) {
    // jshint unused:true
    var trello_actions = {
      updateCard: 'updated',
      createCard: 'created',
      commentCard: 'commented',
      voteOnCard: 'voted'
    };
    return { trello_action: trello_actions[payload.action.type] };
  },

  sprintly: function(meta, payload) {
    // jshint unused:true
    var extra = {};

    if (payload.model == 'Item') {
      extra.sprintly_action = 'created';
    } else if (payload.model == 'Comment') {
      extra.sprintly_action = 'commented on';
    }
    return extra;
  },

  bitbucket: function(meta) {
    // meta.commits is undefined for empty arrays in old hooks.
    // this is because of issue #233 (form encoding was removing empty arrays)
    var commits = meta.commits || [];
    return {
      first_commit: commits[0],
      is_single_commit: commits.length === 1,
      commits_count: commits.length
    };
  },

  github: function(meta, payload) {
    var extra = {};

    if (meta.event == 'push') {
      // if you push a tag, then commits is undefined
      var commits = payload.commits || [];
      var commitCount = commits.length;

      extra.commits = commits;
      extra.commits.forEach(function(commit) {
        commit.short_sha = commit.id.substring(0, 7);
        var message = commit.message;
        commit.short_message = message.length > 32 ? message.substr(0, 31) + '…' : message;
      });

      if (commitCount > 3) {
        extra.commits = extra.commits.slice(0, 3);
        extra.hidden_commit_count = commitCount - 3;
      }

      extra.commits_count = commitCount;
    } else if (meta.event == 'gollum') {
      extra.wiki_url = payload.pages[0].html_url;
      extra.wiki_page = payload.pages[0].page_name;
    } else if (meta.event === 'commit_comment') {
      // fall back to payload data for old hooks
      extra.commit = meta.commit || {
        id: payload.comment.commit_id,
        short_sha: payload.comment.commit_id.substring(0, 7)
      };
    }
    return extra;
  },

  jenkins: function(meta, payload) {
    // jshint unused:true
    var status = payload.build.status
      ? payload.build.status.toLowerCase()
      : payload.build.phase.toLowerCase();
    return { build_status: status };
  },

  travis: function(meta, payload) {
    // jshint unused:true
    var extra = {};
    var status = payload.status_message ? payload.status_message.toLowerCase() : '';
    extra.build_status = status === 'still failing' ? 'failing' : status;
    return extra;
  },

  huboard: function(meta) {
    var extra = {};
    var column = meta.column;
    var previousColumn = meta.previousColumn;

    if (meta.milestone) {
      extra.context = 'to ' + meta.milestone;
    } else if (meta.status) {
      extra.context = 'to ' + meta.status;
    } else if (column) {
      extra.context = previousColumn ? 'from ' + previousColumn + ' to ' + column : 'in ' + column;
    }
    return extra;
  }
};

module.exports = function getExtraRenderData(meta, payload) {
  var decorator = decorators[meta.service];
  var extra = decorator ? decorator(meta, payload) : {};

  // Support branch names with slashes, ie: develop/feature/123-foo
  if (payload && payload.ref) {
    var refs = payload.ref.split('/');
    extra.branch_name = refs[3] ? refs[3] : refs[2];
    extra.repo = payload.repository.owner.name + '/' + payload.repository.name;
  }

  return extra;
};
