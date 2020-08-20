rs.slaveOk();

var DAYS = 90;

var horizon = new Date(Date.now() - 86400000 * DAYS);

function objectIdFromDate(date) {
  return Math.floor(date.getTime() / 1000).toString(16) + '0000000000000000';
}

var firstId = ObjectId(objectIdFromDate(horizon));

var result = db.chatmessages.aggregate([
  {
    $match: {
      _id: { $gt: firstId }
    }
  },
  {
    $group: {
      _id: '$toTroupeId',
      chatUsers: { $addToSet: '$fromUserId' }
    }
  },
  {
    $lookup: {
      from: 'troupes',
      localField: '_id',
      foreignField: '_id',
      as: 'troupe'
    }
  },
  {
    $unwind: '$troupe'
  },
  {
    $project: {
      _id: {
        $cond: {
          if: { $eq: ['$troupe.githubType', 'ORG'] },
          then: '$troupe.lcUri',
          else: '$troupe.lcOwner'
        }
      },
      chatUsers: 1
    }
  },
  {
    $match: { _id: { $ne: null } }
  },
  {
    $unwind: '$chatUsers'
  },
  {
    $group: {
      _id: '$_id',
      chatUsers: { $addToSet: '$chatUsers' }
    }
  },
  {
    $project: {
      _id: 1,
      chatUserCount: { $size: '$chatUsers' }
    }
  },
  {
    $sort: {
      chatUserCount: -1
    }
  },
  {
    $limit: 200
  }
]);

print('Group\tCount');
result.forEach(function(x) {
  print(x._id + '\t' + x.chatUserCount);
});
