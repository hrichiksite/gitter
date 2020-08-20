'use strict';

const testRequire = require('../test-require');
const clientEnv = require('gitter-client-env');

const prerenderChatHelper = testRequire('./web/prerender-chat-helper');
const assert = require('assert');

describe('prerenderChatHelper', function() {
  const baseChat = {
    text: '**Moo**',
    html: '<b>Moo</b>',
    fromUser: {
      displayName: 'Billy Bob',
      username: 'squarepants'
    }
  };

  it('should prerender chat items, with burstStart', function() {
    const burstChat = { ...baseChat, burstStart: true };
    const result = prerenderChatHelper(burstChat, { data: { root: {} }, hash: {} });
    assert(result.indexOf(' burstStart ') >= 0);
  });

  it('should prerender chat items, no burstStart', function() {
    const result = prerenderChatHelper(baseChat, { data: { root: {} }, hash: {} });
    assert(result.indexOf(' burstStart ') < 0);
  });

  it('should render item actions for normal chat item', () => {
    const result = prerenderChatHelper(baseChat, { data: { root: {} }, hash: {} });
    assert(result.indexOf('chat-item__actions') > 0);
  });

  it('should not render item actions for archive chat item', () => {
    const result = prerenderChatHelper(baseChat, { data: { root: {} }, hash: { type: 'archive' } });
    assert(result.indexOf('chat-item__actions') < 0);
  });

  describe('permaLink', () => {
    const permalinkChat = {
      ...baseChat,
      id: '5c94afb8b9552a27a7930fbb',
      burstStart: true,
      sent: '2019-03-22T09:49:43.939Z'
    };

    const params = {
      data: {
        root: { troupeName: 'group/room' }
      },
      hash: {}
    };

    const HREF_REGEXP = /href=['"]([^'"]+)['"]/;

    it('should prerender normal permalink', () => {
      const result = prerenderChatHelper(permalinkChat, params);
      const [, href] = HREF_REGEXP.exec(result);
      assert.strictEqual(href, `${clientEnv['basePath']}/group/room?at=5c94afb8b9552a27a7930fbb`);
    });

    it('should prerender archive permalink', () => {
      const result = prerenderChatHelper(permalinkChat, { ...params, hash: { type: 'archive' } });
      const [, href] = HREF_REGEXP.exec(result);
      assert.strictEqual(
        href,
        `${clientEnv['basePath']}/group/room/archives/2019/03/22?at=5c94afb8b9552a27a7930fbb`
      );
    });
  });
});
