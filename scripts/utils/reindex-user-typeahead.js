#!/usr/bin/env node
'use strict';

var typeahead = require('../../server/services/typeaheads/user-typeahead-elastic');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var shutdown = require('shutdown');

onMongoConnect()
  .then(function() {
    console.log('Reindexing. Run with DEBUG=* to get more info. See you in roughly 10mins!');
    return typeahead.reindex();
  })
  .then(function() {
    console.log('DONE');
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('error:', err);
    shutdown.shutdownGracefully(1);
  });
