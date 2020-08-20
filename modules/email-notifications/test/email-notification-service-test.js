'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var Promise = require('bluebird');
var assert = require('assert');
var i18nFactory = require('gitter-web-i18n');
var ObjectID = require('mongodb').ObjectID;
var config = require('gitter-web-env').config;

var BASE_EMAIL_PATH = config.get('email:emailBasePath');

const TROUPE1 = {
  troupe: {
    id: '53d61acc1a1c8bd81c69ce23',
    uri: 'gitter/gitter',
    oneToOne: false,
    userIds: ['53ce4c02d6d7c494a3f737a9', '53cf8aa8fe44f8028eb727fb', '54059cc35bc771454170a225'],
    url: '/gitter/gitter',
    urlUserMap: false,
    nameUserMap: false
  },
  unreadCount: 1,
  unreadItems: ['5405bfdd66579b000004df1a'],
  chats: [
    {
      id: '5405bfdd66579b000004df1a',
      text: 'GOOD STUFF',
      html: 'GOOD STUFF',
      sent: '2014-09-02T13:02:21.343Z',
      mentions: [],
      fromUser: {
        id: '53cf8aa8fe44f8028eb727fb',
        username: 'gitterawesome',
        displayName: 'gitterawesome',
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=128'
      }
    },
    {
      id: '5405bfdd66579b000004df1a',
      text: 'AWesome',
      html: 'AWesome',
      sent: '2014-09-02T13:02:21.343Z',
      mentions: [],
      fromUser: {
        id: '53cf8aa8fe44f8028eb727fb',
        username: 'gitterawesome',
        displayName: 'gitterawesome',
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=128'
      }
    }
  ]
};

const TROUPE2 = {
  troupe: {
    id: '53d61acc1a1c8bd81c69ce23',
    uri: 'gitter/nibbles',
    oneToOne: false,
    userIds: ['53ce4c02d6d7c494a3f737a9', '53cf8aa8fe44f8028eb727fb', '54059cc35bc771454170a225'],
    url: '/gitter/gitter',
    urlUserMap: false,
    nameUserMap: false
  },
  unreadCount: 50,
  unreadItems: ['5405bfdd66579b000004df1a'],
  chats: [
    {
      id: '5405bfdd66579b000004df1a',
      text: 'GOOD STUFF',
      html: 'GOOD STUFF',
      sent: '2014-09-02T13:02:21.343Z',
      mentions: [],
      fromUser: {
        id: '53cf8aa8fe44f8028eb727fb',
        username: 'gitterawesome',
        displayName: 'gitterawesome',
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=128'
      }
    },
    {
      id: '5405bfdd66579b000004df1a',
      text: 'AWesome',
      html: 'AWesome',
      sent: '2014-09-02T13:02:21.343Z',
      mentions: [],
      fromUser: {
        id: '53cf8aa8fe44f8028eb727fb',
        username: 'gitterawesome',
        displayName: 'gitterawesome',
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=128'
      }
    }
  ]
};
const EMAIL_DATA = [TROUPE1, TROUPE2];

