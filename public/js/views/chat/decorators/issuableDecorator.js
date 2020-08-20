'use strict';

var Promise = require('bluebird');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var log = require('../../../utils/log');
var context = require('gitter-web-client-context');
var apiClient = require('../../../components/api-client');
var appEvents = require('../../../utils/appevents');
var moment = require('moment');
var Popover = require('../../popover');
var bodyTemplate = require('./tmpl/issuePopover.hbs');
var titleTemplate = require('./tmpl/issuePopoverTitle.hbs');
var footerTemplate = require('./tmpl/commitPopoverFooter.hbs');
var SyncMixin = require('../../../collections/sync-mixin');

function isGitHubUser(user) {
  // Handle Backbone model or pojo
  return (
    user &&
    (user.providers || user.get('providers')).some(function(provider) {
      return provider === 'github';
    })
  );
}

// This is used for the legacy <span> references
function convertToIssueAnchor(element, issueUrl) {
  var resultantElement = element;
  if (
    element.tagName !== 'a' &&
    // Protect against Safari-backed desktop app somehow isolating the node and removing the parent
    element.parentNode
  ) {
    var newElement = document.createElement('a');
    newElement.innerHTML = element.innerHTML;
    element.parentNode.replaceChild(newElement, element);

    if (element.hasAttributes()) {
      var attributes = element.attributes;
      for (var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        newElement.setAttribute(attr.name, attr.value);
      }
    }

    newElement.setAttribute('href', issueUrl || '');
    newElement.setAttribute('target', '_blank');

    resultantElement = newElement;
  }

  return resultantElement;
}

function getIssuableState(type, provider, repo, issueNumber) {
  return apiClient.priv
    .get('/issue-state', {
      t: type,
      p: provider,
      r: repo,
      i: issueNumber
    })
    .then(function(states) {
      return states[0];
    });
}

var BodyView = Marionette.ItemView.extend({
  className: 'issue-popover-body',
  template: bodyTemplate,
  modelEvents: {
    change: 'render'
  },
  serializeData: function() {
    var data = this.model.toJSON();
    data.date = moment(data.created_at).format('LLL');
    return data;
  }
});

var TitleView = Marionette.ItemView.extend({
  className: 'issue-popover-title',
  modelEvents: {
    change: 'render'
  },
  template: titleTemplate
});

var FooterView = Marionette.ItemView.extend({
  className: 'commit-popover-footer',
  template: footerTemplate,
  events: {
    'click button.mention': 'onMentionClick'
  },
  modelEvents: {
    change: 'render'
  },
  onMentionClick: function() {
    getRoomRepo()
      .then(roomRepo => {
        var modelRepo = this.model.get('repo');
        var modelNumber = this.model.get('number');
        var mentionText =
          modelRepo === roomRepo ? '#' + modelNumber : modelRepo + '#' + modelNumber;
        appEvents.trigger('input.append', mentionText);
      })
      .catch(err => {
        log.error(`Problem getting room repo`, { exception: err });
      });

    this.parentPopover.hide();
  }
});

var associatedRepoMemoization = null;

/**
 * Rememoize after room change
 */
context.troupe().on('change:id', function() {
  associatedRepoMemoization = null;
});

function getRoomRepo() {
  var room = context.troupe();
  if (!room) {
    return Promise.reject('No current room');
  }

  if (associatedRepoMemoization) return associatedRepoMemoization;

  var roomId = room.get('id');
  var unlisten;

  // Only runs if the cache misses
  associatedRepoMemoization = new Promise(function(resolve, reject) {
    // Check if the snapshot already came in
    var associatedRepo = room.get('associatedRepo');

    if (associatedRepo || associatedRepo === false) {
      return resolve(associatedRepo || null);
    }

    // Wait for the realtime-troupe-listener snapshot to come in
    function onChange() {
      var updatedRoomId = room.get('id');

      // The room could have changed since the request came back in
      if (roomId !== updatedRoomId) {
        return reject(new Error('Expired'));
      }

      var associatedRepo = room.get('associatedRepo');

      if (associatedRepo || associatedRepo === false) {
        return resolve(associatedRepo || null);
      }
    }

    unlisten = function() {
      room.off('change', onChange);
    };

    room.on('change', onChange);
  }).finally(function() {
    if (unlisten) {
      unlisten();
    }
  });

  return associatedRepoMemoization;
}

function createPopover(model, targetElement) {
  return new Popover({
    titleView: new TitleView({ model: model }),
    view: new BodyView({ model: model }),
    footerView: new FooterView({ model: model }),
    targetElement: targetElement,
    placement: 'horizontal'
  });
}

var IssueModel = Backbone.Model.extend({
  urlRoot: function() {
    return apiClient.priv.uri('/issue-mirror');
  },
  sync: SyncMixin.sync
});

