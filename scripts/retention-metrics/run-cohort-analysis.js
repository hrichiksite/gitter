#!/usr/bin/env node
'use strict';

var moment = require('moment');
var mongodb = require('mongodb');
var Db = mongodb.Db;
var Server = mongodb.Server;
var utils = require('./cohort-utils');
var _ = require('lodash');

function die(err) {
  console.error('ERROR');
  console.error(err);
  console.error(err.stack);
  process.exit(1);
}

var opts = require('yargs')
  .option('daily', {
    alias: 'd',
    type: 'boolean',
    required: false,
    description: 'Perform daily analysis',
    default: false
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    required: false,
    description: 'Verbose',
    default: false
  })
  .option('start', {
    alias: 's',
    required: false,
    description: 'Start date'
  })
  .option('moduleName', {
    alias: 'm',
    required: false,
    default: 'user-rooms',
    description: 'Analysis module'
  })
  .option('end', {
    alias: 'e',
    required: false,
    description: 'End date'
  })
  .option('count', {
    alias: 'e',
    required: false,
    description: 'Number of cohorts',
    default: 8,
    type: 'number'
  })
  .option('limit', {
    alias: 'l',
    required: false,
    description: 'Limit',
    type: 'number'
  })
  .option('unit', {
    alias: 'u',
    default: 'weeks',
    choices: ['days', 'weeks', 'day', 'week'],
    required: false,
    description: 'Unit for limit'
  })
  .option('percent', {
    alias: 'p',
    type: 'boolean',
    required: false,
    default: false,
    description: 'Output values as percentages'
  })
  .option('sort-subcohorts-by-size', {
    type: 'boolean',
    required: false,
    default: false,
    description: 'Arrange the subcohorts in descending order of size'
  })
  .help('help')
  .alias('help', 'h').argv;

opts.start = new Date(opts.start);
opts.end = new Date(opts.end);

function debug() {
  if (!opts.verbose) return;
  console.error.apply(console, arguments);
}

function printCSV(results, asPercent) {
  function showValue(value, total) {
    if (!total) return '';
    if (!value) value = 0;
    if (asPercent) {
      return ((value / total) * 100).toFixed(2);
    }

    return value;
  }

  results.forEach(function(cohort) {
    var cohortIntervalDates = Object.keys(cohort.totals).filter(function(f) {
      return f !== 'total';
    });
    var headerRow = [moment(cohort.cohortTimestamp).format('YYYY-MM-DD'), ''].concat(
      cohortIntervalDates.map(function(f) {
        return '+' + f;
      })
    );

    var totalRow = ['Total', cohort.totals.total].concat(
      cohortIntervalDates.map(function(cohortIntervalDate) {
        var value = cohort.totals[cohortIntervalDate];
        return showValue(value, cohort.totals.total);
      })
    );

    console.log(headerRow.join(','));
    console.log(totalRow.join(','));

    var subCohortsSorted = _(cohort.subcohorts)
      .keys()
      .value();

    if (opts['sort-subcohorts-by-size']) {
      subCohortsSorted.sort(function(a, b) {
        return cohort.subcohorts[b].total - cohort.subcohorts[a].total;
      });
    }

    subCohortsSorted.forEach(function(subcohortKey) {
      var subcohort = cohort.subcohorts[subcohortKey];
      var subcohortSize = subcohort.total;

      var subcohortRow = [subcohortKey, showValue(subcohortSize, cohort.totals.total)].concat(
        cohortIntervalDates.map(function(cohortIntervalDate) {
          var value = subcohort[cohortIntervalDate];
          return showValue(value, subcohortSize);
        })
      );

      console.log(subcohortRow.join(','));
    });
  });
}

// Establish connection to db
debug('Opening connection');
new Db('cube', new Server('cube.prod.gitter', 27017), { safe: false, slaveOk: true }).open(function(
  err,
  cubeDb
) {
  if (err) die(err);

  var limit;
  if (opts.limit) {
    limit = { amount: opts.limit, unit: opts.unit };
  }

  var Module = require('./' + opts.moduleName + '-cohort-analyser');

  var analyser = new Module(cubeDb, { daily: opts.daily, limit: limit, debug: debug });

  var start, end;
  if (opts.start) {
    start = moment(opts.start)
      .startOf('day')
      .toDate();
  } else {
    start = utils
      .getStartOfWeek(moment().startOf('day'))
      .subtract(opts.count, opts.unit)
      .toDate();
  }

  if (opts.end) {
    end = moment(opts.end)
      .startOf('day')
      .toDate();
  } else {
    end = utils.getStartOfWeek(moment().startOf('day')).toDate();
  }

  analyser.buildRetention(start, end, function(err, results) {
    if (err) return die(err);

    printCSV(results, opts.percent);
    process.exit(0);
  });
});
