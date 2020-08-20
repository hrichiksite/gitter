'use strict';

var gitterEnv = require('@gitterhq/env');
var path = require('path');

var configPath = path.join(__dirname, '..', '..', '..', 'config');

/* Create a singleton environment */
module.exports = gitterEnv.create(configPath);
