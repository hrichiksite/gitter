/* NB: any changes to this mapping also need to be done in language-analyzer-mapping in gitter-webapp */
def MAPPING = [
  en: "en"
];

def d = ctx.document;

def fromUserId = d.fromUserId;
if(fromUserId != null) {
  ctx._parent = fromUserId;
} else {
  ctx._parent = 'anonymous';
}

ctx.document = [
  _id: d._id,
  toTroupeId: d.toTroupeId,
  text: d.text,
  lang: d.lang,
  pub: d.pub,
  sent: d.sent,
  fromUserId: d.fromUserId
];

if (d.lang != null) {
  def analyzerKey = MAPPING.get(d.lang);
  if (analyzerKey != null) {
    ctx.document._analyzer = 'analyzer-' + analyzerKey;
  }
}
