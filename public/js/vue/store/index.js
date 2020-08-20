import Vue from 'vue';
import Vuex from 'vuex';
import clientEnv from 'gitter-client-env';
import * as actions from './actions';
import * as getters from './getters';
import mutations from './mutations';
import state from './state';
import threadMessageFeed from '../thread-message-feed/store';
import createCommunity from '../create-community/store';
import createRoom from '../create-room/store';

Vue.use(Vuex);

export const modules = { threadMessageFeed, createCommunity, createRoom };

function createStore(overrides) {
  return new Vuex.Store({
    // Only enable strict in dev because it isn't performant -> https://vuex.vuejs.org/guide/strict.html#development-vs-production
    // During testing(NODE_ENV=test), we do not enable strict mode because it will throw errors because we directly mutate state in our vuex-mount helper
    strict: clientEnv.env === 'dev',
    actions,
    getters,
    mutations,
    state: state(),
    modules,
    ...overrides
  });
}

export default createStore;
