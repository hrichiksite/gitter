'use strict';

require('./utils/webpack');
require('gitter-web-client-context');

require('./utils/log');
require('./components/api-client');

// Polyfills
require('core-js/stable/object/assign');
require('core-js/stable/object/values');
require('core-js/stable/array/find');
require('core-js/stable/promise');
require('intersection-observer');
