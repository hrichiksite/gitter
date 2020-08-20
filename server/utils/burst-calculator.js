'use strict';

/**
 * IMPORTANT: this version differs from client-side calculateBursts() due to backbone access methods!
 * calculateBursts() calculates what chat messages are 'bursts'.
 *
 * `Array` chats - the collection of chat messages
 * returns the modified chats array
 */
var calculateBursts = function(chats) {
  // console.time('calculateBursts'); // benchmarking
  /* @const - time window, in which an user can keep adding chat items as part of a initial "burst" */
  var BURST_WINDOW = 5 * 60 * 1000; // 5 minutes

  var burstUser, burstStart;

  chats.forEach(function(chat) {
    if (chat.parentId) return; // ignore thread messages for now
    var newUser = chat.fromUser && chat.fromUser.username;
    var newSentTime = chat.sent;

    // if message is a me status
    if (chat.status) {
      burstUser = null;
      chat.burstStart = true;
      return;
    }

    // get the duration since last burst
    var durationSinceBurstStart = new Date(newSentTime) - new Date(burstStart);

    // if the current user is different or the duration since last burst is larger than 5 minutes we have a new burst
    if (newUser !== burstUser || durationSinceBurstStart > BURST_WINDOW) {
      burstUser = newUser;
      burstStart = newSentTime;
      chat.burstStart = true;
      return;
    }

    // most messages won't be a burst
    chat.burstStart = false;
  });
  return chats;
  // console.timeEnd('calculateBursts');
};

module.exports = calculateBursts;
