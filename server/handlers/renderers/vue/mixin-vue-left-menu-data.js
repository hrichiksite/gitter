'use strict';
const Promise = require('bluebird');
const vueRenderToString = require('../vue-ssr-renderer');
const restful = require('../../../services/restful');
const restSerializer = require('../../../serializers/rest-serializer');
const contextGenerator = require('../../../web/context-generator');
const generateUserThemeSnapshot = require('../../snapshots/user-theme-snapshot');

async function mixinHbsDataForVueLeftMenu(req, existingData) {
  const user = req.user;
  const userId = user && user.id;

  const uriContext = req.uriContext;
  const currentRoom = uriContext && uriContext.troupe;

  const [
    serializedUser,
    serializedCurrentRoom,
    serializedGroups,
    serializedRooms,
    baseTroupeContext,
    userThemeSnapshot
  ] = await Promise.all([
    restSerializer.serializeObject(
      user,
      new restSerializer.UserStrategy({ includeProviders: true })
    ),
    restSerializer.serializeObject(currentRoom, new restSerializer.TroupeStrategy()),
    restful.serializeGroupsForUserId(userId),
    restful.serializeTroupesForUser(userId),
    contextGenerator.generateTroupeContext(req),
    generateUserThemeSnapshot(req)
  ]);

  const serializedRoomMap = {};

  // the roomMap will contain the current room
  if (serializedCurrentRoom) {
    serializedRoomMap[serializedCurrentRoom.id] = serializedCurrentRoom;
  }

  serializedRooms.forEach(serializedRoom => {
    serializedRoomMap[serializedRoom.id] = serializedRoom;
  });

  const isMobile = req.isPhone;

  const storeData = {
    isMobile,
    isLoggedIn: !!serializedUser,
    user: serializedUser,
    darkTheme: userThemeSnapshot.theme === 'gitter-dark',

    roomMap: serializedRoomMap,
    displayedRoomId: serializedCurrentRoom && serializedCurrentRoom.id,

    leftMenuPinnedState: !isMobile,
    leftMenuExpandedState: false
  };

  const vueLeftMenuHtmlOutput = await vueRenderToString({
    moduleToRender: 'left-menu',
    storeData
  });

  const threadMessageFeedHtmlOutput = await vueRenderToString({
    moduleToRender: 'thread-message-feed',
    storeData
  });

  return {
    ...existingData,

    layout: 'chat-layout',
    isMobile,
    leftMenuHtml: vueLeftMenuHtmlOutput,
    threadMessageFeedHtml: threadMessageFeedHtmlOutput,

    troupeContext: {
      ...baseTroupeContext,
      ...(existingData.troupeContext || {}),
      snapshots: {
        ...((existingData.troupeContext || {}).snapshots || {}),
        allRooms: serializedRooms,
        groups: serializedGroups
      }
    }
  };
}

module.exports = mixinHbsDataForVueLeftMenu;
