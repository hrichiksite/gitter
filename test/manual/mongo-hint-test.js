'use strict';

var speedy = require('speedy');
var chatService = require('gitter-web-chats');

// speedy.samples(10);

speedy.run({
  withHintAroundId: function(done) {
    chatService.testOnly.setUseHints(true);

    chatService
      .findChatMessagesForTroupe('54d244f1c53660e29b9f91d9', {
        aroundId: '54dde310ef961706de37462d'
      })
      .then(data => done(null, data), err => done(err));
  },
  withoutHintAroundId: function(done) {
    chatService.testOnly.setUseHints(false);

    chatService
      .findChatMessagesForTroupe('54d244f1c53660e29b9f91d9', {
        aroundId: '54dde310ef961706de37462d'
      })
      .then(data => done(null, data), err => done(err));
  },
  withHintBeforeId: function(done) {
    chatService.testOnly.setUseHints(true);

    chatService
      .findChatMessagesForTroupe('54d244f1c53660e29b9f91d9', {
        beforeId: '54dde310ef961706de37462d'
      })
      .then(data => done(null, data), err => done(err));
  },
  withoutHintBeforeId: function(done) {
    chatService.testOnly.setUseHints(false);

    chatService
      .findChatMessagesForTroupe('54d244f1c53660e29b9f91d9', {
        beforeId: '54dde310ef961706de37462d'
      })
      .then(data => done(null, data), err => done(err));
  },
  withHintLatest: function(done) {
    chatService.testOnly.setUseHints(true);

    chatService
      .findChatMessagesForTroupe('54d244f1c53660e29b9f91d9', {})
      .then(data => done(null, data), err => done(err));
  },
  withoutHintLatest: function(done) {
    chatService.testOnly.setUseHints(false);

    chatService
      .findChatMessagesForTroupe('54d244f1c53660e29b9f91d9', {})
      .then(data => done(null, data), err => done(err));
  },
  firstMessageInRoom: function(done) {
    chatService
      .getDateOfFirstMessageInRoom('54d244f1c53660e29b9f91d9')
      .then(data => done(null, data), err => done(err));
  }
});
