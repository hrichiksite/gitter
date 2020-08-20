'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var runSequence = require('run-sequence');
var using = require('gulp-using');
var codecov = require('gulp-codecov');
var lcovMerger = require('lcov-result-merger');
var path = require('path');
var mkdirp = require('mkdirp');
var glob = require('glob');
var childProcessPromise = require('./child-process-promise');
var del = require('del');
var Promise = require('bluebird');

var argv = require('yargs')
  .option('test-suite', {
    describe: 'test-suite to run',
    choices: ['local', 'mocha', 'docker'],
    default: 'local'
  })
  .option('test-fast', {
    describe: 'only run fast tests',
    boolean: true,
    default: false
  })
  .option('test-parallel', {
    describe: 'run tests in parallel',
    boolean: true,
    default: false
  })
  .option('test-coverage', {
    describe: 'generate coverage on tests',
    boolean: true,
    default: false
  })
  .option('test-bail', {
    describe: 'bail on first failure',
    boolean: true,
    default: false
  })
  .option('test-xunit-reports', {
    describe: 'generate xunit reports',
    boolean: true,
    default: false
  })
  .option('test-grep', {
    alias: 'g',
    describe: 'grep tests',
    type: 'string'
  })
  .option('test-critical-only', {
    describe: 'only test critical tests',
    boolean: true,
    default: false
  })
  .help('test-help').argv;

/* Don't do clean in gulp, use make */
var RUN_TESTS_IN_PARALLEL = argv['test-parallel'];
var generateCoverage = argv['test-coverage'];
var generateXUnitReports = argv['test-xunit-reports'];
var bail = argv['test-bail'];
var testSuite = argv['test-suite'];
var fast = argv['test-fast'];
var grep = argv['test-grep'];
var criticalOnly = argv['test-critical-only'];
const disableGitHubTests =
  process.env.DISABLE_GITHUB_TESTS && JSON.parse(process.env.DISABLE_GITHUB_TESTS);

var testModules = {};

var modulesWithTest = glob.sync('./modules/*/test');

modulesWithTest.forEach(function(testDir) {
  var moduleDir = path.dirname(testDir);
  var moduleName = path.basename(moduleDir);
  testModules[moduleName] = {
    files: [path.join('modules', moduleName, 'test')],
    isCritical: false
  };
});

testModules['request-tests'] = {
  files: ['./test/request-api-tests/', './test/request-web-tests/'],
  options: {
    // These tests load the entire app, so mocha will sometimes timeout before it even runs the tests
    timeout: 30000
  },
  isCritical: false
};

testModules.integration = {
  files: ['./test/integration/'],
  isCritical: true
};

// eslint-disable-next-line max-statements, complexity
function spawnMochaProcess(moduleName, options, files) {
  var executable;
  var args;

  var argReporter = 'spec';
  var argTimeout = (options && options.timeout) || 10000;
  var argBail = bail;

  var env = {
    SKIP_BADGER_TESTS: 1,
    BLUEBIRD_DEBUG: 1,
    NO_AUTO_INDEX: 1,
    TZ: 'UTC',
    GITTER_TEST: 1
  };

  if (generateCoverage) {
    executable = './node_modules/.bin/nyc';
    args = [
      '--cache',
      '--report-dir',
      'output/coverage-reports/' + moduleName,
      '--reporter',
      'lcov',
      './node_modules/.bin/mocha'
    ];

    mkdirp.sync('output/coverage-reports/' + moduleName);
  } else {
    executable = './node_modules/.bin/mocha';
    args = [];
  }

  // This is needed because Mocha no longer force exits, https://boneskull.com/mocha-v4-nears-release/#mochawontforceexit
  args.push('--exit');

  if (testSuite === 'docker') {
    env.HOME = '/tmp'; // Needs to be writeable inside docker for `nyc`
    env.NODE_ENV = 'test-docker';
  }

  var argGrep = grep;
  var argInvert = false;
  if (fast) {
    argGrep = '#slow';
    argInvert = true;
    argBail = true;
  } else if (disableGitHubTests) {
    argGrep = '#github';
    argInvert = true;
  }

  if (generateXUnitReports) {
    mkdirp.sync('output/test-reports/');

    argReporter = 'mocha-multi';
    env.multi = 'spec=- xunit=output/test-reports/' + moduleName + '.xml';
    gutil.log('Will write xunit reports to', 'output/test-reports/' + moduleName + '.xml');
  }

  args.push('--recursive');

  args.push('-R');
  args.push(argReporter);

  if (argGrep) {
    args.push('--grep');
    args.push(argGrep);
  }

  if (argBail) {
    args.push('--bail');
  }

  if (argInvert) {
    args.push('--invert');
  }

  args.push('--timeout');
  args.push(argTimeout);

  args = args.concat(files);
  gutil.log('Running tests with', executable, args.join(' '));

  return childProcessPromise.spawn(executable, args, env);
}

var subTasks = [];
var testingErrors = [];

Object.keys(testModules).forEach(function(moduleName) {
  var definition = testModules[moduleName];

  if (criticalOnly && !definition.isCritical) {
    return;
  }

  var testTaskName = 'test:test:' + moduleName;
  subTasks.push(testTaskName);

  gulp.task(testTaskName, function() {
    return spawnMochaProcess(moduleName, definition.options, definition.files).catch(function(err) {
      if (bail) {
        throw new Error('Test module ' + moduleName + ' failed. ' + err);
      }

      testingErrors.push(err);
    });
  });
});

subTasks.push('test:test:jest');
gulp.task('test:test:jest', function() {
  return childProcessPromise.spawn('npm', ['run', 'jest']);
});

gulp.task('test:pre-test', function() {
  var env = {};

  if (testSuite === 'docker') {
    env.NODE_ENV = 'test-docker';
  }

  return childProcessPromise.spawn('./scripts/utils/ensure-mongodb-indexes.js', [], env);
});

if (RUN_TESTS_IN_PARALLEL) {
  // Run tests in parallel
  gulp.task('test:test', subTasks, function() {
    if (testingErrors.length) {
      return Promise.reject(testingErrors[0]);
    }
  });
} else {
  // Run tests in sequence
  gulp.task('test:test', function(callback) {
    gutil.log('Run sequence for test:test', subTasks.join(','));

    var args = subTasks.concat(function(err) {
      if (err) return callback(err);

      if (testingErrors.length) {
        return callback(testingErrors[0]);
      }

      return callback();
    });

    runSequence.apply(null, args);
  });
}

/**
 * Hook into post test
 */
if (generateCoverage) {
  gulp.task('test:post-test', ['test:post-test:merge-lcov', 'test:post-test:submit-codecov']);
}

gulp.task('test:post-test:merge-lcov', function() {
  return gulp
    .src('output/coverage-reports/**/lcov.info')
    .pipe(using())
    .pipe(lcovMerger())
    .pipe(gulp.dest('output/coverage-reports/merged/'));
});

gulp.task('test:post-test:submit-codecov', ['test:post-test:merge-lcov'], function() {
  process.env.CODECOV_TOKEN = '4d30a5c7-3839-4396-a2fd-d8f9a68a5c3a';

  return gulp
    .src('output/coverage-reports/merged/lcov.info')
    .pipe(
      codecov({
        disable: 'gcov'
      })
    )
    .on('error', function(err) {
      gutil.log(err);
      this.emit('end');
    });
});

/**
 * Hook into the clean stage
 */
gulp.task('test:clean', function(cb) {
  del(['.nyc_output/'], cb);
});
