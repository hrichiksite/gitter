'use strict';

/* Would be nice if we could just fold this into prerender-helper, but at the moment
 * async helpers for express-hbs only take a single parameter and we can't use them
 * Also, this way is much faster, so it's not so bad
 */

var _ = require('lodash');
var compileTemplate = require('./compile-web-template');
var timeFormat = require('gitter-web-shared/time/time-format');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
// var fullTimeFormat = require('gitter-web-shared/time/full-time-format');

var chatWrapper = compileTemplate.compileString(
  '<div class="chat-item model-id-{{id}} {{burstClass}} {{unreadClass}} {{deletedClass}} {{threadedConversationClass}}" role="listitem">{{{inner}}}</div>'
);

var chatItemTemplate = compileTemplate('/js/views/chat/tmpl/chatItemView.hbs');
var statusItemTemplate = compileTemplate('/js/views/chat/tmpl/statusItemView.hbs');

function getFormattedTime(model, lang, tz, tzOffset, isArchive) {
  /* In the chat environment, we don't want to prerender the time
   * when we don't know what timezone the user is in: we'll just wait
   * until the javascript kicks in and render it then.
   *
   * However, in the archive environment, we don't want to do this
   * for SEO and also because the chats are not re-rendered, so no
   * times will be shown.
   */
  if (!tz && !isArchive) {
    return '';
  }

  return timeFormat(model.sent, { lang: lang, tzOffset: tzOffset, forceUtc: isArchive });
}

module.exports = exports = function(model, params) {
  var deletedClass;

  var root = params.data.root;

  const isArchive = params.hash.type === 'archive';

  var troupeName = root.troupeName;
  var lang = root.lang;
  var locale = root.locale;
  var tz = root.tz;
  var tzOffset = root.tzOffset;

  var text = model.text || '';
  var html = model.html || model.text || '';

  // Handle empty messages as deleted
  if (html.length === 0) {
    html = '<i>This message was deleted</i>';
    deletedClass = 'deleted';
  }

  const sentTimeFormatted = getFormattedTime(model, lang, tz, tzOffset, isArchive);
  // TODO: add sentTimeFull

  var m = _.extend({}, model, {
    displayName: model.fromUser && model.fromUser.displayName,
    username: model.fromUser && model.fromUser.username,
    sentTimeFormatted: sentTimeFormatted,
    text: text,
    html: html,
    lang: lang,
    locale: locale,
    tz: tz,
    tzOffset: tzOffset,
    permalinkUrl: generatePermalink(troupeName, model.id, model.sent, isArchive),
    showItemActions: !isArchive
  });

  var result;

  if (m.status) {
    result = statusItemTemplate(m);
  } else {
    result = chatItemTemplate(m);
  }

  var unreadClass = model.unread ? 'unread' : 'read';
  var burstClass = model.burstStart ? 'burstStart' : 'burstContinued';
  const threadedConversationClass = model.parentId ? 'threaded-conversation-chat-item' : '';

  return chatWrapper({
    id: model.id,
    burstClass,
    unreadClass,
    deletedClass,
    threadedConversationClass,
    locale: locale,
    inner: result
  });
};
