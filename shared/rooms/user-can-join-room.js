'use strict';

/*
Some context: It is possible for a non-github user to follow a link to a public
room that doesn't allow non-github users to join. In that case the frontend
must know to not allow the user to join and the backend/API must prevent that
from happening.
*/
function userCanJoinRoom(userProviders, troupeProviders) {
  // By default (undefined or null or empty array) all providers are allowed
  // why all three? Because you might not have set it (undefined) or because it
  // came back from the db and got upgraded to an empty array because of the
  // new schema
  if (!troupeProviders || !troupeProviders.length) {
    return true;
  }

  // To be safe, we assume the user has no identity which is non-sensical, but
  // safer than picking one as that will mask bugs.
  userProviders = userProviders || [];

  // If the user has at least one provider that's allowed, then she can join
  // the room.
  return userProviders.some(up => {
    return troupeProviders.some(tp => {
      return up === tp;
    });
  });
}
module.exports = userCanJoinRoom;
