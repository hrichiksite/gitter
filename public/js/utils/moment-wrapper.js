'use strict';

/* This require looks HORRIBLE, but it's a way to use the non-aliased moment */
/* Webpack config will alias all usages of moment to this module */
var realMoment = require('../../../node_modules/moment');
var context = require('gitter-web-client-context');

realMoment.locale(context.lang());
realMoment.defaultFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

module.exports = realMoment;
