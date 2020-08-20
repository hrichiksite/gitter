'use strict';

var gulp = require('gulp');
var argv = require('yargs').argv;
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var jsonlint = require('gulp-jsonlint');
var gulpIf = require('gulp-if');
var fs = require('fs-extra');
var mkdirp = require('mkdirp');
var github = require('gulp-github');
var eslintFilter = require('./eslint-filter');
var del = require('del');

const JS_GLOBS = [
  '**/*.js',
  '**/*.vue',
  '!node_modules/**',
  '!node_modules_linux/**',
  '!public/repo/**'
];

function guessBaseBranch() {
  var branch = process.env.CI_COMMIT_REF_NAME || process.env.GIT_BRANCH;
  if (!branch) return 'develop';

  if (branch.match(/\bfeature\//)) return 'origin/develop';

  return 'origin/master';
}

gulp.task('linter:validate:config', function() {
  return gulp
    .src(['config/*.json'])
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failOnError());
});

// Full eslint
gulp.task('linter:validate:eslint', function() {
  mkdirp.sync('output/eslint/');
  return gulp
    .src(JS_GLOBS)
    .pipe(
      eslint({
        quiet: argv.quiet,
        fix: argv.fix,
        extensions: ['.js', '.vue']
      })
    )
    .pipe(eslint.format('unix'))
    .pipe(
      eslint.format('checkstyle', function(checkstyleData) {
        fs.writeFileSync('output/eslint/checkstyle.xml', checkstyleData);
      })
    )
    .pipe(gulpIf(file => file.eslint != null && file.eslint.fixed, gulp.dest('./')))
    .pipe(eslint.failAfterError());
});

// eslint of the diff
gulp.task('linter:validate:eslint-diff', function() {
  var baseBranch = process.env.BASE_BRANCH || guessBaseBranch();
  gutil.log('Performing eslint comparison to', baseBranch);

  var eslintPipe = gulp
    .src(JS_GLOBS, { read: false })
    .pipe(eslintFilter.filterFiles(baseBranch))
    .pipe(
      eslint({
        quiet: argv.quiet
      })
    )
    .pipe(eslintFilter.filterMessages())
    .pipe(eslint.format('unix'));

  if (
    process.env.SONARQUBE_GITHUB_ACCESS_TOKEN &&
    process.env.ghprbPullId &&
    process.env.GIT_COMMIT
  ) {
    eslintPipe = eslintPipe.pipe(
      github({
        git_token: process.env.SONARQUBE_GITHUB_ACCESS_TOKEN,
        git_repo: 'troupe/gitter-webapp',
        git_prid: process.env.ghprbPullId,
        git_sha: process.env.GIT_COMMIT
      })
    );
  }

  return eslintPipe;
});

/**
 * Hook into the validate phase
 */
gulp.task('linter:validate', [
  'linter:validate:config',
  'linter:validate:eslint'
  // 'linter:validate:eslint-diff',
]);

gulp.task('linter:clean', function(cb) {
  del(['output/'], cb);
});
