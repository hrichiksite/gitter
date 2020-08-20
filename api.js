/*jslint node: true */
'use strict';

var env = require('gitter-web-env');
env.installUncaughtExceptionHandler();

require('./server/api');
