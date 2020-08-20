export PATH := ./node_modules/.bin:$(PATH)

.PHONY: build clean test npm sprites npm-quick npm-full performance-tests test-no-coverage continuous-integration validate

continuous-integration: build

build: clean npm validate test package

validate:
	gulp validate

test-lua:
	echo lua tests disabled #gulp test-redis-lua

package:
	./node_modules/.bin/gulp package assemble --skip-stage validate --skip-stage test

clean:
	gulp clean || (make npm-full && gulp clean)
  # If gulp clean failed, it's almost certainly a problem
  # with the npm folder, so nuke it and try again

upload-to-s3:
	rm -rf output/s3upload/
	mkdir -p output/s3upload/
	cp output/app.tar.gz output/assets.tar.gz output/app/ASSET_TAG output/app/GIT_COMMIT output/app/VERSION output/s3upload/
	aws s3 cp --recursive --metadata GIT_COMMIT=$(CI_COMMIT_SHA) output/s3upload/ $(DIST_S3_URL)

ci-test:
	mkdir -p output/
	# Create the `output/assets/js/webpack-manifest.json` so
	# we know which chunks to serve in `boot-script-utils.js`
	gulp clientapp:compile:webpack
	gulp test --test-coverage --test-suite docker --test-xunit-reports --test-bail

test: clean
	mkdir -p output/
	gulp test

test-no-coverage: clean
	mkdir -p output/
	gulp test --test-suite docker --test-xunit-reports
	echo "Docker tests completed"

print-nodejs-version:
	node --version
	npm --version

npm-quick: print-nodejs-version
	npm prune
	npm install
	./build-scripts/validate-modules-for-build.sh

npm-full: print-nodejs-version
	rm -rf node_modules/ modules/*/node_modules shared/node_modules

	npm install

npm:
	make npm-quick || make npm-full

sprites:
	@mkdir -p output/temp-sprites
	@node scripts/generate-service-sprite.js

test-reinit-data: maintain-data test post-test-maintain-data

reset-test-data: maintain-data

upgrade-data:
	./scripts/upgrade-data.sh

maintain-data:
	MODIFY=true ./scripts/datamaintenance/execute.sh || true

# make-jquery:
# 	npm install
# 	./node_modules/.bin/jquery-builder -v 2.0.3 -e deprecated -m > public/repo/jquery/jquery.js
