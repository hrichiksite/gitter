'use strict';

rs.slaveOk();

function createIdForTimestampString(timestamp) {
  var hexSeconds = Math.floor(timestamp / 1000).toString(16);

  while (hexSeconds.length < 8) {
    hexSeconds = '0' + hexSeconds;
  }
  return hexSeconds + '0000000000000000';
}

function createIdForTimestamp(timestamp) {
  return ObjectId(createIdForTimestampString(timestamp));
}

var end = new Date('2016-10-01T00:00:00Z');
var start = new Date('2015-10-01T00:00:00Z');

var x = db.gitter_join_room_events.aggregate([
  {
    $match: {
      _id: {
        $gt: createIdForTimestamp(start),
        $lt: createIdForTimestamp(end)
      },
      'd.userId': {
        $gt: createIdForTimestampString(start),
        $lt: createIdForTimestampString(end)
      }
    }
  },
  {
    $group: {
      _id: '$d.userId',
      first: { $min: '$_id' }
    }
  },
  {
    $lookup: {
      from: 'gitter_join_room_events',
      localField: 'first',
      foreignField: '_id',
      as: 'firstEvent'
    }
  },
  {
    $unwind: '$firstEvent'
  },
  {
    $project: {
      _id: 0,
      userId: '$_id',
      roomId: '$firstEvent.d.troupeId',
      roomUri: '$firstEvent.d.room_uri'
    }
  }
]);

printjson(x.toArray());
