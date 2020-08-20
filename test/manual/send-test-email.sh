#!/bin/bash

curl smtp://localhost:2525 \
	-v \
 	--mail-from andrewn@datatribe.net \
	--mail-rcpt g0wt2s@localhost \
	-T ./emails/test-email-1.txt \
	-k --anyauth
