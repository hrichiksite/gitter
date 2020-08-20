'use strict';

/**

Examples of notifications:

------------------------------------------
Souper Troupers
Mike: Yo
Andrew: Yo how are you...
Andrew uploaded account.xls
------------------------------------------
Souper Troupers
Mike: Yo
------------------------------------------
Souper Troupers
Andrew uploaded account.xls
Andrew uploaded account2.xls
------------------------------------------
Mike Bartlett:
Mike: hey how are you?
Mike: blah?
Mike: ?
*/

var MAX_NOTIFICATION_TEXT = 1024;
var LAST_LINE_MIN_LENGTH = 30;

var ent = require('ent');

function truncate(line, maxLineLength) {
  if (line.length > maxLineLength) {
    line = line.substring(0, maxLineLength - 1).trim() + '…';
  }
  return line;
}

function getHeaderLine(troupe) {
  return troupe.name || troupe.uri;
}

function getText(username, chat) {
  if (!chat.text) return;
  var encodedText = ent.decode(chat.text); // Do we need to do this?
  if (username) {
    return username + ': ' + encodedText;
  } else {
    return encodedText;
  }
}

function getShortFromUserName(user) {
  if (!user) return;

  var displayName = user.displayName;
  if (!displayName) return '';

  // this is dodgy, btw. See #373
  //return displayName && displayName.split(/\s/,1)[0];
  return displayName.trim();
}

// eslint-disable-next-line complexity
function summarizeChatsInRoom(troupe, chats, options) {
  var appendText = options && options.appendText;
  var maxMessageLength = (options && options.maxMessageLength) || MAX_NOTIFICATION_TEXT;
  var maxLength = maxMessageLength - (appendText ? appendText.length : 0);

  //
  // Generate notification text
  //
  var notificationText = getHeaderLine(troupe) || '';
  var lastUsername = null;
  for (
    var i = 0;
    i < chats.length && notificationText.length <= maxLength - LAST_LINE_MIN_LENGTH;
    i++
  ) {
    var chat = chats[i];

    // Only group chats prefix the username
    var username = troupe.oneToOne ? null : getShortFromUserName(chat.fromUser);
    if (username === lastUsername) {
      username = null; // Don't prefix the username if it's the same as the last message
    } else {
      lastUsername = username;
    }

    var text = getText(username, chat);
    if (!text) continue;

    if (notificationText.length + text.length > maxLength) {
      text = truncate(text, maxLength - notificationText.length - 3 /* newline etc */);
      // We add extra spaces so that when they're removed on an iphone the notificationText still makes sense
    }

    notificationText = notificationText ? notificationText + '  \n' + text : text;
  }

  if (appendText) {
    notificationText += appendText;
  }

  return notificationText;
}

module.exports = summarizeChatsInRoom;
