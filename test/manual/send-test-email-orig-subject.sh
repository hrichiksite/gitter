#!/bin/bash

if [ -z "$SUBJECT" ]; then SUBJECT=`date`; fi
if [ -z "$SMTPHOST" ]; then SMTPHOST=localhost:2525; fi
if [ -z "$FROM" ]; then FROM=andrewn@datatribe.net; fi
if [ -z "$TO" ]; then TO=g0wt2s@localhost; fi

curl smtp://$SMTPHOST \
	-v \
 	--mail-from $FROM \
	--mail-rcpt $TO \
	-k --anyauth <<EOFOFEMAIL
Date: Mon, 15 Apr 2013 08:17:55 -0700
From: $FROM
To: $TO
Subject: $SUBJECT
Mime-Version: 1.0
Content-Type: multipart/alternative;
 boundary="--==_mimepart_516c1a23a64d_c60569e1091630";
 charset=UTF-8
Content-Transfer-Encoding: 7bit




----==_mimepart_516c1a23a64d_c60569e1091630
Date: Mon, 15 Apr 2013 08:17:55 -0700
Mime-Version: 1.0
Content-Type: text/plain;
 charset=UTF-8
Content-Transfer-Encoding: 7bit
Content-ID: <516c1a23d15c_c60569e10917c1@fe2.rs.github.com.mail>

Hello

----==_mimepart_516c1a23a64d_c60569e1091630
Date: Mon, 15 Apr 2013 08:17:55 -0700
Mime-Version: 1.0
Content-Type: text/html;
 charset=UTF-8
Content-Transfer-Encoding: 7bit
Content-ID: <516c1a23def4_c60569e1091899@fe2.rs.github.com.mail>

Hello

----==_mimepart_516c1a23a64d_c60569e1091630--

EOFOFEMAIL