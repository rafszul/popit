
# note - this needs to be default so that the nodeunit process will exit with
# error if tests fail. Otherwise make will not abort.
REPORTER = default 

FOREVER = ./node_modules/.bin/forever
JSHINT  = ./node_modules/.bin/jshint

WAIT_FOR_SERVER   = sleep 5
TEST_SERVER = tests/test-server.js
# mute output so that this does not look like a failing test
STOP_TEST_SERVER  = $(FOREVER) stop $(TEST_SERVER) &> /dev/null 
START_TEST_SERVER = $(STOP_TEST_SERVER); NODE_ENV=testing $(FOREVER) start $(TEST_SERVER) && $(WAIT_FOR_SERVER)

all: node-modules css


node-modules:
	npm install
	npm prune

npm-update:
	rm npm-shrinkwrap.json
	npm install
	npm update
	npm prune
	npm shrinkwrap

npm-shrinkwrap:
	npm install
	rm npm-shrinkwrap.json
	npm install
	npm prune
	npm shrinkwrap


jshint:
	$(JSHINT) *.js lib/ hosting-app/ instance-app/ tests/
	cd public/js; ../../$(JSHINT) .

css:
	compass compile
	cp -r public/sass/jqueryui/images public/css/
	cp -r public/sass/select2/select2.png public/css/
	cp -r public/sass/select2/select2x2.png public/css/
	cp -r public/sass/select2/spinner.gif public/css/


optipng:
	find public -name '*.png' | xargs optipng --clobber -o4


js-templates:
	rm -rf public/js/templates.js
	./bin/compile_templates_to_amd.js > public/js/templates.js


public-production: css js-templates
	rm -rf public-build public-production
	node_modules/.bin/r.js -o public/js/app.build.js
	mkdir public-production

	# copy all the static assets
	mv public-build/css         public-production/
	mv public-build/favicon.ico public-production/
	mv public-build/fonts       public-production/
	mv public-build/img         public-production/

	# copy across only the javascript that we need
	mkdir -p public-production/js/libs
	mv public-build/js/libs/require-*  public-production/js/libs/
	mv public-build/js/main-*          public-production/js/

	# clean up generated content that we don't need now
	rm -r public-build
	rm -r public/js/templates.js	


tidy:
	# this should tidy, but not implemented yet
	# The output is not as nice as I'd like
	# sass-convert --recursive --in-place --from scss --to scss public/sass/


test: jshint node-modules test-unit test-api test-browser 
	echo "ALL TESTS PASS"

test-unit:
	@NODE_ENV=testing ./node_modules/.bin/nodeunit \
	  --reporter $(REPORTER) \
	  tests/unit

test-browser: css public-production
	$(START_TEST_SERVER)
	@NODE_ENV=testing ruby tests/browser_based/run_tests.rb -v
	$(STOP_TEST_SERVER)

test-api:
	$(STOP_TEST_SERVER)
	@NODE_ENV=testing ./node_modules/.bin/nodeunit \
	  --reporter $(REPORTER) \
	  tests/api


production: clean node-modules
	git checkout master
	npm version patch -m 'deploy to production - version bump to %s'
	npm shrinkwrap
	git commit --amend --reuse-message HEAD npm-shrinkwrap.json
	git tag -f `git tag | tail -1`
	git checkout production
	git merge master
	make public-production
	git add .
	git ci -m 'Update static assets'
	git tag -f `git tag | tail -1`

clean:
	compass clean
	rm -rf public/css
	rm -rf public/js/templates.js	
	rm -rf public-build
	rm -rf public-production
	find . -name chromedriver.log -delete


.PHONY: test test-unit test-browser test-api css public-production clean tidy node-modules npm-update npm-shrinkwrap

