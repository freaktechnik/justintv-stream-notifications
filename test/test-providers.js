/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
const providers = require("../lib/providers"),
       { isValidURI } = require("sdk/url");

exports.testProviders = function(assert) {
    var provider;
    for(var p in providers) {
        provider = providers[p];
        assert.equal(typeof(provider.name), "string", "Name is a string");
        assert.equal(provider.name, provider.toString(), "toString and name return the same");
        assert.ok(Array.isArray(provider.authURL), "Auth URL is an Array");
        assert.ok(provider.authURL.every(url => isValidURI(url)), "Auth URLs are valid");
        assert.ok("supports" in provider, "Provider has a supports property");
        assert.equal(typeof(provider.supports.favorites), "boolean", "Provider says whether or not it supports adding favs");
        assert.equal(typeof(provider.supports.credentials), "boolean", "Provider states whether or not it supports adding favs from credentials");
        assert.ok((!provider.supports.favorites && !provider.supports.credentials) || provider.supports.favorites, "Supports config is valid");
        assert.equal(typeof(provider.getUserFavorites), "function", "getUserFavorites is implemented");
        assert.equal(typeof(provider.getChannelDetails), "function", "getChannelDetails is implemented");
        assert.equal(typeof(provider.updateRequest), "function", "updateRequest is implemented");
        assert.equal(typeof(provider.updateFavsRequest), "function", "updateFavsRequest is implemented");
        assert.equal(typeof(provider.removeRequest), "function", "removeRequest is implemented");
        assert.equal(typeof(provider.removeFavsRequest), "function", "removeFavsRequest is implemented");
        assert.equal(typeof(provider.updateChannel), "function", "updateChannel is implemented");
        assert.equal(typeof(provider.updateChannels), "function", "updateChannels is implemented");
    }
};

require("sdk/test").run(exports);

