db.troupes.aggregate([
  {
    $match: {
      oneToOne: true
    }
  },
  {
    $project: {
      _id: 1,
      userId1: { $arrayElemAt: ['$oneToOneUsers.userId', 0] },
      userId2: { $arrayElemAt: ['$oneToOneUsers.userId', 1] }
    }
  },
  {
    $lookup: {
      from: 'troupeusers',
      localField: '_id',
      foreignField: 'troupeId',
      as: 'users'
    }
  },
  {
    $match: {
      $or: [
        {
          users: { $size: 0 }
        },
        {
          users: { $size: 1 }
        }
      ]
    }
  },
  {
    $project: {
      _id: 1,
      userId1: 1,
      userId2: 1,
      troupeUserId1: { $arrayElemAt: ['$users.userId', 0] }
    }
  }
]);

db.troupes.aggregate([
  {
    $match: {
      oneToOne: true
    }
  },
  {
    $project: {
      _id: 1,
      userId1: { $arrayElemAt: ['$oneToOneUsers.userId', 0] },
      userId2: { $arrayElemAt: ['$oneToOneUsers.userId', 1] }
    }
  },
  {
    $limit: 100
  }
]);
