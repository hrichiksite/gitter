'use strict';

var async = require('async');
var env = require('gitter-web-env');
var logger = env.logger;

/**
 * Useful datastructure for iterating up and down arrays
 *
 * Stage 1: iterate down the array, calling downstream in series until a non-error, non-null result is obtained
 * Stage 2: In parallel, call upstream on all the upstream items in the array
 */
function UpAndDown(array) {
  this.array = array;
}

UpAndDown.prototype.iterate = function(downstream, upstream, callback) {
  return iterateDown(this.array, 0, downstream, upstream, callback);
};

/* Iterative function used internally by iterateProviders */
/* This function uses callbacks for speed */
function iterateDown(array, position, downstream, upstream, callback) {
  if (position >= array.length) {
    return callback();
  }

  var provider = array[position];
  return downstream(provider, function(err, result) {
    if (err) {
      logger.warn('up-down: Downstream provider failed: ' + err, { exception: err });
      /* Don't quit: just try the next provider */
    }

    if (!result) {
      /* Try the next item in the array */
      return iterateDown(array, position + 1, downstream, upstream, callback);
    }

    /* No upstream providers from this one? No need to call upstream */
    if (position === 0) return callback(null, result);

    /* Perform the upstream on all the providers at once */
    var upstreamProviders = array.slice(0, position);
    async.each(
      upstreamProviders,
      function(provider, callback) {
        return upstream(result, provider, function(err) {
          if (err) {
            logger.warn('up-down: Upstream operation failed: ' + err, { exception: err });
          }

          callback();
        });
      },
      function(err) {
        if (err) {
          logger.warn('up-down: Upstream operation failed #2: ' + err, { exception: err });
        }

        return callback(null, result);
      }
    );
  });
}

module.exports = UpAndDown;
