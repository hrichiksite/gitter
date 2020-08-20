'use strict';

var graphviz = require('graphviz');
var fs = require('fs');

var persistenceService = require('gitter-web-persistence');

// Create digraph G
var g = graphviz.digraph('G');

var COLOR1 = '#00d1a0';
var COLOR2 = '#fe0063';
var COLOR3 = '#ff8d3e';

persistenceService.Troupe.find({}, 'oneToOne users.userId githubType security uri')
  .exec()
  .then(function(rooms) {
    rooms.forEach(function(room) {
      if (room.oneToOne) {
        if (room.users[0] && room.users[1]) {
          var userId1 = room.users[0].userId;
          var userId2 = room.users[1].userId;
          if (userId1 && userId2) {
            g.addNode('' + userId1, { shape: 'point', color: COLOR1 });
            g.addNode('' + userId2, { shape: 'point', color: COLOR1 });

            g.addEdge('' + userId1, '' + userId2, { color: COLOR1, arrowhead: 'none' });
            // g.addEdge("" + userId2, "" + userId1);
          }
        }
      } else {
        if (!room.users || !room.users.length) return;
        var color;
        if (
          room.githubType === 'ORG' ||
          room.security === 'PRIVATE' ||
          room.security === 'INHERITED'
        ) {
          color = COLOR2;
        } else {
          color = COLOR3;
        }

        // if(room.users.length > 100) {
        //   g.addNode("" + room.id, { shape: "point", label: room.uri });
        // } else {
        g.addNode('' + room.id, { shape: 'point', color: color });
        // }

        room.users.forEach(function(roomUser) {
          if (roomUser.userId) {
            g.addNode('' + roomUser.userId, { shape: 'point', color: COLOR1 });
            g.addEdge('' + roomUser.userId, '' + room.id, { color: color, arrowhead: 'none' });
          }
        });
      }
    });

    fs.writeFileSync('prod2.dot', g.to_dot());
    // g.output( "png", "test01.png" );
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
