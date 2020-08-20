'use strict';

var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var securityDescriptorGenerator = require('../lib/security-descriptor-generator');

describe('security-descriptor-generator', function() {
  var USERID = ObjectID(1);
  var GROUPID = ObjectID(2);

  var FIXTURES = [
    {
      name: 'type=null',
      options: {
        type: null
      },
      expected: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: [USERID],
        extraMembers: [],
        public: true
      }
    },
    {
      name: 'type=null, security=PRIVATE',
      options: {
        type: null,
        security: 'PRIVATE'
      },
      expected: {
        type: null,
        members: 'INVITE',
        admins: 'MANUAL',
        extraAdmins: [USERID],
        extraMembers: [],
        public: false
      }
    },
    {
      name: 'type=GH_ORG, security=PUBLIC',
      options: {
        type: 'GH_ORG',
        security: 'PUBLIC',
        linkPath: 'x/y'
      },
      expected: {
        type: 'GH_ORG',
        externalId: undefined,
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: 'x/y'
      }
    },
    {
      name: 'type=GH_ORG, security=PRIVATE',
      options: {
        type: 'GH_ORG',
        security: 'PRIVATE',
        linkPath: 'x/y'
      },
      expected: {
        type: 'GH_ORG',
        externalId: undefined,
        members: 'GH_ORG_MEMBER',
        admins: 'GH_ORG_MEMBER',
        public: false,
        linkPath: 'x/y'
      }
    },
    {
      name: 'type=GL_GROUP, security=PUBLIC',
      options: {
        type: 'GL_GROUP',
        security: 'PUBLIC',
        externalId: '1234',
        linkPath: 'xxyx'
      },
      expected: {
        type: 'GL_GROUP',
        externalId: '1234',
        members: 'PUBLIC',
        admins: 'GL_GROUP_MAINTAINER',
        public: true,
        linkPath: 'xxyx'
      }
    },
    {
      name: 'type=GL_GROUP, security=PRIVATE',
      options: {
        type: 'GL_GROUP',
        security: 'PRIVATE',
        externalId: '1234',
        linkPath: 'xxyx'
      },
      expected: {
        type: 'GL_GROUP',
        externalId: '1234',
        members: 'GL_GROUP_MEMBER',
        admins: 'GL_GROUP_MAINTAINER',
        public: false,
        linkPath: 'xxyx'
      }
    },
    {
      name: 'type=GL_PROJECT, security=PUBLIC',
      options: {
        type: 'GL_PROJECT',
        security: 'PUBLIC',
        externalId: '1234',
        linkPath: 'xxyx'
      },
      expected: {
        type: 'GL_PROJECT',
        externalId: '1234',
        members: 'PUBLIC',
        admins: 'GL_PROJECT_MAINTAINER',
        public: true,
        linkPath: 'xxyx'
      }
    },
    {
      name: 'type=GL_PROJECT, security=PRIVATE',
      options: {
        type: 'GL_PROJECT',
        security: 'PRIVATE',
        externalId: '1234',
        linkPath: 'xxyx'
      },
      expected: {
        type: 'GL_PROJECT',
        externalId: '1234',
        members: 'GL_PROJECT_MEMBER',
        admins: 'GL_PROJECT_MAINTAINER',
        public: false,
        linkPath: 'xxyx'
      }
    },
    {
      name: 'type=GL_USER, security=PUBLIC',
      options: {
        type: 'GL_USER',
        security: 'PUBLIC',
        externalId: '1234',
        linkPath: 'xxyx'
      },
      expected: {
        type: 'GL_USER',
        externalId: '1234',
        members: 'PUBLIC',
        admins: 'GL_USER_SAME',
        public: true,
        linkPath: 'xxyx'
      }
    },
    {
      name: 'type=GL_USER, security=PRIVATE',
      options: {
        type: 'GL_USER',
        security: 'PRIVATE',
        externalId: '1234',
        linkPath: 'xxyx'
      },
      expected: {
        type: 'GL_USER',
        externalId: '1234',
        members: 'INVITE',
        admins: 'GL_USER_SAME',
        public: false,
        linkPath: 'xxyx'
      }
    },
    {
      name: 'type=GROUP, security=PRIVATE',
      options: {
        type: 'GROUP',
        security: 'PRIVATE',
        internalId: GROUPID
      },
      expected: {
        type: 'GROUP',
        members: 'INVITE',
        admins: 'GROUP_ADMIN',
        public: false,
        extraAdmins: [],
        extraMembers: [],
        internalId: GROUPID
      }
    },
    {
      name: 'type=GROUP, security=PUBLIC',
      options: {
        type: 'GROUP',
        security: 'PUBLIC',
        internalId: GROUPID
      },
      expected: {
        type: 'GROUP',
        members: 'PUBLIC',
        admins: 'GROUP_ADMIN',
        public: true,
        extraAdmins: [],
        extraMembers: [],
        internalId: GROUPID
      }
    },
    {
      name: 'type=GROUP, security=INHERITED',
      options: {
        type: 'GROUP',
        security: 'INHERITED',
        internalId: GROUPID
      },
      expected: {
        type: 'GROUP',
        members: 'INVITE_OR_ADMIN',
        admins: 'GROUP_ADMIN',
        public: false,
        extraAdmins: [],
        extraMembers: [],
        internalId: GROUPID
      }
    }
  ];

  FIXTURES.forEach(function(META) {
    it(META.name, function() {
      var user = { _id: USERID, id: USERID.toHexString() };
      var result = securityDescriptorGenerator.generate(user, META.options);

      assert.deepEqual(result, META.expected);
    });
  });
});
