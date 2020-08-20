def d = ctx.document;

ctx.document = [
  _id:d._id, 
  username:d.username,
  displayName:d.displayName
];
