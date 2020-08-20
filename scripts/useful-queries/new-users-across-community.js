var horizon = new Date(Date.now() - 86400000 * 90);
function objectIdFromDate(date) {
  return Math.floor(date.getTime() / 1000).toString(16) + '0000000000000000';
}

var firstId = new ObjectId(objectIdFromDate(horizon));

var result = db.troupeusers.aggregate([
  {
    $match: {
      _id: { $gt: firstId }
    }
  },
  {
    $group: {
      _id: '$troupeId',
      newUsers: { $addToSet: '$userId' }
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
      newUsers: 1
    }
  },
  {
    $match: { _id: { $ne: null } }
  },
  {
    $unwind: '$newUsers'
  },
  {
    $group: {
      _id: '$_id',
      newUsers: { $addToSet: '$newUsers' }
    }
  },
  {
    $project: {
      _id: 1,
      newUserCount: { $size: '$newUsers' }
    }
  },
  {
    $sort: {
      newUserCount: -1
    }
  },
  {
    $limit: 200
  }
]);

print('Group\tCount');

result.forEach(function(x) {
  print(x._id + '\t' + x.newUserCount);
});
