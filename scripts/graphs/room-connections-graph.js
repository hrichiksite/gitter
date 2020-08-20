#!/usr/bin/env node
'use strict';

var graphviz = require('graphviz');
var fs = require('fs');
var Promise = require('bluebird');
var persistenceService = require('gitter-web-persistence');
var mongoose = require('gitter-web-mongoose-bluebird');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var AggrSchema = new Schema(
  {
    troupeId1: { type: ObjectId },
    troupeId2: { type: ObjectId },
    commonUsers: { type: Number }
  },
  { collection: 'tmp_user_aggregation' }
);

function findTopRooms() {
  return persistenceService.Troupe.find({}, 'uri')
    .sort({ userCount: -1 })
    .limit(5000)
    .lean()
    .exec()
    .then(function(rooms) {
      return rooms.reduce(function(memo, room) {
        memo[room._id] = room.uri;
        return memo;
      }, {});
    });
}

function getWeight(x) {
  if (x < 1000) return 1;
  if (x < 2000) return 2;
  if (x < 3000) return 3;
  if (x < 4000) return 4;
  return 5;
}

// Create digraph G
function makeGraph(topRooms) {
  return new Promise(function(resolve, reject) {
    var g = graphviz.digraph('G');
    var c = 0;
    var Model = mongoose.model('AggrSchema', AggrSchema);
    Model.find()
      .select('troupeId1 troupeId2 commonUsers')
      .lean()
      .limit(5000)
      .stream()
      .on('data', function(x) {
        c++;
        if (c % 1000 === 0) console.log(c);
        var uri1 = topRooms[x.troupeId1];
        var uri2 = topRooms[x.troupeId2];
        g.addNode('' + x.troupeId1, { label: uri1 || '' });
        g.addNode('' + x.troupeId2, { label: uri2 || '' });
        var weight = getWeight(x.commonUsers);
        g.addEdge('' + x.troupeId1, '' + x.troupeId2, { weight: weight });
      })
      .on('error', reject)
      .on('end', function() {
        fs.writeFileSync(
          'room-connections-' + new Date().toISOString().replace(/:/g, '_') + '.dot',
          g.to_dot()
        );
        resolve();
      });
  });
}

findTopRooms()
  .then(makeGraph)
  .then(function() {
    process.exit();
  })
  .done();
