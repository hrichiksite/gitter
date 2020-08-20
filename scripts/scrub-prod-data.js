/* eslint-env mongo */
'use strict';

var status = rs.status();

if (status.ok === 1 && status.set !== 'TroupeBetaProdData') {
  throw new Error('This script can only be executed against TroupeBetaProdData');
}

print('removing push notification devices');
printjson(db.pushnotificationdevices.remove({}));

print('removing invitedEmail');
printjson(
  db.users.update(
    { invitedEmail: { $exists: true } },
    { $unset: { invitedEmail: true } },
    { multi: true }
  )
);

print('removing githubScopes');
printjson(
  db.users.update(
    {
      githubScopes: { $exists: true }
    },
    { $set: { githubScopes: {} } },
    { multi: true }
  )
);

print('removing githubUserToken');
printjson(
  db.users.update(
    {
      githubUserToken: { $exists: true }
    },
    { $unset: { githubUserToken: true } },
    { multi: true }
  )
);

print('removing githubToken');
printjson(
  db.users.update(
    {
      githubToken: { $exists: true }
    },
    { $unset: { githubToken: true } },
    { multi: true }
  )
);

print('removing identity secrets');
printjson(
  db.identities.update(
    {},
    {
      $unset: {
        accessTokenSecret: true,
        accessToken: true,
        email: true
      }
    },
    { multi: true }
  )
);
