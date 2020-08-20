'use strict';

var env = require('gitter-web-env');
var config = env.config;

var Intercom = require('intercom-client');
var intercomOptions = {
  appId: config.get('stats:intercom:app_id'),
  appApiKey: config.get('stats:intercom:key')
};
exports.client = new Intercom.Client(intercomOptions).usePromises();

function suggestionsToAttributes(suggestions) {
  suggestions = suggestions.slice(0, 5);
  var attrs = {};
  suggestions.forEach(function(suggestion, index) {
    attrs['suggestion' + index + '_uri'] = suggestion.uri;
    attrs['suggestion' + index + '_avatar'] = suggestion.avatarUrl;
    attrs['suggestion' + index + '_users'] = suggestion.userCount;
    attrs['suggestion' + index + '_messages'] = suggestion.messageCount;
  });
  return attrs;
}
exports.suggestionsToAttributes = suggestionsToAttributes;
