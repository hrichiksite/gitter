'use strict';

var _ = require('lodash');
var compileTemplate = require('./compile-web-template');
var activityDecorators = require('gitter-web-shared/activity/activity-decorators');
var prerenderWrapper = require('./prerender-wrapper');
var timeFormat = require('gitter-web-shared/time/time-format');

function compile(template) {
  return compileTemplate('/js/views/righttoolbar/tmpl/' + template + '.hbs');
}

var compositeTemplate = compile('activity-composite');
var prerenderedTemplate = compile('activity-item-prerendered');

var serviceTemplates = {
  bitbucket: compile('bitbucket'),
  huboard: compile('huboard'),
  jenkins: compile('jenkins'),
  travis: compile('travis'),
  sprintly: compile('sprintly'),
  trello: compile('trello')
};

var githubTemplates = {
  push: compile('githubPush'),
  issues: compile('githubIssues'),
  issue_comment: compile('githubIssueComment'),
  commit_comment: compile('githubCommitComment'),
  pull_request: compile('githubPullRequest'),
  gollum: compile('githubGollum'),
  fork: compile('githubFork'),
  member: compile('githubMember'),
  public: compile('githubPublic'),
  watch: compile('githubWatch')
};

function renderItem(model, lang, tzOffset) {
  var meta = model.meta;
  var service = meta.service;
  var template;

  // select template
  if (service === 'github') {
    var event = meta.event;
    template = githubTemplates[event];
  } else {
    if (!meta.prerendered) template = serviceTemplates[service];
  }

  if (!template) template = prerenderedTemplate;

  var sentFormatted = timeFormat(model.sent, { lang: lang, tzOffset: tzOffset });

  // template data
  var templateData = {
    meta: meta,
    payload: model.payload,
    sent: model.sent,
    sentFormatted: sentFormatted,
    html: model.html
  };

  /* Add extra details for non-prerendered */
  if (!meta.prerendered) {
    var extra = activityDecorators(meta, model.payload);
    _.extend(templateData, extra);
  }

  var inner = template(templateData);

  return prerenderWrapper({
    className: 'activity-item model-id-' + model.id,
    wrap: 'li',
    inner: inner
  });
}

function wrapContent(inner, params) {
  var hash = params.hash;

  var wrap = hash.wrap;
  if (!wrap) return inner;

  var className = hash.className;
  var id = hash.id;

  return prerenderWrapper({
    className: className,
    id: id,
    wrap: wrap,
    inner: inner
  });
}

module.exports = function renderCollection(collection, params) {
  var root = params.data.root;

  var lang = root.lang;
  var tzOffset = root.tzOffset;

  var innerContent = collection
    ? collection
        .map(function(item) {
          return renderItem(item, lang, tzOffset);
        })
        .join('')
    : '';

  return wrapContent(
    compositeTemplate({
      _prerender_inner: innerContent
    }),
    params
  );
};
