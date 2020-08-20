'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
var stats = env.stats;
const config = env.config;
var Processor = require('gitter-markdown-processor');
var shutdown = require('shutdown');
var Promise = require('bluebird');

const camoUrl = config.get('camo:camoUrl');
const camoSecret = config.get('camo:camoSecret');

// processor starts its own process, so lazy load it
var processor;

function createProcessor() {
  const p = new Processor({
    camoUrl,
    camoSecret
  });

  shutdown.addHandler('markdown_cluster', 1, function(callback) {
    p.shutdown(callback);
  });

  return p;
}

function processText(markdown) {
  if (!processor) {
    processor = createProcessor();
  }

  return new Promise(function(resolve, reject) {
    processor.process(markdown, function(err, result) {
      if (err) {
        stats.event('markdown.failure');
        errorReporter(
          err,
          { text: markdown, processed: !!result },
          { module: 'markdown-processor' }
        );

        if (result) {
          // hey, at least we got a result!
          // ... pretend it never happened
          return resolve(result);
        } else {
          return reject(err);
        }
      }

      return resolve(result);
    });
  });
}

module.exports = processText;
