'use strict';

var StatusError = require('statuserror');
var assert = require('assert');

/* eslint-disable no-multi-spaces */
/* Note, these can not change! */
/* -----8<---- */
var FLAG_POS_NOTIFY_UNREAD = 0; // Track unread counts
var FLAG_POS_NOTIFY_ACTIVITY = 1; // Send activity indicator
var FLAG_POS_NOTIFY_MENTION = 2; // Notify on mentions
var FLAG_POS_NOTIFY_ANNOUNCEMENT = 3; // Notify on announcements
var FLAG_POS_NOTIFY_DEFAULT = 4; // Default setting?
var FLAG_POS_NOTIFY_DESKTOP = 5; // Send desktop notifications
var FLAG_POS_NOTIFY_MOBILE = 6; // Send mobile notifications

/* -----8<---- */
var BITMASK_INVERT = 0x0fffffff;

var BITMASK_NOTIFY_UNREAD = 1 << FLAG_POS_NOTIFY_UNREAD;
var BITMASK_NO_NOTIFY_UNREAD = BITMASK_INVERT & ~BITMASK_NOTIFY_UNREAD;
var BITMASK_NOTIFY_ACTIVITY = 1 << FLAG_POS_NOTIFY_ACTIVITY;
var BITMASK_NO_NOTIFY_ACTIVITY = BITMASK_INVERT & ~BITMASK_NOTIFY_ACTIVITY;
var BITMASK_NOTIFY_MENTION = 1 << FLAG_POS_NOTIFY_MENTION;
var BITMASK_NOTIFY_ANNOUNCEMENT = 1 << FLAG_POS_NOTIFY_ANNOUNCEMENT;
var BITMASK_NOTIFY_DEFAULT = 1 << FLAG_POS_NOTIFY_DEFAULT;
var BITMASK_NO_NOTIFY_DEFAULT = BITMASK_INVERT & ~BITMASK_NOTIFY_DEFAULT;
var BITMASK_NOTIFY_DESKTOP = 1 << FLAG_POS_NOTIFY_DESKTOP;
var BITMASK_NO_NOTIFY_DESKTOP = BITMASK_INVERT & ~BITMASK_NOTIFY_DESKTOP;
var BITMASK_NOTIFY_MOBILE = 1 << FLAG_POS_NOTIFY_MOBILE;
var BITMASK_NO_NOTIFY_MOBILE = BITMASK_INVERT & ~BITMASK_NOTIFY_MOBILE;

var BITMASK_MODE =
  BITMASK_NOTIFY_UNREAD |
  BITMASK_NOTIFY_ACTIVITY |
  BITMASK_NOTIFY_MENTION |
  BITMASK_NOTIFY_ANNOUNCEMENT |
  BITMASK_NOTIFY_DESKTOP |
  BITMASK_NOTIFY_MOBILE;

/** Like BITMASK_MODE but ignores DESKTOP & MOBILE bits */
var BITMASK_MODE_LEGACY =
  BITMASK_NOTIFY_UNREAD |
  BITMASK_NOTIFY_ACTIVITY |
  BITMASK_NOTIFY_MENTION |
  BITMASK_NOTIFY_ANNOUNCEMENT;

var BITMASK_MODE_DEFAULT = BITMASK_MODE | BITMASK_NOTIFY_DEFAULT;

var BITMASK_INVERT_MODE_DEFAULT = BITMASK_INVERT & ~BITMASK_MODE_DEFAULT;

var MODES = {
  /* Mode: all: unread + no activity + mentions + announcements */
  all:
    BITMASK_NOTIFY_UNREAD |
    BITMASK_NOTIFY_MENTION |
    BITMASK_NOTIFY_ANNOUNCEMENT |
    BITMASK_NOTIFY_DESKTOP |
    BITMASK_NOTIFY_MOBILE,

  /* Mode: announcement: unread + no activity + mentions + announcements */
  announcement: BITMASK_NOTIFY_UNREAD | BITMASK_NOTIFY_MENTION | BITMASK_NOTIFY_ANNOUNCEMENT,

  /* Mode: mute: no unread + activity + mentions + no announcements */
  mute: BITMASK_NOTIFY_ACTIVITY | BITMASK_NOTIFY_MENTION
};

/* eslint-enable no-multi-spaces */

/* Alias modes */
MODES.mention = MODES.announcement;

var DEFAULT_USER_FLAGS = MODES.all | BITMASK_NOTIFY_DEFAULT;
var DEFAULT_ONE_TO_ONE_FLAGS_WHEN_MUTE = MODES.announcement;

function getModeFromFlags(flags, strict) {
  switch (flags & BITMASK_MODE) {
    case MODES.all:
      return 'all';
    case MODES.announcement:
      return 'announcement';
    case MODES.mute:
      return 'mute';
  }

  if (strict) return null;

  // Ignoring the mobile and desktop notification settings..
  switch (flags & BITMASK_MODE_LEGACY) {
    case MODES.all & BITMASK_MODE_LEGACY:
      return 'all';
    case MODES.announcement & BITMASK_MODE_LEGACY:
      return 'announcement';
    case MODES.mute & BITMASK_MODE_LEGACY:
      return 'mute';
  }

  // TODO: deal with 'unknown' modes better
  return null;
}

function getUpdateForMode(mode, isDefault) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  var setBits = MODES[mode];

  /* Set the 'default setting' bit if this is a default */
  if (isDefault) {
    setBits = setBits | BITMASK_NOTIFY_DEFAULT;
  }

  var clearBits = BITMASK_INVERT_MODE_DEFAULT | setBits;

  return {
    $bit: { flags: { or: setBits, and: clearBits } }
  };
}

