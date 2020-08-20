'use strict';

class PolicyEvaluatorBase {
  constructor(user, uri) {
    this.user = user;
    this.uri = uri;

    this._canAccessResult = null;
  }

  async canRead() {
    return this._canAccess();
  }

  async canWrite() {
    return this._canAccess();
  }

  async canJoin() {
    // You can never join a room which has not yet been created
    return false;
  }

  async canAdmin() {
    return this._canAccess();
  }

  async canAddUser() {
    // You can never add a user to a room which has not yet been created
    return false;
  }

  async _canAccess() {
    return false;
  }
}

module.exports = PolicyEvaluatorBase;
