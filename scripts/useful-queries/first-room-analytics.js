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

var firstRooms = cubeFirstRooms(start, end).toArray();

var roomSet = {};
firstRooms.forEach(function(fr) {
  roomSet[fr.roomId] = true;
});

var roomIds = Object.keys(roomSet)
  .map(function(i) {
    try {
      return ObjectId(i);
    } catch (e) {
      return null;
    }
  })
  .filter(Boolean);

var roomSizes = {};
db.troupes
  .find({ _id: { $in: roomIds } }, { _id: 1, uri: 1, userCount: 1 })
  .forEach(function(room) {
    roomSizes[room.uri] = room.userCount;
    roomSizes[room._id] = room.userCount;
  });

var buckets = {};
firstRooms.forEach(function(fr) {
  var signupDate = ObjectId(fr.userId)
    .getTimestamp()
    .toISOString()
    .split('T')[0];
  if (fr.roomUri.toLowerCase().indexOf('freecodecamp') >= 0) return;
  var roomSize = roomSizes[fr.roomId] || roomSizes[fr.roomUri];
  if (!roomSize) return;

  if (buckets[signupDate]) {
    buckets[signupDate].push(roomSize);
  } else {
    buckets[signupDate] = [roomSize];
  }
});

function median(numbers) {
  // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
  var median = 0,
    numsLen = numbers.length;
  numbers.sort();

  if (numsLen % 2 === 0) {
    // is even
    // average of two middle numbers
    median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else {
    // is odd
    // middle number only
    median = numbers[(numsLen - 1) / 2];
  }
  return median;
}

print('day,avgRoomSize,medianRoomSize');
var dates = Object.keys(buckets);
dates.sort();
dates.forEach(function(date) {
  var f = buckets[date];
  var m = median(f);
  var total = f.reduce(function(memo, v) {
    return memo + v;
  }, 0);
  print(date + ',' + total / f.length + ',' + m);
});

function cubeFirstRooms(start, end) {
  // var end = new Date('2016-10-01T00:00:00Z');
  // var start = new Date('2015-10-01T00:00:00Z');
  var m = Mongo('cube-01');
  m.setSlaveOk(true);
  var cubeDb = m.getDB('cube');

  return cubeDb.gitter_join_room_events.aggregate([
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
        roomUri: '$firstEvent.d.room_uri'
      }
    }
  ]);
}
