'use strict';

var ChatMessage = require('gitter-web-persistence').ChatMessage;
var debug = require('debug')('gitter:tests:test-fixtures');

function createMessage(f) {
  debug('Creating %s', f.fixtureName);

  return ChatMessage.create({
    fromUserId: f.fromUserId,
    toTroupeId: f.toTroupeId,
    parentId: f.parentId,
    threadMessageCount: f.threadMessageCount,
    text: f.text,
    status: f.status,
    html: f.html,
    urls: f.urls,
    mentions: f.mentions,
    issues: f.issues,
    meta: f.meta,
    sent: f.sent,
    editedAt: f.editedAt,
    pub: f.pub || false,
    readBy: f.readBy
  });
}

async function createMessages(expected, fixtures) {
  function linkExpectedWithFixtures(expectedMessage) {
    expectedMessage.fromUserId = fixtures[expectedMessage.user]._id;
    expectedMessage.toTroupeId = fixtures[expectedMessage.troupe]._id;
    if (expectedMessage.parent) {
      expectedMessage.parentId = fixtures[expectedMessage.parent]._id;
    }
  }

  async function createFixture(expectedMessage) {
    linkExpectedWithFixtures(expectedMessage);
    const message = await createMessage(expectedMessage);
    fixtures[expectedMessage.fixtureName] = message;
  }

  const expectedMessages = Object.keys(expected)
    .filter(fixtureName => fixtureName.match(/^message(?!Report)/))
    .map(fixtureName => ({ fixtureName, ...expected[fixtureName] }));

  // separate messages based on whether they are normal or child (thread) messages
  // normal messages need to be created first so they can be referenced by child messages
  const normalMessages = expectedMessages.filter(m => !m.parent);
  await Promise.all(normalMessages.map(createFixture));

  const childMessages = expectedMessages.filter(m => !!m.parent);
  await Promise.all(childMessages.map(createFixture));
}

module.exports = createMessages;
