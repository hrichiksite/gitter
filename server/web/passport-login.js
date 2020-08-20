'use strict';

const assert = require('assert');

/**
 * This code removes a possible session fixation. We regenerate the session
 * upon logging in so an anonymous session cookie can't be reused.
 *
 * References:
 *  - https://github.com/jaredhanson/passport/issues/192#issuecomment-162836516
 *  - https://stackoverflow.com/a/26394156/606571
 */
async function regeneratePassportSession(req) {
  const passportSession = req.session.passport;
  // parameter used for returning to URL user visited before authentication
  // used for OAuth login flow (https://gitlab.com/gitlab-org/gitter/webapp/issues/2283)
  const { returnTo } = req.session;
  return new Promise((resolve, reject) =>
    req.session.regenerate(function(err) {
      if (err) reject(err);
      assert(!req.session.passport);
      req.session.passport = passportSession;
      req.session.returnTo = returnTo;
      req.session.save(function(err) {
        if (err) reject(err);
        resolve();
      });
    })
  );
}

/**
 * Adds user to passport, if this is the
 * first time (user just logged in) we generate a new session
 * and returns a user with identity object
 */
module.exports = async function(req, user) {
  // if user just logged in (session hasn't been authenticated before)
  if (!req.user) await regeneratePassportSession(req);
  await new Promise((resolve, reject) => {
    req.login(user, err => {
      if (err) reject(err);
      resolve();
    });
  });
  return user;
};
