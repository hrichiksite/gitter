'use strict';

var providerMap = {
  gitlab: 'GitLab',
  github: 'GitHub',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  google: 'Google',
  facebook: 'Facebook'
};

function makeRoomProviderSentence(troupeProviders) {
  troupeProviders = troupeProviders || [];

  var names = troupeProviders.map(function(provider) {
    return providerMap[provider] || provider;
  });

  // We could actually split this into a "joinNouns" or something. Assuming we
  // don't have it already..
  var parts = [];
  names.forEach(function(name, index) {
    parts.push(name);
    if (index < names.length - 1) {
      if (index == names.length - 2) {
        parts.push(' and ');
      } else {
        parts.push(', ');
      }
    }
  });
  var joinedNames = parts.join('');

  return 'Only ' + joinedNames + ' users can join this room.';
}
module.exports = makeRoomProviderSentence;
