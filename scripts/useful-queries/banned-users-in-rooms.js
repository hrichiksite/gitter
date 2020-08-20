rs.slaveOk();

print('| troupeId | uri | userId | username |');

var aggregation = db.troupes.aggregate([
  {
    $match: {
      bans: {
        $exists: true
      }
    }
  },
  {
    $project: {
      _id: 1,
      uri: 1,
      bans: 1
    }
  },
  {
    $unwind: '$bans'
  },
  {
    $lookup: {
      from: 'troupeusers',
      localField: 'bans.userId',
      foreignField: 'userId',
      as: 'troupeUsers'
    }
  },
  {
    $unwind: '$troupeUsers'
  },
  {
    $project: {
      _id: 1,
      userId: '$troupeUsers.userId',
      bans: 1,
      uri: 1,
      match: { $eq: ['$troupeUsers.troupeId', '$_id'] }
    }
  },
  {
    $match: {
      match: true
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'bannedUser'
    }
  },
  {
    $unwind: '$bannedUser'
  },
  {
    $project: {
      _id: 1,
      uri: 1,
      userId: 1,
      username: '$bannedUser.username'
    }
  }
]);

aggregation.toArray().forEach(function(row) {
  print('| ' + row._id + ' | ' + row.uri + ' | ' + row.userId + ' | ' + row.username);
});
