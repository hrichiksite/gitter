'use strict';

var Mirror = require('gitter-web-github').GitHubMirrorService('repo');
var processText = require('gitter-web-text-processor');
var util = require('util');
var highlight = require('highlight.js');
var StatusError = require('statuserror');

highlight.configure({ classPrefix: '' });

module.exports = function(req, res, next) {
  if (!req.params || !req.params[0]) return next(new StatusError(404));

  var githubUri = 'repos/' + req.params[0];
  var mirror = new Mirror(req.user);

  mirror
    .get(githubUri)
    .then(function(ghResponse) {
      if (req.query.renderMarkdown && ghResponse.body) {
        return processText(ghResponse.body).then(function(result) {
          ghResponse.body_html = result.html;
          return ghResponse;
        });
      }

      // TODO: handle async processing of diffs
      if (
        req.query.renderPatchIfSingle &&
        ghResponse.files &&
        ghResponse.files.length === 1 &&
        ghResponse.files[0].patch
      ) {
        ghResponse.files[0].patch_html = util.format(
          '<pre><code>%s</code></pre>',
          highlight.highlight('diff', ghResponse.files[0].patch).value
        );
      }

      return ghResponse;
    })
    .then(function(ghResponse) {
      res.send(ghResponse);
    })
    .catch(function(err) {
      var status = err.status || err.statusCode;
      if (status) {
        res.sendStatus(status);
      } else {
        next(err);
      }
    });
};
