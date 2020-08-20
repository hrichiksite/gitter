'use strict';

var path = require('path');
var simpleGit = require('simple-git')();
var parse = require('parse-diff');
var es = require('event-stream');
var vinylFile = require('vinyl-file');
var Promise = require('bluebird');

function filterFiles(baseBranch) {
  var changedPromise = new Promise(function(resolve, reject) {
    simpleGit.diff([baseBranch], function(err, diff) {
      if (err) return reject(err);

      var result = parse(diff);

      var changedLines = {};
      result.forEach(function(file) {
        var absPath = path.resolve(file.to);
        var diffLine = 0;
        changedLines[absPath] = {};
        file.chunks.forEach(function(chunk) {
          chunk.changes.forEach(function(change) {
            diffLine++;
            if (change.add) {
              changedLines[absPath][change.ln] = diffLine;
            }
          });
        });
      });

      return resolve(changedLines);
    });
  });

  return es.map(function(data, callback) {
    changedPromise
      .then(function(changedLines) {
        if (!changedLines[data.path]) return;
        if (data.content) {
          data.eslintFileChanges = changedLines[data.path];
          return data;
        }

        return vinylFile.read(data.path).then(function(data) {
          data.eslintFileChanges = changedLines[data.path];
          return data;
        });
      })
      .then(function(result) {
        return callback(null, result);
      }, callback);
  });
}

function filterMessages() {
  return es.map(function(data, callback) {
    var eslintData = data.eslint;
    var eslintFileChanges = data.eslintFileChanges;
    var messages = eslintData && eslintData.messages;

    if (!eslintFileChanges) {
      return callback(null, data);
    }

    if (messages && messages.length) {
      messages = messages.filter(function(message) {
        return eslintFileChanges[message.line];
      });

      eslintData.messages = messages;
      var counts = messages.reduce(
        function(memo, message) {
          switch (message.severity) {
            case 1:
              memo.warningCount++;
              break;

            case 2:
              memo.errorCount++;
              break;
          }
          return memo;
        },
        {
          errorCount: 0,
          warningCount: 0
        }
      );

      eslintData.errorCount = counts.errorCount;
      eslintData.warningCount = counts.warningCount;
    }

    callback(null, data);
  });
}

module.exports = {
  filterFiles: filterFiles,
  filterMessages: filterMessages
};
