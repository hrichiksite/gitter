'use strict';

if (require.main !== module) {
  console.log('This should only be executed standalone'); // eslint-disable-line
  process.exit(1);
}

var csv = require('fast-csv');

var metrics = require('datadog-metrics');
metrics.init({ prefix: 'build.benchmarks.' });

var os = require('os');

csv
  .fromStream(process.stdin, { headers: ['date', 'suite', 'benchmark', 'total', 'iterations'] })
  .on('data', function(data) {
    var benchmark = data.benchmark;
    if (!benchmark) return; // Ignore bad lines

    var tag = benchmark.replace(/^.*#/, '');
    var tags = ['benchmark_host:' + os.hostname()]; // Can't use host

    if (process.env.GIT_COMMIT) tags.push('commit:' + process.env.GIT_COMMIT);
    if (process.env.GIT_BRANCH) tags.push('branch:' + process.env.GIT_BRANCH);
    if (tag) tags.push('test:' + tag);

    var metric = data.suite + '.' + benchmark.replace(/#.*/, '');
    var total = parseFloat(data.total);
    var iterations = parseInt(data.iterations, 10);
    var avg = total / iterations;

    if (isNaN(avg)) return; // Ignore bad lines

    metrics.gauge(metric, avg, tags);
  })
  .on('end', function() {
    metrics.flush();
  });
