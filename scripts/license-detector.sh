#!/bin/bash

for i in `find .. -name LICENSE|sed -E 's/.*\/([^/]+)\/LICENSE/\1/'|sort -u`; do
	file=`find .. -name LICENSE|grep /$i/|head -1`
	echo $i:`cat $file|paste -s -|sed -Ef license-detector.sed`
done
