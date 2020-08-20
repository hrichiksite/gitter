'use strict';

var processText = require('gitter-web-text-processor');
var StatusError = require('statuserror');

function markdownPreview(req, res, next) {
  if (!req.user) {
    return next(new StatusError(401));
  }
  return processText(req.body.text)
    .then(function(parsed) {
      res.set('Content-Type', 'text/html');
      res.send(parsed.html);
    })
    .catch(next);
}

module.exports = markdownPreview;
