'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');
var gutil = require('gulp-util');

var argv = require('yargs')
  .option('skip-stage', {
    array: true,
    describe: 'skip a stage'
  })
  .help('help').argv;

function shouldSkip(stageName) {
  return argv['skip-stage'] && argv['skip-stage'].indexOf(stageName) >= 0;
}

function findStageTasks(config, stageName) {
  var items = Object.keys(config)
    .map(function(name) {
      return name + ':' + stageName;
    })
    .filter(function(fullName) {
      var hasTask = !!gulp.tasks[fullName];
      return hasTask;
    });

  return items;
}

var stageMetaData = {};

function configureTasks(config) {
  function createStageTask(stageName, previousStages) {
    if (shouldSkip(stageName)) return;

    if (!previousStages) previousStages = [];

    previousStages = previousStages.filter(function(name) {
      return !shouldSkip(name);
    });

    var preTaskName = 'pre-' + stageName;
    var postTaskName = 'post-' + stageName;

    var preSteps = findStageTasks(config, preTaskName);
    var steps = findStageTasks(config, stageName);
    var postSteps = findStageTasks(config, postTaskName);

    if (preSteps.length) {
      gulp.task(preTaskName, preSteps, function() {
        gutil.log(preTaskName + ' complete');
      });
    }

    if (postSteps.length) {
      gulp.task(postTaskName, postSteps, function() {
        gutil.log(postTaskName + ' complete');
      });
    }

    var metaData = {
      dep: previousStages
    };

    stageMetaData[stageName] = metaData;
    if (preSteps.length) {
      metaData.pre = preSteps;
    }

    if (steps.length) {
      metaData.main = steps;
    }

    if (postSteps.length) {
      metaData.post = postSteps;
    }

    gulp.task(stageName, previousStages, function(callback) {
      var seq = [];
      if (preSteps.length) {
        seq.push(preTaskName);
      }

      if (steps.length) {
        seq.push(steps);
      }

      if (postSteps.length) {
        seq.push(postTaskName);
      }

      if (seq.length === 0) {
        return callback();
      }

      gutil.log('Starting ' + stageName + ' stage', seq);

      seq.push(function(err) {
        if (err) {
          gutil.log('Stage ' + stageName + ' failed');
        } else {
          gutil.log('Stage ' + stageName + ' complete');
        }

        callback(err);
      });

      runSequence.apply(null, seq);
    });
  }

  gulp.task('display-stages', function() {
    gutil.log('-------------------');
    gutil.log('Stages');
    gutil.log('-------------------');
    Object.keys(stageMetaData).forEach(function(stageName) {
      var meta = stageMetaData[stageName];
      gutil.log('+', stageName);
      if (meta.dep && meta.dep.length) {
        gutil.log('   Dependencies:');
        meta.dep.forEach(function(m) {
          gutil.log('     ' + m);
        });
      }
      if (meta.pre && meta.pre.length) {
        gutil.log('   Pre-steps:');
        meta.pre.forEach(function(m) {
          gutil.log('     ' + m);
        });
      }

      if (meta.main && meta.main.length) {
        gutil.log('   Main:');
        meta.main.forEach(function(m) {
          gutil.log('     ' + m);
        });
      }

      if (meta.post && meta.post.length) {
        gutil.log('   Post-steps:');
        meta.post.forEach(function(m) {
          gutil.log('     ' + m);
        });
      }
    });
  });

  /**
   * ------------------------------------------------
   * Stage Definitions:
   * ------------------------------------------------
   */

  /**
   * Validation stage: is everything as we expect it to be
   * before kicking off the build
   */
  createStageTask('validate');

  /**
   * Test stage: does the code do what it should?
   */
  createStageTask('test');

  /**
   * Compile stage: process the code into a new form
   */
  createStageTask('compile', ['test', 'validate']);

  /**
   * Assemble stage: gather all the files
   */
  createStageTask('assemble', ['compile']);

  /**
   * Package stage: create packaged artifacts
   */
  createStageTask('package', ['assemble']);

  /**
   * Clean stage: clean the environment
   */
  createStageTask('clean');

  /**
   * Watch stage: watch the development environment and
   * reload if required
   */
  createStageTask('watch');

  gulp.task('default', ['package']);
}

module.exports = configureTasks;
