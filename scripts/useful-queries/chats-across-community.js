var horizon = new Date(Date.now() - 86400000 * 90);
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
      chatCount: { $sum: 1 }
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
      _id: 0,
      lcOwner: {
        $cond: {
          if: { $eq: ['$troupe.githubType', 'ORG'] },
          then: '$troupe.lcUri',
          else: '$troupe.lcOwner'
        }
      },
      chatCount: 1
    }
  },
  {
    $group: {
      _id: '$lcOwner',
      chatCount: { $sum: '$chatCount' }
    }
  },
  {
    $sort: {
      chatCount: -1
    }
  },
  {
    $limit: 100
  }
]);
result.forEach(function(x) {
  print(x._id + '\t' + x.chatCount);
});
