'use strict';

var userScopes = require('gitter-web-identity/lib/user-scopes');

function redirectAfterLogin(req, res) {
  if (req.session && req.session.githubScopeUpgrade) {
    delete req.session.githubScopeUpgrade;

    res.render('github-upgrade-complete', {
      oAuthCompletePostMessage: JSON.stringify({
        type: 'oauth_upgrade_complete',
        scopes: userScopes.getScopesHash(req.user)
      })
    });

    return;
  }

  if (req.session && req.session.returnTo) {
    res.redirect(req.session.returnTo);
    return;
  }

  var user = req.user;
  if (user) {
    res.redirect('/' + user.username);
  } else {
    res.redirect('/');
  }
}

module.exports = redirectAfterLogin;
