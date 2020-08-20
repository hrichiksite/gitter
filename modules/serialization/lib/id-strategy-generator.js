'use strict';

var collections = require('gitter-web-utils/lib/collections');
var debug = require('debug')('gitter:infra:serializer:id-loader');
var Lazy = require('lazy.js');
var util = require('util');

function BaseIdStrategy(strategyName, strategy, loaderFunction) {
  this.strategyName = strategyName;
  this.strategy = strategy;
  this.loaderFunction = loaderFunction;
  this.objectHash = null;

  if (strategy.postProcess) {
    this.postProcess = function(results) {
      return strategy.postProcess(results);
    };
  }
}

BaseIdStrategy.prototype = {
  preload: async function(ids) {
    if (ids.isEmpty()) return;

    var time = debug.enabled && Date.now();

    var idArray = ids.toArray();
    const fullObjects = await this.loaderFunction(idArray);
    var duration = debug.enabled && Date.now() - time;
    debug('%s loaded %s items from ids in %sms', this.strategyName, idArray.length, duration);

    this.objectHash = collections.indexById(fullObjects);

    return this.strategy.preload(Lazy(fullObjects));
  },

  map: function(id) {
    if (!this.objectHash) return undefined;
    var fullObject = this.objectHash[id];

    if (!fullObject) {
      return undefined;
    }

    return this.strategy.map(fullObject);
  }
};

function idStrategyGenerator(name, FullObjectStrategy, loaderFunction) {
  function IdStrategy(options, providedStrategy) {
    var strategy = providedStrategy || new FullObjectStrategy(options);
    BaseIdStrategy.call(this, name, strategy, loaderFunction);
  }

  // Inject the strategy
  IdStrategy.withStrategy = function(providedStrategy) {
    return new IdStrategy(null, providedStrategy);
  };

  util.inherits(IdStrategy, BaseIdStrategy);

  return IdStrategy;
}
module.exports = idStrategyGenerator;
