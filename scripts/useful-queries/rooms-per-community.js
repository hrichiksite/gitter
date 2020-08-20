db.troupes
  .aggregate([
    { $project: { lcOwner: 1, _id: 0 } },
    { $match: { lcOwner: { $ne: null } } },
    { $group: { _id: '$lcOwner', roomCount: { $sum: 1 } } },
    { $sort: { roomCount: -1 } },
    { $limit: 20 }
  ])
  .result.forEach(function(row) {
    print('| ' + row._id + ' | ' + row.roomCount + ' |');
  });
