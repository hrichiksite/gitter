'use strict';

var renderChat = require('./chat-internal');
var orgRenderer = require('./org');

function renderView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;
  var group = uriContext.group;

  if (troupe) {
    if (req.user) {
      return renderChat(req, res, next, {
        uriContext: uriContext,
        template: 'chat-template',
        script: 'router-chat'
      });
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      var url = req.originalUrl;
      req.session.returnTo = url.replace(/\/~\w+(\?.*)?$/, '');

      return renderChat(req, res, next, {
        uriContext: uriContext,
        template: 'chat-nli-template',
        script: 'router-nli-chat'
      });
    }
  }

  if (group) {
    return orgRenderer.renderOrgPage(req, res, next);
  }
}

module.exports = {
  renderView: renderView
};
