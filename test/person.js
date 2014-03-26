"use strict";

var assert = require('assert');
var utils = require('../lib/utils');
var PopIt = require('../lib/popit');
var async = require('async');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

describe("person", function() {
  var popit;
  var Person;

  beforeEach(function() {
    popit = new PopIt();
    popit.set_instance('test');
    Person = popit.model('Person');
  });

  beforeEach(utils.delete_all_testing_databases);

  it("person name and slug", function() {
    var person = new Person();
    assert(person, "got new person");

    // initial settings
    assert.equal(person.name, null, 'no name');
    assert.equal(person.slug, null, 'no slug');

    // set a valid name
    person.name = "Joé Blöggs";
    assert.equal(person.name, "Joé Blöggs", 'name set');
    assert.equal(person.slug, "joe-bloggs", 'slug set');

    // change the name - should not affect slug
    person.name = "New Name";
    assert.equal(person.name, "New Name",   'name changed');
    assert.equal(person.slug, "joe-bloggs", 'slug not changed');

    // change slug
    person.slug = "New Slug";
    assert.equal(person.name, "New Name", 'name not changed');
    assert.equal(person.slug, "new-slug", 'slug changed (and slugified)');

    // check that punctuation correctly converted
    person.slug = '';
    person.name = "D’Angelo “Oddball” Fritz";
    assert.equal(person.name, "D’Angelo “Oddball” Fritz", 'name set');
    assert.equal(person.slug, 'd\'angelo-"oddball"-fritz', 'slug set');

    // clear slug and set Unicode name
    person.slug = '';
    person.name = "网页";
    assert.equal(person.name, "网页", 'new chinese name saved');
    assert.equal(person.slug, "",   'slug blank as expected');
  });

  it("increment slug", function(done) {
    var joe = new Person({name: 'Joe'});
    assert.equal(joe.slug, 'joe', 'slug is Joe');

    joe.save(function(err) {
      assert.ifError(err);

      var joe2 = new Person({name: 'Joe'});
      assert.equal(joe2.slug, 'joe', 'slug is joe for second joe');

      joe2.save(function(err) {
        assert.ifError(err);
        assert.equal(joe2.slug, 'joe-1', 'slug has been de-duped');
        done();
      });
    });
  });

  it("don't increment our own slug", function(done) {
    var joe = new Person({name: 'Joe', _id: new ObjectId() });
    assert.equal(joe.slug, 'joe', 'slug is Joe');

    joe.save(function(err) {
      assert.ifError(err);

      joe.save(function(err) {
        assert.ifError(err);
        assert.equal( joe.slug, 'joe', 'slug has not changed');
        done();
      });
    });
  });

  it("slug url", function() {
    var joe = new Person({name: 'Joe'});
    assert.equal(joe.slug, 'joe', 'slug is correct');
    assert.equal(joe.slug_url, '/persons/joe', 'slug_url is correct');
  });

  it("name searching", function(done) {
    var joe;

    async.series([
      // search for person called joe (no matches)
      function (cb) {
        Person.name_search('joe', function (err,docs) {
          assert.equal( docs.length, 0, "no matches when no rows" );
          cb(err);
        });
      },

      // create joe
      function (cb) {
        // create joe
        joe = new Person({name: 'Joe', _id: new ObjectId() });
        joe.save(cb);
      },

      // search for person called joe (find one)
      function (cb) {
        Person.name_search('joe', function (err, docs) {
          assert.equal( docs.length, 1, "find joe we just inserted" );
          assert.equal( docs[0]._id, joe._id );
          cb(err);
        });
      },

      // rename joe to Fred
      function (cb) {
        joe.name = 'Fred';
        joe.save(cb);
      },

      // search for person called joe (no matches)
      function (cb) {
        Person.name_search('joe', function (err,docs) {
          assert.equal( docs.length, 0, "Now not found" );
          cb(err);
        });
      },

    ],
    function (err) {
      assert.ifError(err);
      done();
    }
    );
  });
});
