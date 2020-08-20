'use strict';

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger;
var stats = env.stats;
var errorReporter = env.errorReporter;

var resque = require('node-resque');
var debug = require('debug')('gitter:infra:worker-queue');
var shutdown = require('shutdown');
var Promise = require('bluebird');
var _ = require('lodash');
var os = require('os');

/* Singleton scheduler for the process, lazy loaded */
var scheduler;

function getConnection() {
  var redisConfiguration = process.env.REDIS_CONNECTION_STRING || config.get('redis');
  if (typeof redisConfiguration === 'string') {
    redisConfiguration = env.redis.parse(redisConfiguration);
  }
  // Explicitly use db0 for resque, see reasons below
  // WARNING! Don't use the main client as
  // node-resque selects database 0.
  // Using the main client will wreak havoc
  // in the application
  // NB:NB: side effect: workers have always been in db0 and
  // we can no longer change this, which is a pity.

  redisConfiguration = _.extend({}, redisConfiguration, { redisDb: 0 });
  var redis = env.redis.createClient(redisConfiguration);

  var result = {
    redis: redis,
    database: 0 // In case the weird behaviour in node-resque is ever removed,
  };

  if (config.get('resque:namespace')) {
    result.namespace = config.get('resque:namespace'); // Allow tests to use their own ns
  }

  return result;
}

function createScheduler() {
  debug('Creating scheduler');
  // scheduler is responbsible for scheduling delayed jobs and giving them to the workers.
  var scheduler = new resque.scheduler({
    connection: getConnection()
  });

  scheduler.connect(function() {
    debug('Scheduler ready');
  });

  scheduler.on('start', function() {
    debug('Scheduler started');
  });

  scheduler.on('error', function(err) {
    logger.error('worker-queue-redis: scheduler failed: ' + err, { exception: err });
    stats.event('resque.scheduler.error');
  });

  shutdown.addHandler('worker-queue-scheduler', 90, function(callback) {
    debug('Shutting down scheduler');
    if (!scheduler.running) return callback();
    scheduler.end(callback);
  });

  return scheduler;
}

var uniqueWorkerCounter = 0;

var Queue = function(name, options, loaderFn) {
  if (config.get('resque:queuePrefix')) {
    name = config.get('resque:queuePrefix') + name;
  }

  this.name = name;
  this.loaderFn = loaderFn;
  var self = this;

  this.queueReady = Promise.fromNode(function(callback) {
    self.internalQueue = new resque.queue(
      {
        connection: getConnection()
      },
      {}
    ); // Jobs not defined on queue, only worker

    self.internalQueue.on('error', function(err) {
      logger.error('worker-queue-redis: queue error ' + err, { exception: err });
    });

    self.internalQueue.connect(callback);
  }).then(function() {
    debug('Queue %s ready to receive messages', name);
    return self.internalQueue;
  });
};

Queue.prototype.invoke = function(data, options, callback) {
  if (arguments.length == 2 && typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  // Don't send messages until the queue is ready for them
  return this.queueReady
    .then(function(queue) {
      return Promise.fromNode(function(callback) {
        debug('Queueing job for invocation on %s', self.name);

        var delay = (options && options.delay) || 0;

        // TODO: change 'echo' to 'invoke' 1 September 2015
        // This change needs to happen at least a several releases
        // before the echo queue is removed (see other TODO further
        // down in this file for details of that change)
        var operationName = 'echo';

        if (!delay) {
          queue.enqueue(self.name, operationName, data, callback);
        } else {
          queue.enqueueIn(delay, self.name, operationName, data, callback);
        }
      });
    })
    .then(function() {
      debug('Job queued successfully on %s: data %j', self.name, data);
    })
    .nodeify(callback);
};

Queue.prototype.destroy = function() {
  if (this.worker) {
    this.worker.end();
  }
};

Queue.prototype.listen = function() {
  debug('Starting worker on queue %s', this.name);

  if (this.worker) {
    this.worker.start();
    return;
  }

  this.worker = this.createWorker();
};

Queue.prototype.createWorker = function() {
  debug('Creating worker %s', this.name);

  /* Start the singleton scheduler */
  if (!scheduler) {
    scheduler = createScheduler();
  }

  uniqueWorkerCounter++;

  var self = this;
  var workerOpts = {
    connection: getConnection(),
    timeout: 100,
    /*
     * "If you plan to run more than one worker per nodejs process,
     * be sure to name them something distinct. Names must follow
     * the patern 'hostname:pid+unique_id'."
     *
     * from https://github.com/taskrabbit/node-resque#notes
     */
    name: os.hostname() + ':' + process.pid + '+' + uniqueWorkerCounter,
    queues: [this.name]
  };

  var workerFn = this.loaderFn();

  var jobs = {
    // TODO: remove 'echo' this by 1 September 2015
    // Reasoning: Because until PR#747, the application servers were
    // submitting echo jobs and we need to gracefully roll over to the
    // more sane name of invoke. If we dropped it immediately, all the old
    // jobs during the deployment period would be dropped.
    echo: {
      perform: function(data, callback) {
        debug('Invoking echo');
        workerFn(data, callback);
      }
    },
    invoke: {
      perform: function(data, callback) {
        debug('Invoking working invocation');
        workerFn(data, callback);
      }
    }
  };

  var worker = new resque.worker(workerOpts, jobs);
  worker.connect(function() {
    if (scheduler.running) {
      debug('Starting worker %s immediately', self.name);
      worker.workerCleanup();
      worker.start();
    } else {
      debug('Deferring start until scheduler is ready');
      scheduler.once('start', function() {
        debug('Starting worker %s', self.name);
        worker.workerCleanup();
        worker.start();
      });
    }
  });

  shutdown.addHandler('worker-queue-worker', 100, function(callback) {
    debug('Shutting down worker %s', self.name);
    worker.end(callback);
  });

  worker.on('start', function() {
    debug('Started worker %s', self.name);
    stats.event('resque.worker.started');
  });

  worker.on('end', function() {
    debug('Ended worker %s', self.name);
    stats.event('resque.worker.ended');
  });

  worker.on('cleaning_worker', function(worker) {
    debug('Cleaning old worker %s', worker);
    stats.event('resque.worker.cleaning');
  });
  //
  // worker.on('poll', function() {
  //   debug('poll');
  //   stats.eventHF('resque.worker.polling', 1, 0.005);
  // });

  worker.on('job', function(queue) {
    debug('Job: %s', queue);
    stats.eventHF('resque.worker.working');
  });

  worker.on('reEnqueue', function(queue /*, job, plugin*/) {
    debug('Reenqueue job on queue %s', queue);
    stats.event('resque.worker.reenqueue');
  });

  // worker.on('pause', function() {
  //   debug('pause');
  //   stats.eventHF('resque.worker.paused', 1, 0.005);
  // });

  worker.on('success', function(queue, job) {
    debug('success for job %j on queue %s', job, queue);
    stats.eventHF('resque.worker.success');
  });

  worker.on('error', function(queue, job, err) {
    errorReporter(err, { job: job, queue: queue }, { module: 'worker-queue' });
    stats.event('resque.worker.error');
  });

  return worker;
};

module.exports = {
  queue: function(name, options, loaderFn) {
    if (!options) options = {};
    return new Queue(name, options, loaderFn);
  },

  startScheduler: function() {
    if (!scheduler) {
      scheduler = createScheduler();
    }
    scheduler.start();
  },

  stopScheduler: function(callback) {
    if (!scheduler) return callback();
    scheduler.end(callback);
  }
};
