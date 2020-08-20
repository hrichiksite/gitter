#!/usr/bin/env node
'use strict';

const Promise = require('bluebird');
const express = require('express');
const fs = require('fs-extra');
const outputFile = Promise.promisify(fs.outputFile);
const expressHbs = require('express-hbs');
const resolveStatic = require('../server/web/resolve-static');
require('../server/web/register-helpers')(expressHbs);
const shutdown = require('shutdown');

var opts = require('yargs')
  .option('output', {
    alias: 'o',
    required: true,
    description: 'Output'
  })
  .option('android', {
    type: 'boolean',
    default: false,
    description: 'Output'
  })
  .help('help')
  .alias('help', 'h').argv;

function die(err) {
  console.error('Unable to render', err);
  process.exit(1);
}

const app = express();

app.engine(
  'hbs',
  expressHbs.express3({
    partialsDir: resolveStatic('/templates/partials'),
    onCompile: function(exhbs, source) {
      return exhbs.handlebars.compile(source, { preventIndent: true });
    },
    layoutsDir: resolveStatic('/layouts'),
    contentHelperName: 'content'
  })
);

app.set('view engine', 'hbs');
app.set('views', resolveStatic('/templates'));

app.render(
  'mobile/native-embedded-chat-app',
  {
    isAndroidBuild: opts.android
  },
  function(err, html) {
    if (err) {
      die(err);
    }

    outputFile(opts.output, html, { encoding: 'utf8' })
      .catch(die)
      .then(() => {
        shutdown.shutdownGracefully();
      });
  }
);
