'use strict';
var $ = require('jquery');
var Backbone = require('backbone');
var appEvents = require('../../../utils/appevents');
var apiClient = require('../../../components/api-client');
var Popover = require('../../popover');
var template = require('./tmpl/commitPopover.hbs');
var titleTemplate = require('./tmpl/commitPopoverTitle.hbs');
var footerTemplate = require('./tmpl/commitPopoverFooter.hbs');
var moment = require('moment');
var Marionette = require('backbone.marionette');

module.exports = (function() {
  var MAX_PATH_LENGTH = 40;

  var BodyView = Marionette.ItemView.extend({
    className: 'commit-popover-body',
    template: template,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      var data = this.model.toJSON();

      if (data.author) {
        data.date = moment(data.commit.author.date).format('LLL');

        data.files.forEach(function(file) {
          if (file.filename.length > MAX_PATH_LENGTH) {
            file.fullFilename = file.filename;
            file.filename = getShortPath(file.filename);
          }
        });

        if (data.files.length === 1) {
          data.isFileLengthSingular = true;
          if (data.files[0].patch_html) {
            data.firstPatchHtml = data.files[0].patch_html;
          }
        }

        if (data.stats.additions === 1) {
          data.isAdditionsSingular = true;
        }

        if (data.stats.deletions === 1) {
          data.isDeletionsSingular = true;
        }
      }

      return data;
    }
  });

  var TitleView = Marionette.ItemView.extend({
    className: 'commit-popover-title',
    modelEvents: {
      change: 'render'
    },
    template: titleTemplate,
    serializeData: function() {
      var data = this.model.toJSON();
      data.shortSha = data.sha.substring(0, 7);
      return data;
    }
  });

  var FooterView = Marionette.ItemView.extend({
    className: 'commit-popover-footer',
    template: footerTemplate,
    modelEvents: {
      change: 'render'
    },
    events: {
      'click button.mention': 'onMentionClick'
    },
    onMentionClick: function() {
      var mentionText = this.model.get('repo') + '@' + this.model.get('sha').substring(0, 7);
      appEvents.trigger('input.append', mentionText);
      this.parentPopover.hide();
    }
  });

  function getShortPath(pathString) {
    // if you have one long filename
    if (pathString.split('/').length === 1) {
      return pathString.substring(0, MAX_PATH_LENGTH - 1) + '…';
    }

    var shortPath = pathString;

    // remove parents until short enough: a/b/c/d.ext -> …/c/d.ext
    while (shortPath.length > MAX_PATH_LENGTH - 2) {
      var parts = shortPath.split('/');
      // cant remove any more parents
      if (parts.length === 1) {
        parts[0] = parts[0].substring(0, MAX_PATH_LENGTH - 3) + '…';
      } else {
        parts.shift();
      }
      shortPath = parts.join('/');
    }
    return '…/' + shortPath;
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

  function syncModel(repo, sha, model) {
    apiClient.priv
      .get('/gh/repos/' + repo + '/commits/' + sha, { renderPatchIfSingle: true })
      .then(function(commit) {
        model.set(commit);
      })
      .catch(function(err) {
        model.set('error', err.status);
      });
  }

  var decorator = {
    decorate: function(view) {
      view.$el.find('*[data-link-type="commit"]').each(function() {
        function showPopover(e) {
          syncModel(repo, sha, model);

          var popover = createPopover(model, e.target);
          popover.show();
          Popover.singleton(view, popover);
        }

        function showPopoverLater(e) {
          syncModel(repo, sha, model);

          Popover.hoverTimeout(e, function() {
            var popover = createPopover(model, e.target);
            popover.show();
            Popover.singleton(view, popover);
          });
        }

        var $commit = $(this);
        var provider = $commit.data('provider');
        var repo = $commit.data('commitRepo');
        var sha = $commit.data('commitSha');

        if (!repo || !sha) return;

        var baseUrl = 'https://github.com/';
        if (provider === 'gitlab') {
          baseUrl = 'https://gitlab.com/';
        }

        var model = new Backbone.Model({
          repo: repo,
          sha: sha,
          html_url: baseUrl + repo + '/commit/' + sha
        });

        $commit.on('click', showPopover);
        $commit.on('mouseover', showPopoverLater);

        view.once('destroy', function() {
          $commit.off('click', showPopover);
          $commit.off('mouseover', showPopoverLater);
        });
      });
    }
  };

  return decorator;
})();
