#!/bin/bash
# note mail-rcpt address must be changed to the troupe uri
curl --url "smtp://localhost:2525" --mail-from "testuser@troupetest.local" --mail-rcpt "61rsy6@localhost" --upload-file mail.txt

