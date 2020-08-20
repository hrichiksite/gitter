'use strict';

var compileTemplate = require('./compile-web-template');
var prerenderWrapper = compileTemplate.compileString(
  '<{{wrap}} {{#if id}}id="{{id}}"{{/if}} {{#if className}}class="{{className}}"{{/if}} {{#if dataId}}data-id="{{dataId}}"{{/if}}>{{{inner}}}</{{wrap}}>'
);

module.exports = prerenderWrapper;
