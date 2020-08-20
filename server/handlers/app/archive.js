/* eslint complexity: ["error", 20] */
'use strict';

var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;

var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');
var StatusError = require('statuserror');
const asyncHandler = require('express-async-handler');

var chatService = require('gitter-web-chats');
var chatHeapmapAggregator = require('gitter-web-elasticsearch/lib/chat-heatmap-aggregator');
var restSerializer = require('../../serializers/rest-serializer');
var contextGenerator = require('../../web/context-generator');
var burstCalculator = require('../../utils/burst-calculator');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
const urlJoin = require('url-join');
const clientEnv = require('gitter-client-env');
var debug = require('debug')('gitter:app:app-archive');
var fonts = require('../../web/fonts');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');

var uriContextResolverMiddleware = require('../uri-context/uri-context-resolver-middleware');
var redirectErrorMiddleware = require('../uri-context/redirect-error-middleware');
var timezoneMiddleware = require('../../web/middlewares/timezone');
var preventClickjackingMiddleware = require('../../web/middlewares/prevent-clickjacking');

var ONE_DAY_SECONDS = 60 * 60 * 24; // 1 day
var ONE_DAY_MILLISECONDS = ONE_DAY_SECONDS * 1000;
var ONE_YEAR_SECONDS = 60 * 60 * 24 * 365; // 1 year
var ONE_YEAR_MILLISECONDS = ONE_YEAR_SECONDS * 1000;

var validateRoomForReadOnlyAccess = Promise.method(function(user, policy) {
  return policy.canRead().then(function(access) {
    if (access) return;
    if (!user) throw new StatusError(401); // Very suspect...
    throw new StatusError(404);
  });
});

function generateChatTree(chatActivity) {
  // group things in nested maps
  var yearMap = {};
  _.each(chatActivity, function(count, unixTime) {
    var date = moment(unixTime, 'X');
    var year = date.year();
    var month = date.format('MM'); // 01-12
    var day = date.format('DD'); // 01-31
    if (!yearMap[year]) {
      yearMap[year] = {};
    }
    if (!yearMap[year][month]) {
      yearMap[year][month] = {};
    }
    yearMap[year][month][day] = count;
  });
  //console.log(JSON.stringify(yearMap, null, 2));

  // change the nested maps into sorted nested arrays of objects
  // O(𝑛³) code uphead. Good times.
  var yearArray = [];
  _.each(yearMap, function(monthMap, year) {
    var monthArray = [];
    _.each(monthMap, function(dayMap, month) {
      var dayArray = [];
      _.each(dayMap, function(count, day) {
        dayArray.push({ day: day, count: count });
      });
      dayArray = _.sortBy(dayArray, 'day'); // not reversed
      var monthName = moment.months()[parseInt(month, 10) - 1];
      monthArray.push({ month: month, monthName: monthName, days: dayArray }); // monthName?
    });
    monthArray = _.sortBy(monthArray, 'month').reverse();
    yearArray.push({ year: year, months: monthArray });
  });
  yearArray = _.sortBy(yearArray, 'year').reverse();
  //console.log(JSON.stringify(yearArray, null, 2));

  return yearArray;
}

exports.datesList = [
  identifyRoute('app-archive-main'),
  preventClickjackingMiddleware,
  uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    // This is where we want non-logged-in users to return
    if (!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    var roomUrl = '/api/v1/rooms/' + troupe.id;

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        return [policy.canAdmin(), contextGenerator.generateTroupeContext(req)];
      })
      .spread(function(adminAccess, troupeContext) {
        var templateContext = {
          layout: 'archive',
          user: user,
          archives: true,
          bootScriptName: 'router-archive-home',
          cssFileName: 'styles/router-archive-home.css',
          troupeName: req.uriContext.uri,
          isHomePage: true,
          noindex: troupe.noindex,
          roomUrl: roomUrl,
          accessToken: req.accessToken,
          public: securityDescriptorUtils.isPublic(troupe),
          headerView: getHeaderViewOptions(troupeContext.troupe),
          fonts: fonts.getFonts(),
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          isAdmin: adminAccess, // Used by archive.hbs
          troupeContext: troupeContext
        };

        res.render('archive-home-template', templateContext);
      })
      .catch(next);
  },
  redirectErrorMiddleware
];

