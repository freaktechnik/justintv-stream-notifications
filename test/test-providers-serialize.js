/**
 * Test the serialized version of the providers module.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const serializedProviders = requireHelper("../lib/providers/serialized").default;
const providers = requireHelper("../lib/providers").default;

exports.testSerialization = function(assert) {
    const serialized = JSON.parse(JSON.stringify(serializedProviders));
    for(let p in serialized) {
        assert.ok("name" in serialized[p], p+" has a name when serialized");
        assert.equal(typeof serialized[p].supports, "object", p+" has a supports object when serialized");
        assert.ok("favorites" in serialized[p].supports, p+" has favorites in the supports object when serialized");
        assert.ok("credentials" in serialized[p].supports, p+" has credentials in the supports object when serialized");
        assert.ok("featured" in serialized[p].supports, p+" has featured in the supports object when serialized");
    }
};

exports.testContent = function(assert) {
    assert.ok(Object.isFrozen(serializedProviders), "Serialized providers are frozen");
    for(let p in providers) {
        assert.ok(p in serializedProviders, p+" is in the serialized version");
        assert.ok(Object.isFrozen(serializedProviders[p]), p+" is a frozen serialized object");
        assert.equal(providers[p].name, serializedProviders[p].name, "Name matches for "+p);
        assert.equal(providers[p].supports.favorites, serializedProviders[p].supports.favorites, "Favorites is the same");
        assert.equal(providers[p].supports.credentials, serializedProviders[p].supports.credentials, "Credentials is the same");
        assert.equal(providers[p].supports.featured, serializedProviders[p].supports.featured, "Featured is the same");
    }
};

require("sdk/test").run(exports);
