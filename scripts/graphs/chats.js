'use strict';

var graphviz = require('graphviz');
var fs = require('fs');

var persistenceService = require('gitter-web-persistence');

// Create digraph G
var g = graphviz.digraph('G');

var ONE_TO_ONE_EDGE_COLOR = '#0000ff';

var d1 = new Date('13 Nov 2014');
var d2 = new Date('20 Nov 2014');

persistenceService.ChatMessage.aggregate([
  {
    $match: {
      $and: [{ sent: { $gt: d1 } }, { sent: { $lt: d2 } }]
    }
  },
  {
    $group: {
      _id: {
        userId: '$fromUserId',
        room: '$toTroupeId'
      },
      count: {
        $sum: 1
      }
    }
  }
])
  .exec()
  .then(function(chats) {
    chats.forEach(function(c) {
      g.addNode('' + c._id.userId, { shape: 'point' });
      g.addNode('' + c._id.room, { shape: 'point' });
      g.addEdge('' + c._id.userId, '' + c._id.room, {
        color: ONE_TO_ONE_EDGE_COLOR,
        arrowhead: 'none',
        weight: c.count
      });
    });

    fs.writeFileSync('chats2.dot', g.to_dot());
    // g.output( "png", "test01.png" );
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
