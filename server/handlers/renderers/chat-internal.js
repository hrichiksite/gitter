'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var _ = require('lodash');
const asyncHandler = require('express-async-handler');

const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var contextGenerator = require('../../web/context-generator');
var restful = require('../../services/restful');
var burstCalculator = require('../../utils/burst-calculator');
const userSort = require('gitter-web-shared/sorting/user-sort');
var getSubResources = require('./sub-resources');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var fonts = require('../../web/fonts');
var generateRightToolbarSnapshot = require('../snapshots/right-toolbar-snapshot');
var generateUserThemeSnapshot = require('../snapshots/user-theme-snapshot');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');
const mixinHbsDataForVueLeftMenu = require('./vue/mixin-vue-left-menu-data');
const getChatSnapshotOptions = require('./chat/chat-snapshot-options');
const socialMetadataGenerator = require('../social-metadata-generator');

const ROSTER_SIZE = 25;

const getPermalinkMessageId = request => fixMongoIdQueryParam(request.query.at);

function getSocialMetaDataForRoom(room, permalinkChatSerialized) {
  let socialMetadata;
  if (room && permalinkChatSerialized) {
    socialMetadata = socialMetadataGenerator.getMetadataForChatPermalink({
      room,
      chat: permalinkChatSerialized
    });
  } else if (room) {
    socialMetadata = socialMetadataGenerator.getMetadata({ room });
  }

  return socialMetadata;
}

// eslint-disable-next-line max-statements, complexity
async function renderChat(req, res, next, options) {
  const { uriContext, embedded } = options;

  var troupe = uriContext.troupe;
  var user = req.user;
  var userId = user && user.id;

  const userSerializerOptions = {
    lean: true,
    limit: ROSTER_SIZE
  };
  const chatSnapshotOptions = await getChatSnapshotOptions(userId, troupe.id, req);

  const permalinkChatId = getPermalinkMessageId(req);

  const [
    troupeContext,
    chats,
    activityEvents,
    users,
    rightToolbarSnapshot,
    userThemeSnapshot
  ] = await Promise.all([
    contextGenerator.generateTroupeContext(req, {
      snapshots: { chat: chatSnapshotOptions },
      permalinkChatId,
      // Are we using /~embed ?
      embedded
    }),
    restful.serializeChatsForTroupe(troupe.id, userId, chatSnapshotOptions),
    options.fetchEvents === false ? null : restful.serializeEventsForTroupe(troupe.id, userId),
    options.fetchUsers === false
      ? null
      : restful.serializeUsersForTroupe(troupe.id, userId, userSerializerOptions),
    generateRightToolbarSnapshot(req),
    generateUserThemeSnapshot(req)
  ]);

  var initialChat = _.find(chats, function(chat) {
    return chat.initial;
  });
  var initialBottom = !initialChat;

  const permalinkChatSerialized = _.find(chats, function(chat) {
    return mongoUtils.objectIDsEqual(chat.id, permalinkChatId);
  });

  var classNames = options.classNames || [];
  var isStaff = req.user && req.user.staff;

  troupeContext.snapshots = {
    rightToolbar: rightToolbarSnapshot
  };

  if (!user) classNames.push('logged-out');

  var integrationsUrl;

  if (troupeContext && troupeContext.isNativeDesktopApp) {
    integrationsUrl = nconf.get('web:basepath') + '/' + troupeContext.troupe.uri + '#integrations';
  } else {
    integrationsUrl = '#integrations';
  }

  const script = options.script;
  var cssFileName = options.stylesheet
    ? 'styles/' + options.stylesheet + '.css'
    : 'styles/' + script + '.css'; // css filename matches bootscript

  var chatsWithBurst = burstCalculator(chats);
  if (options.filterChats) {
    chatsWithBurst = options.filterChats(chatsWithBurst);
  }

  /* This is less than ideal way of checking if the user is the admin */
  var isAdmin =
    troupeContext.troupe &&
    troupeContext.troupe.permissions &&
    troupeContext.troupe.permissions.admin;

  var isRightToolbarPinned = rightToolbarSnapshot && rightToolbarSnapshot.isPinned;
  if (isRightToolbarPinned === undefined) {
    isRightToolbarPinned = true;
  }

  const socialMetadata = getSocialMetaDataForRoom(troupeContext.troupe, permalinkChatSerialized);

  var renderOptions = await mixinHbsDataForVueLeftMenu(
    req,
    _.extend(
      {
        embedded: options.embedded || false,
        hasDarkTheme: userThemeSnapshot.theme === 'gitter-dark',
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        socialMetadata,
        isRepo: troupe.sd.type === 'GH_REPO', // Used by chat_toolbar patial
        bootScriptName: script,
        cssFileName: cssFileName,
        troupeName: uriContext.uri,
        oneToOne: troupe.oneToOne, // Used by the old left menu
        user: user,
        troupeContext: troupeContext,
        initialBottom: initialBottom,
        chats: chatsWithBurst,
        classNames: classNames.join(' '),
        subresources: getSubResources(script),
        activityEvents: activityEvents,
        users: users && users.sort(userSort),
        userCount: troupe.userCount,
        hasHiddenMembers: troupe.userCount > 25,
        integrationsUrl: integrationsUrl,
        isMobile: options.isMobile,
        roomMember: uriContext.roomMember,
        isRightToolbarPinned: isRightToolbarPinned,

        //Feature Switch Left Menu
        troupeTopic: troupeContext.troupe.topic,
        premium: troupeContext.troupe.premium,
        troupeFavourite: troupeContext.troupe.favourite,
        headerView: getHeaderViewOptions(troupeContext.troupe),
        canChangeGroupAvatar: !!troupe.groupId && (isStaff || isAdmin),
        isAdmin: isAdmin,
        isNativeDesktopApp: troupeContext.isNativeDesktopApp
      },
      options.extras
    )
  );

  res.render(options.template, renderOptions);
}

module.exports = asyncHandler(renderChat);
