/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */
'use strict';

var Benchmark = require('benchmark');
var benchmarks = require('beautify-benchmark');
var metrics = require('datadog-metrics');
var os = require('os');
var path = require('path');

var benchmarkName = path.basename(module.parent.filename, '.js');

var submitToDatadog = process.env.DATADOG_API_KEY;

if (submitToDatadog) {
  metrics.init({ prefix: 'build.benchmarks.' });
}

function submitDatadogMetrics(stats) {
  var tags = ['benchmark_host:' + os.hostname()]; // Can't use host
  if (process.env.GIT_BRANCH) tags.push('branch:' + process.env.GIT_BRANCH);

  metrics.gauge(benchmarkName + '.' + stats.name, stats.mean, tags);
  metrics.flush();
}

function targetStats(target) {
  return {
    name: target.name,
    hz: target.hz,
    size: target.stats.sample.length,
    mean: target.stats.mean
  };
}

process.on('uncaughtException', function(err) {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});

module.exports = function makeBenchmark(options) {
  var suite = new Benchmark.Suite();

  Object.keys(options.tests).forEach(function(name) {
    var fn = options.tests[name];

    if (fn.length === 0) {
      suite.add(name, {
        maxTime: options.maxTime || 2,
        initCount: options.initCount || 1,
        fn: fn
      });
    } else {
      suite.add(name, {
        maxTime: options.maxTime || 2,
        initCount: options.initCount || 1,
        defer: true,
        fn: function(deferred) {
          fn(function(err) {
            if (err) throw err;
            deferred.resolve();
          });
        }
      });
    }
  });

  suite.on('cycle', function(event) {
    var target = event.target;
    if (submitToDatadog) {
      submitDatadogMetrics(targetStats(target));
    }

    benchmarks.add(target);
  });

  suite.on('complete', function() {
    function doAfter(callback) {
      if (!options.after) return callback();

      if (options.after.length === 0) {
        try {
          options.after();
        } catch (err) {
          callback(err);
        }
        return;
      }

      options.after(callback);
    }

    doAfter(function() {
      benchmarks.log();

      if (submitToDatadog) {
        // Give datadog a second to flush
        setTimeout(function() {
          process.exit();
        }, 2000);
        return;
      }
      process.exit();
    });
  });

  var before = options.before;

  if (!before) {
    suite.run({ async: true });
    return;
  }

  if (before.length === 0) {
    before();
    suite.run({ async: true });
    return;
  }

  before(function(err) {
    if (err) throw err;
    suite.run({ async: true });
  });
};
