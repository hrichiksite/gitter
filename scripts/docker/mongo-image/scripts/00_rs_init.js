'use strict';

var result = rs.initiate({
  _id: 'troupeSet',
  members: [
    {
      _id: 0,
      host: '127.0.0.1:27017'
    }
  ]
});

if (!result.ok) {
  throw new Error('rs.initiate failed: ' + result.errmsg);
}

while (!rs.isMaster().ismaster) {
  sleep(100);
}
