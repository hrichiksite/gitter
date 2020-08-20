'use strict';

var gulp = require('gulp');
var postCssTransform = require('./postcss-transform');
var styleBuilder = require('./style-builder');
var getSourceMapOptions = require('./get-sourcemap-options');
var cssDestDir = 'output/assets/styles';
var cssWatchGlob = 'public/**/*.less';

gulp.task('css:compile', ['css:compile:mobile', 'css:compile:desktop']);

var cssMobileStyleBuilder = styleBuilder(
  [
    // ...
    // 'public/less/mobile-app.less'
  ],
  {
    dest: cssDestDir,
    watchGlob: cssWatchGlob,
    sourceMapOptions: getSourceMapOptions(),
    lessOptions: {
      paths: ['public/less'],
      globalVars: {
        'target-env': '"mobile"'
      }
    },
    streamTransform: function(stream) {
      return stream.pipe(
        postCssTransform({
          browsers: [
            'last 4 ios_saf versions',
            'last 4 and_chr versions',
            'last 4 and_ff versions',
            'last 2 ie_mob versions'
          ]
        })
      );
    }
  }
);

gulp.task('css:compile:mobile', function() {
  return cssMobileStyleBuilder.build();
});

var cssWebStyleBuilder = styleBuilder(
  [
    'public/less/trpAppsPage.less',
    'public/less/error-page.less',
    'public/less/error-layout.less',
    'public/less/generic-layout.less',
    'public/less/trpHooks.less',
    'public/less/login.less',
    'public/less/login-upgrade-landing.less',
    'public/less/explore.less',
    'public/less/router-chat.less',
    'public/less/router-app.less',
    'public/less/router-nli-chat.less',
    'public/less/router-embed-chat.less',
    'public/less/router-nli-embed-chat.less',
    'public/less/router-archive-home.less',
    'public/less/router-archive-links.less',
    'public/less/router-archive-chat.less',
    'public/less/router-admin-dashboard.less',
    'public/less/homepage.less',
    'public/less/userhome.less',
    'public/less/org-page.less',
    'public/less/dark-theme.less'
  ],
  {
    dest: cssDestDir,
    watchGlob: cssWatchGlob,
    sourceMapOptions: getSourceMapOptions(),
    lessOptions: {
      paths: ['public/less'],
      globalVars: {
        'target-env': '"web"'
      }
    },
    streamTransform: function(stream) {
      return stream.pipe(
        postCssTransform({
          browsers: ['Safari >= 5', 'last 4 Firefox versions', 'last 4 Chrome versions', 'IE >= 10']
        })
      );
    }
  }
);

gulp.task('css:compile:desktop', function() {
  return cssWebStyleBuilder.build();
});

gulp.task('css:watch', function() {
  cssWebStyleBuilder.build();
  cssMobileStyleBuilder.build();

  cssMobileStyleBuilder.startWatching();
  cssWebStyleBuilder.startWatching();
});
