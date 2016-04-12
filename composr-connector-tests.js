// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by composr-connector.js.
import { name as packageName } from "meteor/composr-connector";

// Write your tests here!
// Here is an example.
Tinytest.add('composr-connector - example', function (test) {
  test.equal(packageName, "composr-connector");
});
