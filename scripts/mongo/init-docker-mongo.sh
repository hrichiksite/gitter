#!/bin/bash

set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

MONGODB1=$(ping -c 1 mongo1 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1)
MONGODB2=$(ping -c 1 mongo2 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1)
MONGODB3=$(ping -c 1 mongo3 | head -1  | cut -d "(" -f 2 | cut -d ")" -f 1)

if [[ "$(mongo --host "$MONGODB1" --quiet --eval 'rs.status().ok')" -ne "1" ]]; then
  MONGO_REPLICA_CONFIG=$(cat <<EOF
     var cfg = {
          "_id": "troupeSet",
          "version": 1,
          "members": [
              {
                  "_id": 0,
                  "host": "${MONGODB1}:27017",
                  "priority": 2
              },
              {
                  "_id": 1,
                  "host": "${MONGODB2}:27017",
                  "priority": 1
              },
              {
                  "_id": 2,
                  "host": "${MONGODB3}:27017",
                  "priority": 1,
                  "arbiterOnly": true
              }
          ]
      };
      rs.initiate(cfg);
EOF
  )
  echo "Waiting to initialize mongo with $MONGO_REPLICA_CONFIG"
  sleep 20

  echo "$MONGO_REPLICA_CONFIG" | mongo --host "${MONGODB1}:27017"

  sleep 10

  "$SCRIPT_DIR/../dataupgrades/001-oauth-client/002-add-redirect-uri.sh" "$MONGODB1/gitter"
fi
