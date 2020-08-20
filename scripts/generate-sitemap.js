#!/usr/bin/env node

'use strict';

var env = require('gitter-web-env');
var nconf = env.config;

var persistence = require('gitter-web-persistence');
var fs = require('fs');
var BatchStream = require('batch-stream');
var through2Concurrent = require('through2-concurrent');
var basePath = nconf.get('web:basepath');
var sitemapLocation = nconf.get('sitemap:location');

var opts = require('yargs')
  .option('tempdir', {
    alias: 't',
    required: true,
    description: 'Where to write the sitemap files to'
  })
  .option('name', {
    alias: 'n',
    required: true,
    description: 'What to call the sitemap (ie. the prefix)'
  })
  .help('help')
  .alias('help', 'h').argv;

function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

function roomToURL(room) {
  return basePath + '/' + room.uri + '/archives';
}

function createSitemap(urls) {
  var xml = [];
  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  urls.forEach(function(url) {
    xml.push('<url>');
    xml.push('<loc>' + url + '</loc>');
    xml.push('<changefreq>daily</changefreq>');
    xml.push('</url>');
  });
  xml.push('</urlset>');
  return xml.join('\n');
}

function createSitemapIndex(urls) {
  var xml = [];

  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push(
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
      'xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" ' +
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
  );

  urls.forEach(function(url) {
    xml.push('<sitemap>');
    xml.push('<loc>' + url + '</loc>');
    xml.push('</sitemap>');
  });

  xml.push('</sitemapindex>');
  return xml.join('\n');
}

var pageNum = 0;
var sitemapURLs = [];
var query = {
  security: 'PUBLIC',
  $or: [{ noindex: { $exists: false } }, { noindex: false }]
};
var projection = { _id: 1, uri: 1 };
persistence.Troupe.find(query, projection)
  .sort({ _id: 1 })
  .slaveOk()
  .stream()
  .pipe(new BatchStream({ size: 50000 }))
  .pipe(
    through2Concurrent.obj({ maxConcurrency: 10 }, function(rooms, enc, callback) {
      pageNum++;
      sitemapURLs.push(sitemapLocation.replace('.xml', '-' + pageNum + '.xml'));
      var sitemap = createSitemap(rooms.map(roomToURL));
      fs.writeFile(opts.tempdir + '/' + opts.name + '-' + pageNum + '.xml', sitemap, callback);
    })
  )
  .on('data', function() {})
  .on('end', function() {
    var indexData = createSitemapIndex(sitemapURLs);
    fs.writeFile(opts.tempdir + '/' + opts.name + '.xml', indexData, function() {
      process.exit(0);
    });
  })
  .on('error', die);
