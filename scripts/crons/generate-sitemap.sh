#!/bin/bash
set -e
set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMP_DIR=${TMPDIR-/tmp}
rm -f $TEMP_DIR/sitemap*

$SCRIPT_DIR/../generate-sitemap.js --tempdir $TEMP_DIR --name sitemap

gzip -9 $TEMP_DIR/sitemap*

for f in $TEMP_DIR/sitemap*.xml.gz
do
  NAME=$(basename $f .gz)
  /usr/local/bin/aws s3 cp $f s3://gitter-sitemap/$NODE_ENV/$NAME --content-encoding gzip --acl public-read
done


rm -f $TEMP_DIR/sitemap*


