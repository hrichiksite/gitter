'use strict';

/**
 * Module dependencies.
 */
var env = require('gitter-web-env');
var logger = env.logger;
var errorReporter = env.errorReporter;
var stats = env.stats;
const url = require('url');

var oauth2orize = require('oauth2orize');
var passport = require('passport');
var oauthService = require('gitter-web-oauth');
var random = require('gitter-web-oauth/lib/random');
var ensureLoggedIn = require('./middlewares/ensure-logged-in');

const OauthAuthorizationError = require('./oauth-authorization-error');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's Id, and deserializing by finding
// the client by Id from the database.

server.serializeClient(function(client, done) {
  return done(null, client.id);
});

server.deserializeClient(function(id, done) {
  oauthService.findClientById(id, done);
});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(
  oauth2orize.grant.code(function(client, redirectUri, user, ares, done) {
    logger.info('Granted access to ' + client.name + ' for ' + user.displayName);

    random.generateToken(function(err, token) {
      if (err) {
        return done(err);
      }

      oauthService.saveAuthorizationCode(token, client, redirectUri, user, function(err) {
        if (err) {
          return done(err);
        }
        done(null, token);
      });
    });
  })
);

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(
  oauth2orize.exchange.code(async function(client, code, redirectUri, done) {
    try {
      const authCode = await oauthService.findAuthorizationCode(code);
      if (!authCode) return done();

      if (!client._id.equals(authCode.clientId)) {
        return done();
      }
      if (redirectUri !== authCode.redirectUri) {
        return done();
      }

      const token = await oauthService.findOrCreateToken(authCode.userId, authCode.clientId);
      // > The client MUST NOT use the authorization code more than once.
      // > https://tools.ietf.org/html/rfc6749#section-4.1.2
      await oauthService.deleteAuthorizationCode(code);
      done(null, token);
    } catch (err) {
      if (err) return done(err);
    }
  })
);

// user authorization endpoint
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request.  In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary across
// implementations.  Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction.  It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization).  We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

exports.authorization = [
  ensureLoggedIn,
  server.authorization(async function(clientKey, redirectUri, done) {
    try {
      stats.event('oauth.authorize');
      const client = await oauthService.findClientByClientKey(clientKey);

      if (!client) {
        return done(new OauthAuthorizationError('Provided clientKey does not exist.'));
      }

      if (
        !client.registeredRedirectUri ||
        !redirectUri ||
        client.registeredRedirectUri !== redirectUri
      ) {
        logger.warn('Provided redirectUri does not match registered URI for client_id/clientKey ', {
          redirectUri: redirectUri,
          registeredUri: client.registeredRedirectUri,
          clientKey: clientKey
        });

        return done(
          new OauthAuthorizationError(
            'Provided redirectUri does not match registered URI for client_id/clientKey'
          )
        );
      }

      const urlData = url.parse(client.registeredRedirectUri);
      const hasBadProtocol =
        !urlData.protocol || urlData.protocol === 'javascript:' || urlData.protocol === 'data:';
      if (hasBadProtocol) {
        logger.warn('Provided redirectUri is using disallowed bad protocol ', {
          redirectUri: redirectUri,
          registeredUri: client.registeredRedirectUri,
          clientKey: clientKey
        });

        return done(
          new OauthAuthorizationError(
            'Provided redirectUri is using disallowed bad protocol (no javascript:// or data://)'
          )
        );
      }

      return done(null, client, redirectUri);
    } catch (err) {
      errorReporter(err, { clientKey, redirectUri }, { module: 'oauth.authorize' });
      done(new OauthAuthorizationError('Error occured while oauth.authorize'));
    }
  }),
  function(req, res, next) {
    /* Is this client allowed to skip the authorization page? */
    if (req.oauth2.client.canSkipAuthorization) {
      return server.decision({ loadTransaction: false })(req, res, next);
    }

    stats.event('oauth.authorize.dialog');

    /* Non-trusted Client */
    res.render('oauth_authorize_dialog', {
      transactionId: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client
    });
  },
  function(err, req, res, next) {
    stats.event('oauth.authorize.failed');
    errorReporter(err, { oauthAuthorizationDialog: 'failed' }, { module: 'oauth2' });

    var missingParams = ['response_type', 'redirect_uri', 'client_id'].filter(function(param) {
      return !req.query[param];
    });

    var incorrectResponseType = req.query.response_type && req.query.response_type !== 'code';

    if (err instanceof OauthAuthorizationError || missingParams.length || incorrectResponseType) {
      res.status(401);
      res.render('oauth_authorize_failed', {
        errorMessage: err.message,
        missingParams: missingParams.length && missingParams,
        incorrectResponseType: incorrectResponseType
      });
    } else {
      /* Let the main error handler deal with this */
      next();
    }
  }
];

// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

exports.decision = [ensureLoggedIn, server.decision()];

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

exports.token = [
  function(req, res, next) {
    stats.event('oauth.exchange');
    next();
  },
  passport.authenticate([/*'basic', */ 'oauth2-client-password'], {
    session: false,
    failWithError: true
  }),
  server.token(),
  server.errorHandler()
];
