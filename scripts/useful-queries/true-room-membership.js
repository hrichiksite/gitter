rs.slaveOk();

var result = db.troupeusers.aggregate([
  {
    $group: {
      _id: '$troupeId',
      count: { $sum: 1 }
    }
  },
  {
    $sort: {
      count: -1
    }
  },
  {
    $limit: 10
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
      _id: 1,
      uri: '$troupe.uri',
      count: 1
    }
  }
]);

print('Troupe\tCount');
result.forEach(function(x) {
  print(x.uri + '\t' + x.count);
});
