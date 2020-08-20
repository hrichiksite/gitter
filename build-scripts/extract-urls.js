'use strict';

var postcss = require('postcss');
var fs = require('fs');
var path = require('path');
var reduceFunctionCall = require('reduce-function-call');
var url = require('url');

function extractUrls(input, basePath) {
  var resources = {};

  function getFileName(value) {
    var u = url.parse(value);
    if (u.protocol || u.hostname) return value;

    value = u.pathname;

    if (value.indexOf('.') === 0) {
      var inputRelativeDir = path.dirname(path.relative(basePath, input));
      var relativeToPublicFilePath = path.join(inputRelativeDir, value);
      return path.join('public', relativeToPublicFilePath);
    }

    return value;
  }

  var css = postcss.parse(fs.readFileSync(input));

  css.eachDecl(function(decl) {
    if (!decl.value) return;

    if (decl.prop !== 'src' || decl.parent.name !== 'font-face') return;

    if (!decl.parent.decls) return;

    var d = decl.parent.decls.filter(function(d) {
      return d.prop === 'src' && d.parent.name === 'font-face';
    });

    if (!d.length) return;

    // var hasTtf = d.filter(function(x) {
    //   return x.value.indexOf('.ttf') >= 0;
    // });

    // if(hasTtf.length) {
    //   decl.parent.decls = hasTtf;
    // }
  });

  css.eachDecl(function(decl) {
    if (!decl.value) return;

    var urls = [];

    reduceFunctionCall(decl.value, 'url', function(value) {
      var m = /^['"]([^'"]*)['"]$/.exec(value);
      if (m) value = m[1];

      value = getFileName(value);

      urls.push(value);
    });

    if (decl.prop === 'src' && decl.parent.name === 'font-face') {
      // If there are multiple fonts, choose the ttf
      var ttfs = urls.filter(function(v) {
        return /\.ttf/.test(v);
      });

      if (ttfs.length > 0) {
        urls = ttfs;
      }
    }

    urls.forEach(function(value) {
      resources[value] = true;
    });
  });

  return Object.keys(resources);
}

module.exports = extractUrls;
