const createStore = require('./').default;
const setupDataBridge = require('./data-bridge').default;

const store = createStore();

// We initialize the store state with the data injected from the server
// This comes from `context.renderState()`
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__);
  delete window.__INITIAL_STATE__;
}

setupDataBridge(store);

module.exports = store;
