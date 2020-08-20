#!/bin/bash
set -e
set -x
MONGO_HOST=$1
MONGO_DB=$2

if [ -z "$MONGO_HOST" ]; then
  MONGO_HOST=localhost
fi;

if [ -z "$MONGO_DB" ]; then
  MONGO_DB=gitter
fi;

MONGO_URL=$MONGO_HOST/$MONGO_DB

BACKUP_DONE=""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

MD5=$(which md5||which md5sum)


find $SCRIPT_DIR/dataupgrades -type f -name "*.sh" -print0 | while read -d $'\0' file
do
  md5=$($MD5 "$file")


  if [[ $(mongo $MONGO_URL --quiet --eval "print(db.dataUpgrades.find({ \"script\":  \"$file\", \"md5\": \"$md5\"}).length())") -eq 0 ]]; then
    if [[ "${SKIP_BACKUP}" != "yes" ]]; then

      if [ -z "$BACKUP_DONE" ]; then
        BACKUP_DIR=mongo-backup-$(date "+%Y-%m-%d.%H-%M-%S")
        mkdir -p "$BACKUP_DIR"
        mongodump --host $MONGO_HOST --oplog --out "mongo-backup-$(date "+%Y-%m-%d.%H-%M-%S")"
        BACKUP_DONE="DONE"
      fi

    fi

    echo executing "$file"
    "$file" $MONGO_URL


    result=$?

    mongo $MONGO_URL --quiet --eval "db.dataUpgradesExecutions.insert({ \"script\":  \"$file\", \"md5\": \"$md5\", executedAt: new Date(), result: \"$result\"})"

    if [ $result -eq 0 ]; then
      mongo $MONGO_URL --quiet --eval "db.dataUpgrades.update({ \"script\":  \"$file\" }, { \"script\":  \"$file\", \"md5\": \"$md5\", executedAt: new Date() }, { \"upsert\": true } )"
    else
      exit $result
    fi;
  fi;

done