exports.linksList = [
  identifyRoute('app-archive-links'),
  preventClickjackingMiddleware,
  uriContextResolverMiddleware,
  function(req, res, next) {
    var user = req.user;
    var troupe = req.uriContext.troupe;
    var policy = req.uriContext.policy;

    // This is where we want non-logged-in users to return
    if (!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    var roomUrl = '/api/v1/rooms/' + troupe.id;
    var isPrivate = !securityDescriptorUtils.isPublic(troupe);

    return validateRoomForReadOnlyAccess(user, policy)
      .then(function() {
        return [
          policy.canAdmin(),
          chatHeapmapAggregator.getHeatmapForRoom(troupe.id),
          contextGenerator.generateTroupeContext(req)
        ];
      })
      .spread(function(adminAccess, chatActivity, troupeContext) {
        // no start, no end, no timezone for now
        var templateContext = {
          layout: 'archive',
          user: user,
          archives: true,
          bootScriptName: 'router-archive-links',
          cssFileName: 'styles/router-archive-links.css',
          troupeName: req.uriContext.uri,
          isHomePage: true,
          noindex: troupe.noindex,
          roomUrl: roomUrl,
          accessToken: req.accessToken,
          public: securityDescriptorUtils.isPublic(troupe),
          headerView: getHeaderViewOptions(troupeContext.troupe),
          isPrivate: isPrivate,
          fonts: fonts.getFonts(),
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          troupeContext: troupeContext,
          isAdmin: adminAccess,
          chatTree: generateChatTree(chatActivity)
        };

        res.setHeader('Cache-Control', 'public, max-age=' + ONE_DAY_SECONDS);
        res.setHeader('Expires', new Date(Date.now() + ONE_DAY_MILLISECONDS).toUTCString());
        res.render('archive-links-template', templateContext);
      })
      .catch(next);
  },
  redirectErrorMiddleware
];

exports.chatArchive = [
  identifyRoute('app-archive-date'),
  uriContextResolverMiddleware,
  preventClickjackingMiddleware,
  timezoneMiddleware,
  asyncHandler(async (req, res /*, next*/) => {
    const user = req.user;
    const troupe = req.uriContext.troupe;
    const policy = req.uriContext.policy;

    await validateRoomForReadOnlyAccess(user, policy);
    const troupeId = troupe.id;

    // This is where we want non-logged-in users to return
    if (!user && req.session) {
      req.session.returnTo = '/' + troupe.uri;
    }

    const yyyy = parseInt(req.params.yyyy, 10);
    const mm = parseInt(req.params.mm, 10);
    const dd = parseInt(req.params.dd, 10);

    const startDateUTC = moment({ year: yyyy, month: mm - 1, day: dd });

    const nextDateUTC = moment(startDateUTC).add(1, 'days');
    const previousDateUTC = moment(startDateUTC).subtract(1, 'days');

    const aroundId = fixMongoIdQueryParam(req.query.at);
    const chatMessage = await chatService.findById(aroundId);
    if (chatMessage) {
      const sentDateTime = moment(chatMessage.sent);
      const permalink = generatePermalink(troupe.uri, aroundId, sentDateTime, true);
      if (urlJoin(clientEnv['basePath'], req.url) !== permalink) {
        res.redirect(permalink);
        return;
      }
    }

    debug(
      'Archive searching for messages in troupe %s in date range %s <-> %s',
      troupeId,
      startDateUTC,
      nextDateUTC
    );
    const chatMessages = await chatService.findChatMessagesForTroupeForDateRange(
      troupeId,
      startDateUTC,
      nextDateUTC
    );
    // If `currentUserId` isn't specified, all chats are `unread: false` as expected
    const strategy = new restSerializer.ChatStrategy({
      troupeId: troupeId
    });

    const [troupeContext, serialized] = await Promise.all([
      contextGenerator.generateTroupeContext(req),
      restSerializer.serialize(chatMessages, strategy)
    ]);
    troupeContext.archive = {
      archiveDate: startDateUTC,
      nextDate: nextDateUTC,
      previousDate: previousDateUTC,
      messages: serialized
    };
    troupeContext.permalinkChatId = aroundId;

    let language = req.headers['accept-language'];
    if (language) {
      language = language.split(';')[0].split(',');
    } else {
      language = 'en-uk';
    }

    const uri = req.uriContext.uri;

    const startDateLocale = moment(startDateUTC).locale(language);

    const ordinalDate = startDateLocale.format('Do');
    const numericDate = startDateLocale.format('D');

    let ordinalPart;
    if (ordinalDate.indexOf('' + numericDate) === 0) {
      ordinalPart = ordinalDate.substring(('' + numericDate).length);
    } else {
      ordinalPart = '';
    }

    const today = moment().endOf('day');
    const dayNameFormatted = numericDate;
    const dayOrdinalFormatted = ordinalPart;
    const monthYearFormatted = startDateLocale.format('MMM YYYY');

    let previousDateLink;
    if (previousDateUTC.isAfter(moment([2013, 11, 1]))) {
      previousDateLink = '/' + uri + '/archives/' + previousDateUTC.format('YYYY/MM/DD');
    }

    let nextDateLink;
    if (nextDateUTC.endOf('day').isSameOrBefore(today)) {
      nextDateLink = '/' + uri + '/archives/' + nextDateUTC.format('YYYY/MM/DD');
    }

    const roomUrl = '/api/v1/rooms/' + troupe.id;

    const isPrivate = !securityDescriptorUtils.isPublic(troupe);

    /*
    If the we are showing archive for a finished day, we'll include caching headers
    */
    if (today >= nextDateUTC) {
      res.setHeader('Cache-Control', 'public, max-age=' + ONE_YEAR_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + ONE_YEAR_MILLISECONDS).toUTCString());
    }

    return res.render('chat-archive-template', {
      layout: 'archive',
      archives: true,
      archiveChats: true,
      bootScriptName: 'router-archive-chat',
      cssFileName: 'styles/router-archive-chat.css',
      githubLink: '/' + req.uriContext.uri,
      user: user,
      troupeContext: troupeContext,
      troupeName: req.uriContext.uri,
      chats: burstCalculator(serialized),
      noindex: troupe.noindex,
      roomUrl: roomUrl,
      accessToken: req.accessToken,
      headerView: getHeaderViewOptions(troupeContext.troupe),
      isPrivate: isPrivate,

      /* For prerendered archive-navigation-view */
      dayName: dayNameFormatted,
      dayOrdinal: dayOrdinalFormatted,
      previousDateLink: previousDateLink,
      nextDateLink: nextDateLink,
      monthYearFormatted: monthYearFormatted,

      fonts: fonts.getFonts(),
      hasCachedFonts: fonts.hasCachedFonts(req.cookies)
    });
  }),
  redirectErrorMiddleware
];
