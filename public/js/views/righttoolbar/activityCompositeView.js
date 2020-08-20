'use strict';
var _ = require('lodash');
var Marionette = require('backbone.marionette');
var classnames = require('classnames');
var appEvents = require('../../utils/appevents');
var issuableDecorator = require('../chat/decorators/issuableDecorator');
var commitDecorator = require('../chat/decorators/commitDecorator');
var mentionDecorator = require('../chat/decorators/mentionDecorator');
var debug = require('debug-proxy')('app:activity-composite-view');
var githubPushTemplate = require('./tmpl/githubPush.hbs');
var githubIssuesTemplate = require('./tmpl/githubIssues.hbs');
var githubIssueCommentTemplate = require('./tmpl/githubIssueComment.hbs');
var githubCommitCommentTemplate = require('./tmpl/githubCommitComment.hbs');
var githubPullRequestTemplate = require('./tmpl/githubPullRequest.hbs');
var githubGollumTemplate = require('./tmpl/githubGollum.hbs');
var githubForkTemplate = require('./tmpl/githubFork.hbs');
var githubMemberTemplate = require('./tmpl/githubMember.hbs');
var githubPublicTemplate = require('./tmpl/githubPublic.hbs');
var githubWatchTemplate = require('./tmpl/githubWatch.hbs');
var bitbucketTemplate = require('./tmpl/bitbucket.hbs');
var huboardTemplate = require('./tmpl/huboard.hbs');
var jenkinsTemplate = require('./tmpl/jenkins.hbs');
var travisTemplate = require('./tmpl/travis.hbs');
var sprintlyTemplate = require('./tmpl/sprintly.hbs');
var trelloTemplate = require('./tmpl/trello.hbs');
var prerenderedTemplate = require('./tmpl/activity-item-prerendered.hbs');
var activityTemplate = require('./tmpl/activity-composite.hbs');
var activityEmptyTemplate = require('./tmpl/activity-empty.hbs');
var activityDecorators = require('gitter-web-shared/activity/activity-decorators');
var context = require('gitter-web-client-context');
var clientEnv = require('gitter-client-env');
var timeFormat = require('gitter-web-shared/time/time-format');
var fullTimeFormat = require('gitter-web-shared/time/full-time-format');
var compositeViewRenderTemplate = require('../../utils/composite-view-render-template');

require('../behaviors/timeago');
require('../behaviors/tooltip');

module.exports = (function() {
  var serviceTemplates = {
    bitbucket: bitbucketTemplate,
    huboard: huboardTemplate,
    jenkins: jenkinsTemplate,
    travis: travisTemplate,
    sprintly: sprintlyTemplate,
    trello: trelloTemplate
  };

  var githubTemplates = {
    push: githubPushTemplate,
    issues: githubIssuesTemplate,
    issue_comment: githubIssueCommentTemplate,
    commit_comment: githubCommitCommentTemplate,
    pull_request: githubPullRequestTemplate,
    gollum: githubGollumTemplate,
    fork: githubForkTemplate,
    member: githubMemberTemplate,
    public: githubPublicTemplate,
    watch: githubWatchTemplate
  };

  function getTemplateForModel(model) {
    var meta = model.get('meta');
    var service = meta.service;

    if (service == 'github') {
      var event = meta.event;
      return githubTemplates[event];
    }

    if (meta.prerendered) {
      return prerenderedTemplate;
    }

    return serviceTemplates[service];
  }

  var ActivityItemView = Marionette.ItemView.extend({
    tagName: 'li',
    attributes: function() {
      var classMap = {
        'activity-item': true
      };
      return {
        class: classnames(classMap)
      };
    },
    modelEvents: {
      change: 'render'
    },
    behaviors: {
      TimeAgo: {
        modelAttribute: 'sent',
        el: '#time'
      },
      Tooltip: {
        '#time': {
          titleFn: 'getTimeTooltip',
          placement: 'left'
        }
      }
    },

    initialize: function() {
      this.template = getTemplateForModel(this.model);
    },

    serializeData: function() {
      try {
        var meta = this.model.get('meta');
        var payload = this.model.get('payload');
        var sent = this.model.get('sent');
        var html = this.model.get('html');
        var sentFormatted = timeFormat(sent, { compact: true });

        var core = {
          meta: meta,
          payload: payload,
          sent: sent,
          sentFormatted: sentFormatted,
          html: html
        };

        var extra = meta.prerendered ? {} : activityDecorators(meta, payload);
        var result = _.extend(core, extra);
        return result;
      } catch (e) {
        var modelData = this.model && this.model.attributes;
        appEvents.trigger('bugreport', e, { extra: modelData });
        debug(
          'Err rendering activity item: error=%s, stack=%s, data=%j',
          e.message,
          e.stack,
          modelData
        );
        return {};
      }
    },

    onRender: function() {
      issuableDecorator.decorate(this);
      commitDecorator.decorate(this);
      mentionDecorator.decorate(this);
    },

    getTimeTooltip: function() {
      var sent = this.model.get('sent');
      return fullTimeFormat(sent);
    }
  });

  var ActivityEmptyItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'activity-tip',
    template: activityEmptyTemplate,
    serializeData: function() {
      var isNativeDesktopApp = context().isNativeDesktopApp;
      var basePath = isNativeDesktopApp ? clientEnv['basePath'] + context.troupe().get('url') : '';
      var integrationsUrl = basePath + '#integrations';

      return {
        integrationsUrl: integrationsUrl,
        isNativeDesktopApp: isNativeDesktopApp
      };
    }
  });

  var ActivityView = Marionette.CompositeView.extend({
    template: activityTemplate,
    className: 'gtrActivityContainer',
    childViewContainer: '#activity-list',
    childView: ActivityItemView,
    collectionEvents: {
      'add reset sync reset loaded loading': '_showHideHeader',
      reset: 'onCollectionReset'
    },
    childViewOptions: function(item) {
      if (item && item.id) {
        // This allows the chat collection view to bind to an existing element...
        var e = this.$el.find('.model-id-' + item.id)[0];
        if (e) return { el: e };
      }
    },
    getEmptyView: function() {
      // Admins see "Configure your integrations" empty
      if (context.isTroupeAdmin()) return ActivityEmptyItemView;
    },
    ui: {
      header: '#activity-header'
    },
    onCollectionReset: function() {
      if (this.collection.length) return;

      var el = this.$el.find(this.childViewContainer)[0];
      if (!el) return;

      var child;
      while ((child = el.firstChild)) {
        el.removeChild(child);
      }
    },
    onRender: function() {
      this._showHideHeader();
    },
    _showHideHeader: function() {
      // Admins see the header when the collection is empty
      // so that they get to
      var viewReloading = this.collection.length === 0 && this.collection.loading;
      this.$el.toggleClass('loading', viewReloading);
      var headerVisible =
        !context.inOneToOneTroupeContext() && !!(context.isTroupeAdmin() || this.collection.length);
      this.ui.header.toggle(headerVisible);
    },

    _renderTemplate: compositeViewRenderTemplate
  });

  return ActivityView;
})();