describe('email-notification-service', function() {
  describe('unread notifications', function() {
    var emailNotificationService;
    var lang;
    var emailPayload;

    const user = { id: '5405bfdd66579b000004df1a' };

    beforeEach(function() {
      emailPayload = null;
      lang = null;
      emailNotificationService = proxyquireNoCallThru('../lib/email-notification-service', {
        'gitter-web-email-addresses': function() {
          return Promise.resolve('mike.bartlett@gmail.com');
        },
        'gitter-web-user-settings': {
          getUserSettings: function(userId, key) {
            assert(userId);
            assert.strictEqual(key, 'lang');
            return Promise.resolve(lang);
          }
        },
        'gitter-web-mailer': {
          sendEmail: function(pPayload) {
            emailPayload = pPayload;
            return Promise.resolve();
          }
        }
      });
    });

    it('should send emails about unread items', function() {
      return emailNotificationService
        .sendUnreadItemsNotification(user, EMAIL_DATA)
        .then(function() {
          assert.strictEqual(
            emailPayload.subject,
            'Unread messages in gitter/gitter and gitter/nibbles'
          );
        });
    });

    it('should send emails about unread items in de', function() {
      lang = 'de';
      return emailNotificationService
        .sendUnreadItemsNotification(user, EMAIL_DATA)
        .then(function() {
          assert.strictEqual(
            emailPayload.subject,
            'Ungelesene Nachrichten in gitter/gitter und gitter/nibbles'
          );
        });
    });

    it('should send emails about unread items in an unknown language', function() {
      lang = 'gobbledegook';

      return emailNotificationService
        .sendUnreadItemsNotification(user, EMAIL_DATA)
        .then(function() {
          assert.strictEqual(
            emailPayload.subject,
            'Unread messages in gitter/gitter and gitter/nibbles'
          );
        });
    });

    it('should escape RTLO and IDN URLs in unread messages', () => {
      const textToBeEscaped =
        'You will find your MP3 at http://example.com/evil\u202E3pm.exe and do not forget to use http://\u0261itlab.com';
      const chat = {
        id: '5405bfdd66579b000004df1a',
        text: textToBeEscaped,
        html: '[DUMMY MARKDOWN HTML, WE ONLY TEST THE TEXT]',
        sent: '2014-09-02T13:02:21.343Z',
        mentions: [],
        fromUser: {
          id: '53cf8aa8fe44f8028eb727fb',
          username: 'gitterawesome',
          displayName: 'gitterawesome',
          avatarUrlSmall: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=60',
          avatarUrlMedium: 'https://avatars.githubusercontent.com/u/7022301?v=2&s=128'
        }
      };
      const testData = [{ ...TROUPE1, chats: [chat] }];

      return emailNotificationService.sendUnreadItemsNotification(user, testData).then(function() {
        assert.equal(
          emailPayload.data.troupesWithUnreadCounts[0].chats[0].text,
          'You will find your MP3 at http://example.com/evil%E2%80%AE3pm.exe and do not forget to use http://xn--itlab-qmc.com/'
        );
      });
    });
  });

  describe('sendInvitation', function() {
    var emailNotificationService;
    var emailPayload;
    beforeEach(function() {
      emailPayload = null;
      emailNotificationService = proxyquireNoCallThru('../lib/email-notification-service', {
        'gitter-web-mailer': {
          sendEmail: function(pPayload) {
            emailPayload = pPayload;
            return Promise.resolve();
          }
        }
      });
    });

    it('should send an invitation email', function() {
      var invitingUser = {
        username: 'bob'
      };

      var invite = {
        _id: new ObjectID(),
        secret: 'x123',
        emailAddress: 'x@troupetest.local'
      };

      var room = {
        uri: 'a/b'
      };

      return emailNotificationService.sendInvitation(invitingUser, invite, room).then(function() {
        assert.strictEqual(emailPayload.subject, 'bob invited you to join the a/b chat on Gitter');
        assert.strictEqual(emailPayload.from, 'bob <support@gitter.im>');
        assert.strictEqual(emailPayload.replyTo, 'no-reply@gitter.im');
        assert.strictEqual(emailPayload.to, 'x@troupetest.local');
        assert.strictEqual(emailPayload.data.roomUrl, BASE_EMAIL_PATH + '/a/b');
        assert.strictEqual(
          emailPayload.data.inviteUrl,
          BASE_EMAIL_PATH + '/settings/accept-invite/x123?source=email-invite'
        );
        assert.strictEqual(emailPayload.data.roomUri, 'a/b');
        assert.strictEqual(emailPayload.data.senderName, 'bob');
      });
    });
  });

  describe('subjects', function() {
    var emailNotificationService = require('../lib/email-notification-service');

    var FIXTURE_ODD = [
      {
        troupe: {
          uri: 'gitterHQ'
        }
      }
    ];
    var FIXTURE_TWO_ROOMS = [
      {
        troupe: {
          uri: 'gitterHQ'
        }
      },
      {
        troupe: {
          uri: 'troupe'
        }
      }
    ];

    var FIXTURE_ONE_USER_ONE_ROOM = [
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'suprememoocow'
          }
        }
      },
      {
        troupe: {
          uri: 'troupe'
        }
      }
    ];

    var FIXTURE_ONE_USER = [
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'suprememoocow'
          }
        }
      }
    ];

    var FIXTURE_TWO_USERS = [
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'suprememoocow'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'billybob'
          }
        }
      }
    ];

    var FIXTURE_THREE_USERS = [
      {
        troupe: {
          uri: 'troupe'
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'mydigitalshelf'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'trevorah'
          }
        }
      }
    ];

    var FIXTURE_TWO_ROOMS_ONE_USER = [
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'suprememoocow'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'mydigitalshelf'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'trevorah'
          }
        }
      }
    ];

    var FIXTURE_FOUR_USERS = [
      {
        troupe: {
          uri: 'troupe'
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'mydigitalshelf'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'trevorah'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'walter'
          }
        }
      }
    ];

    var FIXTURE_THREE_MIXTURE = [
      {
        troupe: {
          uri: 'this_is_a_very_long_org/with_a_very_long_repo/and_then_a_channel'
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'mydigitalshelf'
          }
        }
      },
      {
        troupe: {
          oneToOne: true,
          user: {
            username: 'trevorah'
          }
        }
      }
    ];

    it('should generate nice subject lines', function() {
      var i18n = i18nFactory.get();

      // One room
      var subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_ODD
      );

      assert.equal('Unread messages in gitterHQ', subject);

      // Two rooms
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_TWO_ROOMS
      );

      assert.equal('Unread messages in gitterHQ and troupe', subject);

      // One user, one troupe
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_ONE_USER_ONE_ROOM
      );

      assert.equal('Unread messages in suprememoocow and troupe', subject);

      // One user
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_ONE_USER
      );

      // Two users
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_TWO_USERS
      );

      assert.equal('Unread messages from suprememoocow and billybob', subject);

      // Three user s
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_THREE_USERS
      );

      assert.equal('Unread messages in troupe, mydigitalshelf and one other', subject);

      // two rooms one user
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_TWO_ROOMS_ONE_USER
      );

      assert.equal('Unread messages from suprememoocow, mydigitalshelf and one other', subject);

      // Four user s
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_FOUR_USERS
      );

      assert.equal('Unread messages in troupe, mydigitalshelf and 2 others', subject);

      // Three user s
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
        i18n,
        FIXTURE_THREE_MIXTURE
      );

      assert.equal('Unread messages in and_then_a_channel, mydigitalshelf and one other', subject);
    });

    it('should generate nice subject lines in multiple languages', function() {
      var i18n = i18nFactory.get();
      i18nFactory.getLocales().forEach(function(lang) {
        i18n.setLocale(lang);

        var subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_ODD
        );
        assert(subject);

        // Two rooms
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_TWO_ROOMS
        );
        assert(subject);

        // One user, one troupe
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_ONE_USER_ONE_ROOM
        );
        assert(subject);

        // One user
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_ONE_USER
        );
        assert(subject);

        // Two users
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_TWO_USERS
        );
        assert(subject);

        // Three user s
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_THREE_USERS
        );
        assert(subject);

        // two rooms one user
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_TWO_ROOMS_ONE_USER
        );
        assert(subject);

        // Four user s
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_FOUR_USERS
        );
        assert(subject);

        // Three user s
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(
          i18n,
          FIXTURE_THREE_MIXTURE
        );
        assert(subject);
      });
    });
  });
});
