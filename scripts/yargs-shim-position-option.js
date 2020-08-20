'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;

// See https://github.com/yargs/yargs/issues/402
// This will shim the `.option({ position: x })` that was in `nomnom` but we are now using `yargs`
var shimPositionOption = function(optionsOpts) {
  var opts = _.extend({}, optionsOpts);

  if (opts.hasOwnProperty('position') && opts.position < argv._.length) {
    opts.default = opts.default || argv._[opts.position];
  }

  return opts;
};

module.exports = shimPositionOption;
