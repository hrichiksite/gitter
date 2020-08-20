'use strict';

if (rs.isMaster().ismaster) {
  print(
    "Surely you don't want to run this data intensive script on the master of the replica set, try a slave.",
    'This protection is from fail-on-master.js required in the mongo script you are running'
  );
  quit(1);
}

rs.slaveOk();
