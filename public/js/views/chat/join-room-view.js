'use strict';

const debug = require('debug-proxy')('app:join-room-view');
var Marionette = require('backbone.marionette');
var template = require('./tmpl/join-room-view.hbs');
var context = require('gitter-web-client-context');
var apiClient = require('../../components/api-client');
var urlParse = require('url-parse');
var userCanJoinRoom = require('gitter-web-shared/rooms/user-can-join-room');
var makeRoomProviderSentence = require('gitter-web-shared/rooms/make-room-provider-sentence');

var JoinRoomView = Marionette.ItemView.extend({
  template: template,

  attributes: {
    class: 'chat-input__box',
    name: 'chat'
  },

  ui: {
    joinRoom: '.js-join-room'
  },

  events: {
    'click @ui.joinRoom': 'joinRoom'
  },

  joinRoom: function(e) {
    var isEmbedded = context().embedded;
    var roomPostOptions = {
      id: context.getTroupeId()
    };

    if (isEmbedded) {
      roomPostOptions.source = '~embed';
    } else {
      const parsed = urlParse(window.location.href, true);
      roomPostOptions.source = parsed.query.source;
    }

    //If the room has a welcome message
    //and we aren't in an embedded frame
    //get outta here and let the browser do its thing
    const hasWelcomeMessage = context.roomHasWelcomeMessage();
    debug(
      `joinRoom hasWelcomeMessage=${hasWelcomeMessage} isEmbedded=${isEmbedded} roomPostOptions=${JSON.stringify(
        roomPostOptions
      )}`
    );
    if (hasWelcomeMessage && !isEmbedded) {
      return;
    }

    //Event cancelation
    if (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    return apiClient.user.post('/rooms', roomPostOptions).then(function(body) {
      context.setTroupe(body);
    });
  },

  serializeData: function() {
    var userProviders = context.user().get('providers');
    var troupeProviders = context.troupe().get('providers');
    return {
      allowJoin: userCanJoinRoom(userProviders, troupeProviders),
      disallowJoinReason: makeRoomProviderSentence(troupeProviders)
    };
  }
});

module.exports = JoinRoomView;