// eslint-disable-next-line complexity
function getAnchorUrl(githubRepo, issueNumber) {
  var currentRoom = context.troupe();
  var currentGroup = context.group();
  var backedBy = currentGroup && currentGroup.get('backedBy');

  if (githubRepo) {
    return 'https://github.com/' + githubRepo + '/issues/' + issueNumber;
  }

  var currentUser = context.user();

  // One-to-ones
  if (!githubRepo && currentRoom.get('oneToOne')) {
    var otherUser = currentRoom.get('user');

    if (currentUser && isGitHubUser(currentUser) && otherUser && isGitHubUser(otherUser)) {
      return (
        'https://github.com/issues?q=' +
        issueNumber +
        '+%28involves%3A' +
        currentUser.get('username') +
        '+OR+involves%3A' +
        otherUser.username +
        '+%29'
      );
    }
  }

  // We don't know the REPO, but we know the org?
  if (backedBy && backedBy.type === 'GH_ORG') {
    return 'https://github.com/issues?q=' + issueNumber + '+user%3A' + backedBy.linkPath;
  }

  if (currentUser && isGitHubUser(currentUser)) {
    return (
      'https://github.com/issues?q=' + issueNumber + '+involves:' + currentUser.get('username')
    );
  }

  return 'https://github.com/issues?q=' + issueNumber;
}

function bindAnchorToIssue(view, issueElement, type, provider, repo, issueNumber, anchorUrl) {
  // Lazy model, will be fetched when it's needed, but not before
  function getModel() {
    var model = new IssueModel({
      type: type,
      provider: provider || 'github',
      repo: repo,
      number: issueNumber,
      html_url: anchorUrl
    });

    model.fetch({
      data: {
        renderMarkdown: true,
        t: type,
        p: provider,
        r: repo,
        i: issueNumber
      },
      error: function() {
        model.set({ error: true });
      }
    });
    return model;
  }

  function showPopover(e, model) {
    if (!model) model = getModel();

    var popover = createPopover(model, e.target);
    popover.show();
    Popover.singleton(view, popover);
  }

  function showPopoverLater(e) {
    var model = getModel();

    Popover.hoverTimeout(e, function() {
      showPopover(e, model);
    });
  }

  // Hook up all of the listeners
  issueElement.addEventListener('mouseover', showPopoverLater);

  view.once('destroy', function() {
    issueElement.removeEventListener('mouseover', showPopoverLater);
  });
}

/*
  This is temporary workaround for incorrectly parsed repo attributes (fixes decoration of messages already in DB).
  Removing the `/-` from the end of parsed repo.
  https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2453#temporary-ui-fix-for-malformed-repo-urls

  We can remove this workaround in about 6 months. The assumption is that 6 months old messages are going to be hidden in history
  and failing decoration is no longer a big issue. Benefit of less complexity will outweigh a small bug.
  TODO: remove anytime after 2020-10-01
*/
const removeGitLabDashFromRepo = repo => repo.replace(/\/-$/, '');

var decorator = {
  decorate: function(view) {
    Array.prototype.forEach.call(
      view.el.querySelectorAll(
        '*[data-link-type="issue"], *[data-link-type="mr"], *[data-link-type="pr"]'
      ),
      function(issueElement) {
        return Promise.try(function() {
          var repoFromElement = issueElement.dataset.issueRepo;

          if (repoFromElement) {
            // TODO: remove GitLab workaround anytime after 2020-10-01
            return removeGitLabDashFromRepo(repoFromElement);
          }

          return getRoomRepo();
        })
          .then(function(repo) {
            var type = issueElement.dataset.linkType || 'issue';
            var issueNumber = issueElement.dataset.issue;
            var anchorUrl = issueElement.getAttribute('href') || getAnchorUrl(repo, issueNumber);
            if (anchorUrl) {
              // This is used for the legacy <span> references
              issueElement = convertToIssueAnchor(issueElement, anchorUrl);
            }
            var provider = issueElement.dataset.provider || 'github';

            if (repo && issueNumber) {
              getIssuableState(type, provider, repo, issueNumber)
                .then(function(state) {
                  if (!state) return;

                  // We depend on this to style the issue after making sure it is an issue
                  issueElement.classList.add('is-existent');

                  // dont change the issue state colouring for the activity feed
                  if (
                    !issueElement.classList.contains('open') &&
                    !issueElement.classList.contains('closed')
                  ) {
                    issueElement.classList.add(state);
                  }

                  bindAnchorToIssue(
                    view,
                    issueElement,
                    type,
                    provider,
                    repo,
                    issueNumber,
                    anchorUrl
                  );
                })
                .catch(err => {
                  log.error(`Problem fetching issuable state ${repo}#${issueNumber}`, {
                    exception: err
                  });
                });
            }
          })
          .catch(err => {
            log.error(`Problem getting repo for room`, { exception: err });
          });
      }
    );
  }
};

module.exports = decorator;
