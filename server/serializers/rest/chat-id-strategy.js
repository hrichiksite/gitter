'use strict';

var chatService = require('gitter-web-chats');
var ChatStrategy = require('./chat-strategy');
var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');
var ChatIdStrategy = idStrategyGenerator('ChatIdStrategy', ChatStrategy, chatService.findByIds);

module.exports = ChatIdStrategy;
