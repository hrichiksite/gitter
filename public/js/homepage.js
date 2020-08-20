'use strict';

require('./utils/font-setup');

var $ = require('jquery');

var urlParse = require('url-parse');
var appEvents = require('./utils/appevents');
var context = require('gitter-web-client-context');
var mapMessageTemplate = require('./views/homepage/map-message.hbs');
var roomNameTrimmer = require('gitter-web-shared/room-name-trimmer');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var apiClient = require('./components/api-client');
var onready = require('././utils/onready');

var modalRegion = require('./components/modal-region');
var LoginView = require('./views/modals/login-view');

require('./utils/tracking');
require('@gitterhq/styleguide/css/components/buttons.css');

var active = [];

var featuredRooms = [
  { uri: 'angular-ui/ng-grid', name: 'Angular UI', language: 'JavaScript', locale: 'en' },
  { uri: 'postcss/postcss', name: 'Postcss', language: 'CSS', locale: 'en' },
  { uri: 'gitterHQ/nodejs', name: '#nodejs', channel: true, language: 'JavaScript', locale: 'en' },
  { uri: 'scala/scala', name: 'Scala', language: 'Scala', locale: 'en' },
  {
    uri: 'mozillascience/community',
    name: 'Mozilla Science',
    language: 'Mozilla Science Lab community',
    locale: 'en'
  },
  {
    uri: 'deeplearning4j/deeplearning4j',
    name: 'Deeplearning4J',
    language: 'Deep Learning for Java',
    locale: 'en'
  },
  {
    uri: 'numenta/public',
    name: 'Numenta',
    language: 'Machine Intelligence Research',
    locale: 'en'
  },
  { uri: 'Aurelia/Discuss', name: 'Aurelia', language: 'JavaScript', locale: 'en' },
  { uri: 'Dogfalo/materialize', name: 'Materialize', language: 'CSS', locale: 'en' },
  {
    uri: 'google/material-design-lite',
    name: 'Material Design Lite',
    language: 'Google Material Design Lite',
    locale: 'en'
  },
  {
    uri: 'aws/aws-sdk-ruby',
    name: 'AWS Ruby SDK',
    language: 'The official AWS SDK for Ruby',
    locale: 'en'
  }
];

