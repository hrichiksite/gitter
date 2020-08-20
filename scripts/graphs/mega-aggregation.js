/* eslint-disable */
db.troupeusers.aggregate(
  [
    {
      $lookup: {
        from: 'troupes',
        localField: 'troupeId',
        foreignField: '_id',
        as: 'troupe'
      }
    },
    {
      $unwind: '$troupe'
    },
    {
      $match: {
        'troupe.oneToOne': { $ne: true }
      }
    },
    {
      $project: {
        _id: 0,
        troupeId: 1,
        userId: 1
      }
    },
    {
      $lookup: {
        from: 'troupeusers',
        localField: 'userId',
        foreignField: 'userId',
        as: 'users'
      }
    },
    {
      $unwind: '$users'
    },
    {
      $project: {
        _id: 0,
        troupeId1: '$troupeId',
        troupeId2: '$users.troupeId',
        eq: {
          $cmp: ['$troupeId', '$users.troupeId']
        }
      }
    },
    {
      $match: {
        eq: {
          $ne: 0
        }
      }
    },
    {
      $project: {
        troupeId1: {
          $cond: {
            if: { $eq: ['$eq', 1] },
            then: '$troupeId1',
            else: '$troupeId2'
          }
        },
        troupeId2: {
          $cond: {
            if: { $eq: ['$eq', 1] },
            then: '$troupeId2',
            else: '$troupeId1'
          }
        }
      }
    },
    {
      $group: {
        _id: {
          troupeId1: '$troupeId1',
          troupeId2: '$troupeId2'
        },
        commonUsers: {
          $sum: 1
        }
      }
    },
    {
      $match: { commonUsers: { $gt: 4 } }
    },
    {
      $project: {
        _id: 0,
        troupeId1: '$_id.troupeId1',
        troupeId2: '$_id.troupeId2',
        commonUsers: 1
      }
    },
    {
      $sort: {
        commonUsers: -1
      }
    },
    {
      $out: 'tmp_user_aggregation'
    }
  ],
  { allowDiskUse: true }
);
