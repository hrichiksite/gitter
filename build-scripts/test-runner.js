'use strict';

var childProcessPromise = require('./child-process-promise');
var path = require('path');
var es = require('event-stream');
var gutil = require('gulp-util');

function resolveBinary(moduleName) {
  var moduleLocation = require.resolve(moduleName);
  var moduleDirectory = path.dirname(moduleLocation);
  return path.resolve(moduleDirectory, '../.bin/' + moduleName);
}

function serializeCompilers(compilers) {
  if (!compilers) return;
  return Object.keys(compilers)
    .map(function(extension) {
      var m = compilers[extension];
      return extension + ':' + m;
    })
    .join(',');
}

function testRunner(options, files) {
  var executable;
  var args;
  var mochaBinary = resolveBinary('mocha');

  function pushBooleanArg(argName, bool) {
    if (bool) {
      args.push(argName);
    }
  }

  function pushArg(argName, value) {
    if (value) {
      args.push(argName);
      args.push(value);
    }
  }

  function addMultiArgs(argName, extensions) {
    if (!extensions) return;
    extensions.forEach(function(ext) {
      args.push(argName);
      args.push(ext);
    });
  }

  function addOptional(options, argName, keyName) {
    if (options.hasOwnProperty(keyName)) {
      args.push(argName);
      args.push(options[keyName]);
    }
  }

  if (options.nyc) {
    var nyc = options.nyc;
    executable = resolveBinary('nyc');
    args = [];

    pushBooleanArg('--cache', nyc.cache);
    pushArg('--report-dir', nyc.reportDir);
    pushArg('--reporter', nyc.reporter);
    addMultiArgs('--extension', nyc.extensions);
    addMultiArgs('--require', nyc.requires);
    addOptional(nyc, '--instrument', 'instrument');
    addOptional(nyc, '--source-map', 'sourceMap');
    args.push(mochaBinary);
  } else {
    executable = mochaBinary;
    args = [];
  }

  pushArg('-R', options.reporter);
  pushBooleanArg('--recursive', options.recursive);
  pushArg('--grep', options.grep);
  pushBooleanArg('--invert', options.invert);
  pushBooleanArg('--bail', options.invert);
  pushArg('--timeout', options.timeout);
  pushArg('--compilers', serializeCompilers(options.compilers));

  args = args.concat(files);

  gutil.log('Spawning ', executable, args.join(' '));
  return childProcessPromise.spawn(executable, args, options.env);
}

function pipe(options) {
  var files = [];
  return es.through(
    function(data) {
      files.push(data.path);
      // console.log(data);
      this.emit('data', data);
    },
    function() {
      testRunner(options, files)
        .bind(this)
        .then(function() {
          this.emit('end');
        })
        .catch(function(err) {
          this.emit('error', err);
        });
    }
  );
}

module.exports = pipe;
