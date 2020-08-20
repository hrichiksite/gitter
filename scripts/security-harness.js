#!/usr/bin/env node
'use strict';

const Promise = require('bluebird');
const path = require('path');
const fs = require('fs').promises;
const ReadStream = require('fs').ReadStream;
const crypto = require('crypto');

function getHashForFilepath(filePath) {
  return new Promise(resolve => {
    var shasum = crypto.createHash('sha256');

    const s = ReadStream(filePath);
    s.on('data', function(d) {
      shasum.update(d);
    });
    s.on('end', function() {
      const hash = shasum.digest('hex');
      resolve(hash);
    });
  });
}

const hookSourcePath = path.resolve(__dirname, './security-harness-hook.sh');
const hookPath = path.resolve(__dirname, '../.git/hooks/pre-push');

(async () => {
  let doesHookExist;
  try {
    await fs.stat(hookPath);
    doesHookExist = true;
  } catch (err) {
    doesHookExist = false;
  }

  if (doesHookExist) {
    const sourceHash = await getHashForFilepath(hookSourcePath);
    const destHash = await getHashForFilepath(hookPath);

    if (sourceHash === destHash) {
      await fs.unlink(hookPath);
      console.log('Security harness removed -- you can now push to all remotes.');
    } else {
      console.log(`${hookPath} exists and is different from our hook!`);
      console.log('Remove it and re-run this script to continue.');

      process.exit(1);
    }
  } else {
    const hookSource = await fs.readFile(hookSourcePath);
    await fs.writeFile(hookPath, hookSource, {
      mode: 0o755
    });

    console.log('Security harness installed -- you will only be able to push to dev.gitlab.org!');
  }
})();