function random(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  for (
    var j, x, i = array.length;
    i;
    j = Math.floor(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x
  );
  return array;
}

function roomByLocale(locale) {
  var rooms = featuredRooms.filter(function(r) {
    return r.locale === locale;
  });
  if (rooms.length) {
    active.push(rooms[0].name);
    return rooms[0];
  } else {
    return randomRoom();
  }
}

function randomRoom() {
  var room = random(featuredRooms);
  if (active.indexOf(room.name) === -1) {
    active.push(room.name);
    return room;
  } else {
    return randomRoom();
  }
}

function initEmbedPanel() {
  var rooms = [
    { name: 'Gitter', uri: 'gitter/gitter', language: "Let's talk about Gitter!" },
    roomByLocale(context.lang()),
    randomRoom(),
    randomRoom()
  ];

  var tabs = $('.communities-tabs a');

  tabs.each(function() {
    var $this = $(this);
    var tabIndex = $this.data().tabIndex;

    var room = rooms[tabIndex];
    var owner = room.uri.split('/')[0];

    $this.html(
      // TODO: send more than just the username
      '<img src="' +
        resolveUserAvatarUrl({ username: owner }, 48 * 2) +
        '" width="48" height="48">' +
        '<h3>' +
        room.name +
        '</h3>' +
        '<em>' +
        room.language +
        '</em>'
    );
  });

  tabs.on('click', function() {
    var $this = $(this);
    var tabIndex = $this.data().tabIndex;

    tabs.removeClass('active');
    $this.addClass('active');
    $('#embedded-chat').attr({ src: '/' + rooms[tabIndex].uri + '/~embed' });
  });
}

function initAppsPanelScrollListener() {
  var $panel = $('#apps-panel');
  var $window = $(window);

  $window.on('scroll', function(e) {
    e.preventDefault();

    var hasScrolledHalfwayThroughPanel =
      $window.scrollTop() + $window.height() / 2 > $panel.position().top;

    if (hasScrolledHalfwayThroughPanel) {
      $panel.addClass('visible');
      $window.off('scroll');
    }
  });
}

function initMapMessages() {
  //  Make sure we don't randomly generate people in the ocean
  // Commented out coords are on south america that interfere with the cta buttons
  var coords = shuffle([
    [64, 113],
    [150, 142],
    /*[194, 222],*/ [345, 221],
    [275, 70],
    [340, 95],
    [490, 141],
    [531, 206],
    [579, 268],
    [345, 104],
    [532, 21],
    [218, 48],
    [384, 226],
    /*[153, 226],*/ [420, 157]
  ]);

  var $map = $('.map');

  apiClient.priv.get('/sample-chats').then(function(messages) {
    setInterval(function() {
      var chatMessage = messages.shift();
      var pos = coords.shift();

      if (!chatMessage || !pos) return;
      messages.push(chatMessage);
      coords.push(pos);

      var $el = createMessageElement(chatMessage, pos);
      addMessageElementToMap($el, $map);

      setTimeout(function() {
        removeItemFromMap($el);
      }, 2000);
    }, 2000);
  });
}

function createMessageElement(chatMessage, pos) {
  var html = mapMessageTemplate({
    username: chatMessage.username,
    displayName: chatMessage.displayName,
    avatarUrl: chatMessage.avatarUrl,
    fullRoomName: chatMessage.room,
    roomName: roomNameTrimmer(chatMessage.room),
    left: pos[0],
    top: pos[1]
  });

  return $(html);
}

function addMessageElementToMap($message, $map) {
  $message.appendTo($map);

  var $span = $message.find('span');
  $span.css('left', (400 - $span.outerWidth()) / 2);

  $message.children('img').load(function() {
    $message.children().addClass('enter');
  });
}

function removeItemFromMap($message) {
  var children = $message.children();
  $(children[0])
    .removeClass('enter')
    .animate({ opacity: 0 }, function() {
      setTimeout(function() {
        $message
          .children()
          .removeClass('enter')
          .animate({ opacity: 0 }, function() {
            $message.remove();
          });
      }, 7500);
    });
  // $message.children().removeClass('enter').animate({opacity: 0}, function() {
  //   $message.remove();
  // });
}

function cycleElements($els, time) {
  $els.first().addClass('visible');
  var tallestHeight = 0;
  $els.each(function() {
    var height = $(this).outerHeight();
    if (height > tallestHeight) {
      tallestHeight = height;
    }
  });
  $els.parent().css('height', tallestHeight);

  setInterval(function() {
    var active = $els
      .filter('.visible')
      .removeClass('visible')
      .addClass('going');
    var target = active.next();

    if (!target.length) {
      target = $els.first();
    }

    target.removeClass('going').addClass('visible');
  }, time);
}

onready(function() {
  initEmbedPanel();
  initAppsPanelScrollListener();
  initMapMessages();
  cycleElements($('#testimonials-panel blockquote'), 7000);
  cycleElements($('.loves li'), 2500);
  document.getElementById('osx-download').addEventListener('click', function() {
    appEvents.trigger('stats.event', 'apps.osx.download.clicked');
  });

  document.getElementById('windows-download').addEventListener('click', function() {
    appEvents.trigger('stats.event', 'apps.windows.download');
  });

  $('a[href^="/login"]').on('click', function(e) {
    var href = $(e.currentTarget).attr('href');
    var parsed = urlParse(href, true);
    if (parsed.pathname !== '/login') {
      // don't accidentally intercept links inside the modal
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var modal = new LoginView(parsed.query);
    modalRegion.show(modal);
    // hack this modal because we're not using history or routing here
    modal.navigable = false;
  });
});
