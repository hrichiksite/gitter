'use strict';
load('./csv.js');
rs.slaveOk();

var d0 = new Date('2016-08-01T00:00:00Z');
var d1 = new Date('2016-09-01T00:00:00Z');
var d2 = new Date('2016-10-01T00:00:00Z');

// var horizonTimestamp = Date.now() - 86400000 * 31;

function getStat(tag, start, end) {
  var e = db.tagsynonyms.find({ synonym: tag }).map(function(f) {
    return f.name;
  });
  var bases = [tag].concat(e);
  var synonyms = db.tagsynonyms.find({ name: { $in: bases } }).map(function(f) {
    return f.synonyms;
  });
  if (synonyms) {
    synonyms.forEach(function(s) {
      s.forEach(function(q) {
        bases.push(q);
      });
    });
  }

  var troupeIds = db.troupes.find({ tags: { $in: bases } }, { _id: 1 }).map(function(f) {
    return f._id;
  });

  var aggr = db.chatmessages.aggregate([
    {
      $match: {
        _id: {
          $gt: createIdForTimestampString(start),
          $lt: createIdForTimestampString(end)
        },
        $and: [
          {
            toTroupeId: { $in: troupeIds },
            sent: {
              $gt: new Date(start),
              $lt: new Date(end)
            }
          },
          {
            sent: { $type: 'date' }
          }
        ]
      }
    },
    {
      $group: {
        _id: 1,
        userIds: { $addToSet: '$fromUserId' },
        roomIds: { $addToSet: '$toTroupeId' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        userIds: { $size: '$userIds' },
        roomIds: { $size: '$roomIds' },
        count: 1
      }
    }
  ]);

  return aggr.toArray()[0];
}

var tags = [
  'JavaScript',
  'Java',
  'Android',
  'Python',
  'C#',
  'PHP',
  'JQuery',
  'C++',
  'HTML',
  'iOS',
  'CSS',
  'C',
  'Git',
  'MySQL',
  'AngularJS',
  'SQL',
  'dotNET',
  'Swift',
  'Objective-C',
  'Node.js',
  'R',
  'Ruby'
].map(function(f) {
  return f.toLowerCase();
});

print(['tag', 'p1-users', 'p1-rooms', 'p1-msgs', 'p0-users', 'p0-rooms', 'p0-count'].join(','));

tags.forEach(function(tag) {
  var s = getStat(tag, d1, d2);
  var t = getStat(tag, d0, d1);
  print([tag, s.userIds, s.roomIds, s.count, t.userIds, t.roomIds, t.count].join(','));
});
