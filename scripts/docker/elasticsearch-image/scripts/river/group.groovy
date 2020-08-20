def d = ctx.document;

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
  name: d.name,
  sd: sd
];
