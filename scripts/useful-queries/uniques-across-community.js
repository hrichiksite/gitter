//rs.slaveOk();
//var memberCounts =
var result = db.troupeusers.aggregate([
  {
    $group: {
      _id: '$troupeId',
      userIds: { $addToSet: '$userId' }
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
    $project: {
      _id: 0,
      userIds: 1,
      lcOwner: '$troupe.lcOwner'
    }
  },
  {
    $match: {
      lcOwner: { $size: 1 }
    }
  },
  {
    $match: {
      lcOwner: { $ne: null }
    }
  },
  {
    $unwind: '$lcOwner'
  },
  {
    $unwind: '$userIds'
  },
  {
    $group: {
      _id: '$lcOwner',
      userIds: { $addToSet: '$userIds' }
    }
  },
  {
    $project: {
      _id: 1,
      usercount: { $size: '$userIds' }
    }
  },
  {
    $sort: {
      usercount: -1
    }
  },
  {
    $limit: 100
  }
]).result;
result.forEach(function(x) {
  print('|' + x._id + '|' + x.usercount + '|');
});
