const _ = require('lodash');

export const getInitialRequestState = () => ({ loading: false, error: null, results: [] });
export default class VuexApiRequest {
  /**
   *
   * @param {*} id used to generate action type, example: `CHILD_MESSAGES`
   * @param {*} requestStatePath dot separated path to the state for this request, example: `search.room`
   */
  constructor(id, requestStatePath) {
    this._id = id.toUpperCase();
    this._requestStatePath = requestStatePath;
  }

  get requestType() {
    return `REQUEST_${this._id}`;
  }

  get successType() {
    return `RECEIVE_${this._id}_SUCCESS`;
  }

  get errorType() {
    return `RECEIVE_${this._id}_ERROR`;
  }

  get initialState() {
    const result = {};
    _.set(result, this._requestStatePath, getInitialRequestState());
    return result;
  }

  get types() {
    return {
      [this.requestType]: this.requestType,
      [this.successType]: this.successType,
      [this.errorType]: this.errorType
    };
  }

  setRequestState(state, error, loading, results = undefined) {
    const requestState = _.get(state, this._requestStatePath);
    requestState.error = error;
    requestState.loading = loading;
    requestState.results = results || requestState.results; // we don't change results during the request phase
  }

  get mutations() {
    return {
      [this.requestType]: state => this.setRequestState(state, false, true),
      [this.successType]: (state, results = []) =>
        this.setRequestState(state, false, false, results),
      [this.errorType]: (state, error = true) => this.setRequestState(state, error, false, [])
    };
  }
}
