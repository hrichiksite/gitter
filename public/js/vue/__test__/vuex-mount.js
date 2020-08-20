const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');
const _ = require('lodash');

const { default: createStore, modules } = require('../store');
const actions = require('../store/actions');
const { default: mutations } = require('../store/mutations');

const mount = (Component, propsData = {}, extendStore = () => {}, mountOptions = {}) => {
  const localVue = createLocalVue();
  localVue.use(Vuex);

  const stubbedActions = _.mapValues(actions, action => jest.fn().mockImplementation(action));
  const stubbedMutations = _.mapValues(mutations, mutation =>
    jest.fn().mockImplementation(mutation)
  );

  // Mock actions inside of all modules
  // { moduleName: { actions: { name: implementation }, mutations: {} } }
  // changes to
  // { moduleName: { actions: { name: mockImplementation}, mutations: {} } }
  const stubbedModules = _.mapValues(modules, module => ({
    ...module,
    actions: _.mapValues(module.actions, action => jest.fn().mockImplementation(action)),
    mutations: _.mapValues(module.mutations, mutation => jest.fn().mockImplementation(mutation))
  }));

  const store = createStore({
    actions: stubbedActions,
    mutations: stubbedMutations,
    modules: stubbedModules
  });
  extendStore(store);

  const wrapper = shallowMount(Component, {
    localVue,
    store,
    propsData,
    ...mountOptions
  });

  const stubbedModuleActions = _.mapValues(stubbedModules, stubbedModule => stubbedModule.actions);
  const stubbedModuleMutations = _.mapValues(
    stubbedModules,
    stubbedModule => stubbedModule.mutations
  );
  // You can access stubbed module actions by `stubbedActions.moduleName.actionName`
  return {
    wrapper,
    stubbedActions: _.merge(stubbedActions, stubbedModuleActions),
    stubbedMutations: _.merge(stubbedMutations, stubbedModuleMutations),
    store
  };
};

module.exports = mount;
