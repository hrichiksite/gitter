#!/bin/bash

set -e
set -x

export INDEX_VERSION=01
export INDEX_NAME=gitter${INDEX_VERSION}
export USER_RIVER=gitterUserRiver${INDEX_VERSION}
export CHAT_RIVER=gitterChatRiver${INDEX_VERSION}
export ROOM_RIVER=gitterRoomRiver${INDEX_VERSION}
export GROUP_RIVER=gitterGroupRiver${INDEX_VERSION}
export ES_URL=http://localhost:9200
export ES_NUMBER_OF_REPLICAS=0

while ! curl -q --fail "${ES_URL}"; do sleep 1; done

MONGO_HOST_1=mongo1
export MONGO_HOST_1
export MONGO_PORT_1=27017

./01-create-index-with-mapping
./02-create-rivers
./03-setup-alias
