import createStore from './store';

const AVAILABLE_SSR_MODULES = {
  'left-menu': require('./left-menu').default,
  'thread-message-feed': require('./thread-message-feed').default
};

export default context => {
  const store = createStore();
  store.dispatch('setInitialData', context.storeData);

  const renderModule = AVAILABLE_SSR_MODULES[context.moduleToRender];
  if (!renderModule) {
    throw new Error(`Unable to find available SSR module for ${context.moduleToRender}`);
  }

  const app = renderModule(null, store);

  context.rendered = () => {
    // Rendering the app mutates store and adds state from our components to it.
    // This state is later serialized and injected into the HTML as window.__INITIAL_STATE__
    //
    // This is currently being injected by `context.renderState()` but if we used
    // the `template` option with the renderer, the state could be automatically
    // serialized and injected into the HTML as `window.__INITIAL_STATE__`.
    context.state = store.state;
  };

  return app;
};
