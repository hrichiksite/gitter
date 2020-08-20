'use strict';

const UNAUTHORIZED_REDIRECT_MAP = {
  TOKEN_REVOKED_URL: '/login/token-revoked',
  USER_AGENT_REVOKED_URL: '/login/user-agent-revoked',
  LOGIN_URL: '/login'
};

module.exports = UNAUTHORIZED_REDIRECT_MAP;
