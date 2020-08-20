'use strict';

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger;

var passport = require('passport');
var expressHbs = require('express-hbs');
var rememberMe = require('./middlewares/rememberme-middleware');
var resolveStatic = require('./resolve-static');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var session = require('express-session');
var appTag = require('./app-tag');

const IS_DEV = process.env.NODE_ENV === 'dev';
/**
 * Only serve static assets in dev mode,
 * when we don't have a CDN
 */
function shouldServeStaticAssets() {
  if (process.env.SERVE_STATIC_ASSETS) return true;
  if (!IS_DEV) return false;
  if (config.get('cdn:use')) return false;

  return true;
}

// Naughty naughty naught, install some extra methods on the express prototype
require('./http');

function getSessionStore() {
  var RedisStore = require('connect-redis')(session);

  var redisClient = env.ioredis.createClient(config.get('redis_nopersist'));

  return new RedisStore({
    client: redisClient,
    ttl: config.get('web:sessionTTL'),
    logErrors: function(err) {
      logger.error('connect-redis reported a redis error: ' + err, { exception: err });
    }
  });
}

function configureLocals(app) {
  var locals = app.locals;

  locals.googleTrackingId = config.get('stats:ga:key');
  locals.googleTrackingDomain = config.get('stats:ga:domain');
  locals.liveReload = config.get('web:liveReload');
  locals.stagingText = appTag.text;
  locals.stagingLink = appTag.link;

  locals.headlineGitterUsers = config.get('headlineNumbers:gitterUsers');
  locals.headlineGitterRooms = config.get('headlineNumbers:gitterRooms');
  locals.headlineGitterGroups = config.get('headlineNumbers:gitterGroups');
  locals.headlineGitterCountries = config.get('headlineNumbers:gitterCountries');

  locals.dnsPrefetch = (config.get('cdn:hosts') || []).concat([config.get('ws:hostname')]);
}

/**
 * Configure express app with settings and middlewares needed by both API and WEB (excluding passport and user related logic).
 */
function installBase(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(env.middlewares.accessLogger);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(methodOverride());

  app.use(require('./middlewares/pending-request'));
  app.use(require('./middlewares/ie6-post-caching'));
  app.use(require('./middlewares/i18n'));
}

// Middleware wrapped in `skipForApi` is not used on API requests
// This is only useful in development environment. In production we initialize API
// route differently and the `/api/*` requests don't hit the web handler at all
// (https://gitlab.com/gitlab-org/gitter/webapp/-/merge_requests/1771#note_288137539)
const skipForApi = handler => (req, res, next) => {
  if (req.originalUrl.indexOf('/api/') === 0) {
    next();
  } else {
    handler(req, res, next);
  }
};

module.exports = {
  /**
   * Configure express for the full web application.
   */
  installFull: function(app) {
    installBase(app);

    require('./register-helpers')(expressHbs);

    configureLocals(app);

    app.engine(
      'hbs',
      expressHbs.express3({
        partialsDir: resolveStatic('/templates/partials'),
        onCompile: function(exhbs, source) {
          return exhbs.handlebars.compile(source, { preventIndent: true });
        },
        layoutsDir: resolveStatic('/layouts'),
        contentHelperName: 'content'
      })
    );
    app.set('view engine', 'hbs');
    app.set('views', resolveStatic('/templates'));

    if (config.get('express:viewCache')) {
      app.enable('view cache');
    }

    if (shouldServeStaticAssets()) {
      /* Serve static content */
      require('./express-static').install(app);
    }

    app.use(cookieParser());

    let sessionSecret = config.get('web:sessionSecret');
    if (!sessionSecret && IS_DEV) {
      logger.warn(
        'Missing "web__sessionSecret" environment variable. Using default value for local development.'
      );
      sessionSecret = 'test-secret';
    }

    app.use(
      session({
        secret: sessionSecret,
        key: config.get('web:cookiePrefix') + 'session',
        store: getSessionStore(),
        cookie: {
          path: '/',
          httpOnly: true,
          maxAge: 14400000,
          domain: config.get('web:cookieDomain'),
          secure: config.get('web:secureCookies'),
          sameSite: config.get('web:secureCookies') ? 'none' : 'lax'
        },
        resave: true,
        saveUninitialized: true // Passport will force a save anyway
      })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    //anonymous tokens can be still valid for accessing API
    app.use(skipForApi(require('./middlewares/authenticate-bearer')));
    app.use(rememberMe.rememberMeMiddleware);
    app.use(require('./middlewares/rate-limiter'));
    app.use(require('./middlewares/record-client-usage-stats'));

    app.use(skipForApi(require('./middlewares/configure-csrf')));
    app.use(skipForApi(require('./middlewares/enforce-csrf')));

    // NOTE: it might be better to just drop this middleware entirely or at
    // least substantially change the behavior, because not having github
    // tokens is now fine. Maybe it is also fine not having any tokens at all?
    app.use(require('./middlewares/tokenless-user'));
  },

  installApi: function(app) {
    installBase(app);

    app.use(passport.initialize());

    app.use(require('./middlewares/rate-limiter'));
    app.use(require('./middlewares/record-client-usage-stats'));
  },

  installSocket: function(app) {
    app.disable('x-powered-by');
    app.set('trust proxy', true);
    app.use(env.middlewares.accessLogger);
    app.use(require('./middlewares/token-error-handler'));
    app.use(env.middlewares.errorHandler);
  }
};
