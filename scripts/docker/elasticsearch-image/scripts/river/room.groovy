def d = ctx.document;

if(d.status == 'DELETED') {
  ctx.deleted = true;
}

def groupId = d.groupId;
if(groupId != null) {
  ctx._parent = groupId;
} else {
  ctx._parent = 'none';
}

def sd = null;

if (d.sd) {
  sd = [
    type: d.sd.type,
    members: d.sd.members,
    admins: d.sd.admins,
    public: d.sd.public,
    linkPath: d.sd.linkPath,
    externalId: d.sd.externalId,
    internalId: d.sd.internalId,
    extraMembers: d.sd.extraMembers,
    extraAdmins: d.sd.extraAdmins
  ];
}

ctx.document = [
  _id: d._id,
  uri: d.uri,
  topic: d.topic,
  tags: d.tags,
  sd: sd,
  userCount: d.userCount,
];
