'use strict';

const _ = require('lodash');
const urlJoin = require('url-join');
const asyncHandler = require('express-async-handler');

const clientEnv = require('gitter-client-env');
const contextGenerator = require('../../web/context-generator');
const mixinHbsDataForVueLeftMenu = require('./vue/mixin-vue-left-menu-data');
const exploreService = require('../../services/explore-service');
const suggestionsService = require('../../services/suggestions-service');
const exploreTagUtils = require('../../utils/explore-tag-utils');
const generateExploreSnapshot = require('../snapshots/explore-snapshot');
const generateUserThemeSnapshot = require('../snapshots/user-theme-snapshot');
const fonts = require('../../web/fonts');
const isMobile = require('../../web/is-phone');

function getExploreBaseUrl(req) {
  return urlJoin(req.baseUrl, req.path).replace(/\/(|tags.*)$/, '');
}

function processTagInput(req) {
  let input = req.params.tags;
  if (!input) {
    const urlTagStringMatches = req.path.match(/\/tags\/(.*)/);
    input = urlTagStringMatches && urlTagStringMatches[1];
  }

  input = input || exploreTagUtils.tagConstants.SUGGESTED_TAG_LABEL.toLowerCase();
  const selectedTagsInput = input
    .split(',')
    .filter(function(inputItem) {
      return inputItem.trim().length > 0;
    })
    .map(function(tag) {
      return tag.toLowerCase();
    });

  return selectedTagsInput;
}

const FAUX_TAG_MAP = {};
FAUX_TAG_MAP[exploreTagUtils.tagConstants.SUGGESTED_TAG_LABEL] = [
  exploreTagUtils.tagConstants.SUGGESTED_BACKEND_TAG
];
_.extend(FAUX_TAG_MAP, {
  Frontend: [],
  Mobile: ['curated:ios', 'curated:android', 'objective-c'],
  iOS: [],
  Android: [],
  'Data Science': [],
  Devops: ['devops'],
  'Game Dev': ['game'],
  Frameworks: ['frameworks'],
  JavaScript: ['javascript'],
  Scala: ['scala'],
  Ruby: ['ruby'],
  CSS: ['css'],
  'Material Design': [],
  React: ['react'],
  Java: ['java'],
  PHP: ['php'],
  Swift: ['swift'],
  Go: ['go'],
  Node: ['node', 'nodejs'],
  Meteor: ['meteor'],
  Django: ['django'],
  '.NET': ['dotnet'],
  Angular: ['angular'],
  Rails: ['rails'],
  Haskell: ['haskell']
});

async function renderExplorePage(req, res) {
  const troupeContext = await contextGenerator.generateBasicContext(req);
  const user = troupeContext.user;
  const isLoggedIn = !!user;

  // Copy so we can modify later on
  const fauxTagMap = _.extend({}, FAUX_TAG_MAP);

  const selectedTagsInput = processTagInput(req)
    // We only take one selected tag
    .slice(0, 1);

  // We only generate the tag map here to grab the list of selected tags so
  // we can populate our rooms from the explore service
  const tagMap = exploreTagUtils.generateTagMap(fauxTagMap);
  const selectedTagMap = exploreTagUtils.getSelectedEntriesInTagMap(tagMap, selectedTagsInput);

  let hasSuggestedTag = false;

  // Mush into an array of selected tags
  const selectedBackendTags = Object.keys(selectedTagMap).reduce(function(prev, key) {
    // Check for the selected tag for easy reference later
    selectedTagMap[key].tags.forEach(function(tag) {
      if (tag === exploreTagUtils.tagConstants.SUGGESTED_BACKEND_TAG) {
        hasSuggestedTag = true;
      }
    });

    return prev.concat(selectedTagMap[key].tags);
  }, []);

  let userSuggestions;
  if (hasSuggestedTag && isLoggedIn) {
    const suggestedRooms = await suggestionsService.findSuggestionsForUserId(user.id);

    if (suggestedRooms && suggestedRooms.length) {
      userSuggestions = suggestedRooms.map(function(room) {
        room.tags = room.tags || [];
        room.tags.push(exploreTagUtils.tagConstants.SUGGESTED_BACKEND_TAG);
        return room;
      });
    }
  }

  let rooms;
  if (userSuggestions && userSuggestions.length) {
    rooms = userSuggestions;
  } else {
    rooms = await exploreService.fetchByTags(selectedBackendTags);
  }

  const snapshots = await generateExploreSnapshot({
    isLoggedIn: isLoggedIn,
    fauxTagMap: fauxTagMap,
    selectedTags: selectedTagsInput,
    rooms: rooms
  });

  //Not 100% sure this is the best thing to do here
  //but I dont really want to refactor this whole thing
  const userThemeSnapshot = await generateUserThemeSnapshot(req);
  // Anyone know why we're putting this on the
  // context? Probably not.
  troupeContext.snapshots = snapshots;

  return res.render(
    'explore',
    await mixinHbsDataForVueLeftMenu(
      req,
      _.extend({}, snapshots, {
        bootScriptName: 'explore',
        cssFileName: 'styles/explore.css',
        hasDarkTheme: userThemeSnapshot.theme === 'gitter-dark',
        isMobile: isMobile(req),
        exploreBaseUrl: getExploreBaseUrl(req),
        troupeContext: troupeContext,
        isLoggedIn: isLoggedIn,
        createRoomUrl: urlJoin(clientEnv.basePath, '#createroom'),
        fonts: fonts.getFonts(),
        hasCachedFonts: fonts.hasCachedFonts(req.cookies)
      })
    )
  );
}

module.exports = {
  renderExplorePage: asyncHandler(renderExplorePage)
};
