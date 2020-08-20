'use strict';

var mailerService = require('gitter-web-mailer');
var fs = require('fs');
var path = require('path');
var handlebars = require('handlebars');
var Promise = require('bluebird');

function convertMandrillToHandlebars(name) {
  var mandrillTemplate = fs.readFileSync(name, { encoding: 'utf8' });
  var handlebarsTemplate = mandrillTemplate.replace(/\*\|(\w+)\|\*/g, function(string, name) {
    return '{{{' + name + '}}}';
  });
  return handlebars.compile(handlebarsTemplate);
}

var template = convertMandrillToHandlebars(path.join(__dirname, 'unread-notification.html'));

var data = mailerService.testOnly.VALID_TEMPLATES['unread-notification']({
  troupesWithUnreadCounts: [
    {
      troupe: {
        uri: 'BOB',
        name: 'BOB'
      },
      unreadCount: 99,
      chats: [
        {
          fromUser: {
            avatarUrlSmall: 'https://avatars2.githubusercontent.com/u/594566?v=3&s=460',
            username: 'suprememoocow'
          },
          text:
            'HELLO this is a really long long message. What do you think of this. I think its nice. Have a sterling day'
        }
      ]
    }
  ]
});

Promise.props(data).then(function(data) {
  console.log('DATA', data);
  fs.writeFileSync(path.join(__dirname, 'unread-notification.out.html'), template(data));
});
