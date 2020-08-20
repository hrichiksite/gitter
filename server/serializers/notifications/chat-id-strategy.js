'use strict';

var chatService = require('gitter-web-chats');
var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');
var ChatStrategy = require('./chat-strategy');
var ChatIdStrategy = idStrategyGenerator('ChatIdStrategy', ChatStrategy, chatService.findByIds);

module.exports = ChatIdStrategy;
