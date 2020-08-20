'use strict';

var gulp = require('gulp');
var path = require('path');
var gzip = require('gulp-gzip');
var tar = require('gulp-tar');
var git = require('gulp-git');
var fs = require('fs');
var mkdirp = require('mkdirp');
var childProcessPromise = require('./child-process-promise');

var argv = require('yargs')
  .option('inspect-node', {
    type: 'boolean',
    describe:
      'Remotely inspect the Node.js instance with Chrome devtools (adds the `--inspect` flag to the Node.js process)'
  })
  .help('help').argv;

/**
 * Hook into the package stage
 */
gulp.task('process:assemble', ['process:assemble:copy-app']);

/**
 * Hook into the post-package stage
 */
gulp.task('process:package', ['process:package:tarball']);

gulp.task('process:assemble:copy-app', [
  'process:assemble:copy-app:files',
  'process:assemble:copy-app:version'
]);

gulp.task('process:assemble:copy-app:files', function() {
  return gulp
    .src(
      [
        '.npmrc',
        'api.js',
        'web.js',
        'websockets.js',
        'package.json',
        'npm-shrinkwrap.json',
        'preinstall.sh',
        'config/**',
        'output/assets/js/webpack-manifest.json',
        'output/assets/js/vue-ssr-server-bundle.json',
        'public/templates/**',
        'public/layouts/**',
        'public/js/**',
        'scripts/**',
        'server/**',
        'shared/**',
        'modules/**'
      ],
      { base: '.', nodir: true }
    )
    .pipe(gulp.dest('output/app'));
});

gulp.task('process:assemble:copy-app:version', function(done) {
  git.revParse({ args: 'HEAD' }, function(err, commit) {
    if (err) return done(err);

    git.revParse({ args: '--short HEAD' }, function(err, hash) {
      if (err) return done(err);

      git.revParse({ args: '--abbrev-ref HEAD' }, function(err, branch) {
        if (err) return done(err);

        // Prefix the asset tag with an S
        if (process.env.STAGED_ENVIRONMENT === 'true') {
          hash = 'S' + hash;
        }

        // Use jenkins variables
        if (branch === 'HEAD' && process.env.CI_COMMIT_REF_SLUG) {
          branch = process.env.CI_COMMIT_REF_SLUG;
        }

        mkdirp.sync('output/app/');

        fs.writeFileSync('output/app/ASSET_TAG', hash);
        fs.writeFileSync('output/app/GIT_COMMIT', commit);
        fs.writeFileSync('output/app/VERSION', branch);
        done();
      });
    });
  });
});

gulp.task('process:package:tarball', function() {
  return gulp
    .src(['output/app/**'], { stat: true })
    .pipe(tar('app.tar'))
    .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
    .pipe(gulp.dest('output'));
});

gulp.task('process:watch:server', function() {
  var nodemon = require('gulp-nodemon');

  nodemon({
    debug: true,
    script: 'web.js',
    ignore: [
      path.resolve(__dirname, '../modules/api-client'),
      path.resolve(__dirname, '../modules/web-push/browser'),
      path.resolve(__dirname, '../modules/web-push/service-worker'),
      '**/test/**'
    ],
    args: ['--cdn:use', 'true'],
    nodeArgs: argv.inspectNode ? ['--inspect'] : []
  });
});

gulp.task('process:watch:static', function() {
  return childProcessPromise.fork('./server/static', [], {
    SERVE_STATIC_ASSETS: 1,
    PORT: 5001
  });
});

gulp.task('process:watch', ['process:watch:server', 'process:watch:static'], function() {});
