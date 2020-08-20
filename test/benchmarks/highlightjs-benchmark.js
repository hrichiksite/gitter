'use strict';

var Processor = require('gitter-markdown-processor');
var fs = require('fs');
var makeBenchmark = require('../make-benchmark');

var processor;

function makeTests() {
  var tests = {};

  var files = fs.readdirSync(__dirname + '/testfiles/markdown');
  files.forEach(function(file) {
    // ignore hidden files like .DS_Store
    if (file.indexOf('.') === 0) return;
    var md = fs.readFileSync(__dirname + '/testfiles/markdown/' + file, 'utf8');

    tests['highlight#' + file] = function(done) {
      processor.process(md, done);
    };
  });

  return tests;
}

makeBenchmark({
  before: function(done) {
    processor = new Processor();
    var i = 0;
    (function warmup() {
      if (++i > 100) {
        return done();
      }
      processor.process('```\nwarmup;```', warmup);
    })();
  },
  tests: makeTests()
});