function getUpdateForFlags(flags) {
  assert(!isNaN(flags));

  return {
    $set: { flags: flags }
  };
}

function getFlagsForMode(mode, isDefault) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  var flags = MODES[mode];
  if (isDefault) {
    return flags | BITMASK_NOTIFY_DEFAULT;
  } else {
    return flags;
  }
}

function toggleLegacyLurkMode(flags, isLurk) {
  isLurk = !!isLurk;

  if (getLurkForFlags(flags) === isLurk) {
    return flags;
  }

  if (isLurk) {
    return (
      (flags &
      BITMASK_NO_NOTIFY_UNREAD &
      BITMASK_NO_NOTIFY_DESKTOP & // Legacy lurk mode, no desktop notifications
        BITMASK_NO_NOTIFY_MOBILE) | // Legacy lurk mode, no mobile notifications
      BITMASK_NOTIFY_ACTIVITY
    );
  } else {
    return (flags & BITMASK_NO_NOTIFY_ACTIVITY) | BITMASK_NOTIFY_UNREAD;
  }
}

function getLurkForFlags(flags) {
  return !(flags & BITMASK_NOTIFY_UNREAD);
}

function getLurkForMode(mode) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  return getLurkForFlags(MODES[mode]);
}

function hasNotifyUnread(flags) {
  return flags & BITMASK_NOTIFY_UNREAD;
}

function hasNotifyActivity(flags) {
  return flags & BITMASK_NOTIFY_ACTIVITY;
}

function hasNotifyMention(flags) {
  return flags & BITMASK_NOTIFY_MENTION;
}

function hasNotifyAnnouncement(flags) {
  return flags & BITMASK_NOTIFY_ANNOUNCEMENT;
}

function hasNotifyDesktop(flags) {
  return flags & BITMASK_NOTIFY_DESKTOP;
}

function hasNotifyMobile(flags) {
  return flags & BITMASK_NOTIFY_MOBILE;
}

function flagsToHash(flags) {
  return {
    unread: !!(flags & BITMASK_NOTIFY_UNREAD),
    activity: !!(flags & BITMASK_NOTIFY_ACTIVITY),
    mention: !!(flags & BITMASK_NOTIFY_MENTION),
    announcement: !!(flags & BITMASK_NOTIFY_ANNOUNCEMENT),
    default: !!(flags & BITMASK_NOTIFY_DEFAULT),
    desktop: !!(flags & BITMASK_NOTIFY_DESKTOP),
    mobile: !!(flags & BITMASK_NOTIFY_MOBILE)
  };
}

function hashToFlags(hash) {
  return (
    (hash.unread ? BITMASK_NOTIFY_UNREAD : 0) |
    (hash.activity ? BITMASK_NOTIFY_ACTIVITY : 0) |
    (hash.mention ? BITMASK_NOTIFY_MENTION : 0) |
    (hash.announcement ? BITMASK_NOTIFY_ANNOUNCEMENT : 0) |
    (hash.default ? BITMASK_NOTIFY_DEFAULT : 0) |
    (hash.desktop ? BITMASK_NOTIFY_DESKTOP : 0) |
    (hash.mobile ? BITMASK_NOTIFY_MOBILE : 0)
  );
}

function addDefaultFlag(flags) {
  return flags | BITMASK_NOTIFY_DEFAULT;
}

function removeDefaultFlag(flags) {
  return flags & BITMASK_NO_NOTIFY_DEFAULT;
}

module.exports = {
  MODES: MODES,
  DEFAULT_USER_FLAGS: DEFAULT_USER_FLAGS,
  DEFAULT_ONE_TO_ONE_FLAGS_WHEN_MUTE: DEFAULT_ONE_TO_ONE_FLAGS_WHEN_MUTE,

  FLAG_POS_NOTIFY_UNREAD: FLAG_POS_NOTIFY_UNREAD,
  FLAG_POS_NOTIFY_ACTIVITY: FLAG_POS_NOTIFY_ACTIVITY,
  FLAG_POS_NOTIFY_MENTION: FLAG_POS_NOTIFY_MENTION,
  FLAG_POS_NOTIFY_ANNOUNCEMENT: FLAG_POS_NOTIFY_ANNOUNCEMENT,
  FLAG_POS_NOTIFY_DEFAULT: FLAG_POS_NOTIFY_DEFAULT,
  FLAG_POS_NOTIFY_DESKTOP: FLAG_POS_NOTIFY_DESKTOP,
  FLAG_POS_NOTIFY_MOBILE: FLAG_POS_NOTIFY_MOBILE,

  getFlagsForMode: getFlagsForMode,
  getModeFromFlags: getModeFromFlags,
  getUpdateForMode: getUpdateForMode,
  getUpdateForFlags: getUpdateForFlags,
  getLurkForFlags: getLurkForFlags,
  getLurkForMode: getLurkForMode,
  toggleLegacyLurkMode: toggleLegacyLurkMode,

  hasNotifyUnread: hasNotifyUnread,
  hasNotifyActivity: hasNotifyActivity,
  hasNotifyMention: hasNotifyMention,
  hasNotifyAnnouncement: hasNotifyAnnouncement,
  hasNotifyDesktop: hasNotifyDesktop,
  hasNotifyMobile: hasNotifyMobile,

  flagsToHash: flagsToHash,
  hashToFlags: hashToFlags,

  addDefaultFlag: addDefaultFlag,
  removeDefaultFlag: removeDefaultFlag
};
