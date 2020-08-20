import { UPDATE_MESSAGE } from './mutation-types';

/**
 * Helping class that creates mutation arguments for operations
 * that are changing messages. When creating mutation arguments, you
 * can specify what message properties should be overriden in `extraProps`.
 *
 * Usage:
 *  `commit(...loadingMutation({extra: 'prop'}))`
 */
export default class VuexMessageRequest {
  constructor(messageId) {
    this.id = messageId;
  }
  loadingMutation(extraProps) {
    return [
      UPDATE_MESSAGE,
      { id: this.id, loading: true, error: false, ...extraProps },
      {
        root: true
      }
    ];
  }

  errorMutation(extraProps) {
    return [
      UPDATE_MESSAGE,
      { id: this.id, loading: false, error: true, ...extraProps },
      {
        root: true
      }
    ];
  }

  successMutation(extraProps) {
    return [
      UPDATE_MESSAGE,
      { id: this.id, loading: false, error: false, ...extraProps },
      {
        root: true
      }
    ];
  }
}
