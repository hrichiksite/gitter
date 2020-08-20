#!/bin/bash

set -e

cat | while read line; do
  USERNAME=`echo $line|cut -d, -f1`
  DISPLAY_NAME=`echo $line|cut -d, -f2`
  EMAILS=`echo $line|cut -d, -f3,4,5,6,7,8,9|sed -e 's/,/","/g'`
  cat <<DELIM
print("$USERNAME");
db.users.update(
  { username: "$USERNAME" },
  { \$setOnInsert:
    { username: "$USERNAME",
      displayName: "$DISPLAY_NAME" },
    \$set:
    { emails: ["$EMAILS"].filter(function(f) { return f; }) }
  },
  { upsert: true });
DELIM


done
