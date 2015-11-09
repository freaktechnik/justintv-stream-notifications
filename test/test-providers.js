/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

const requireHelper = require("./require_helper");
const providers = requireHelper("../lib/providers"),
       { isValidURI } = require("sdk/url");
const { prefs } = require("sdk/simple-prefs");
const { GenericProvider } = requireHelper("../lib/providers/generic-provider");
const { expectReject } = require("./event/helpers");
const { defer } = require("sdk/core/promise");
const { getChannel, getUser } = require("./channeluser/utils");

// These are either defunct providers, or providers that don't use polling
// (or beam, which I should switch to sockets)
const IGNORE_QSUPDATE_PROVIDERS = [ "picarto", "beam" ];

const getMockQS = (originalQS, ignoreQR = false) => {
    let { promise, resolve, reject } = defer();
    return {
        queueRequest(url) {
            if(!ignoreQR)
                resolve(url);
            return Promise.resolve({});
        },
        unqueueUpdateRequest(priority) {
            resolve(priority);
        },
        queueUpdateRequest(urls, priority, callback) {
            resolve({
                urls,
                priority,
                callback
            });
        },
        promise,
        HIGH_PRIORITY: originalQS.HIGH_PRIORITY,
        LOW_PRIORITY: originalQS.LOW_PRIORITY
    };
};

exports.testProviders = function(assert) {
    let provider;
    for(let p in providers) {
        provider = providers[p];
        assert.equal(typeof(provider.name), "string", "Name is a string");
        assert.equal(provider.name, provider.toString(), "toString and name return the same");
        assert.ok(Array.isArray(provider.authURL), "Auth URL is an Array");
        assert.ok(provider.authURL.every(url => isValidURI(url)), "Auth URLs are valid");
        assert.ok("supports" in provider, "Provider has a supports property");
        assert.equal(typeof(provider.supports.favorites), "boolean", "Provider says whether or not it supports adding favs");
        assert.equal(typeof(provider.supports.credentials), "boolean", "Provider states whether or not it supports adding favs from credentials");
        assert.equal(typeof(provider.supports.featured), "boolean", "Provider states whether or not it suports getting featured content");
        assert.ok((!provider.supports.favorites && !provider.supports.credentials) || provider.supports.favorites, "Supports config is valid");
        assert.equal(typeof(provider.getUserFavorites), "function", "getUserFavorites is implemented");
        assert.equal(typeof(provider.getChannelDetails), "function", "getChannelDetails is implemented");
        assert.equal(typeof(provider.updateRequest), "function", "updateRequest is implemented");
        assert.equal(typeof(provider.updateFavsRequest), "function", "updateFavsRequest is implemented");
        assert.equal(typeof(provider.removeRequest), "function", "removeRequest is implemented");
        assert.equal(typeof(provider.removeFavsRequest), "function", "removeFavsRequest is implemented");
        assert.equal(typeof(provider.updateChannel), "function", "updateChannel is implemented");
        assert.equal(typeof(provider.updateChannels), "function", "updateChannels is implemented");
        assert.equal(typeof(provider.getFeaturedChannels), "function", "getFeaturedChannels is implemented");
        assert.equal(typeof(provider.search), "function", "search is implemented");
    }
};

exports.testSupports = function*(assert) {
    let provider;
    for(let p in providers) {
        provider = providers[p];
        console.info("Testing supports implementation for", p);

        if(!provider.supports.favorites) {
            yield expectReject(provider.getUserFavorites());
            assert.throws(() => provider.updateFavsRequest(), p + " doesn't implement updateFavsRequest");
        }
        // Can't test else unless APIs get emulated

        if(provider.supports.credentials) {
            assert.ok(provider.authURL.length > 0, p + " has at least one auth URL");
        }
        // Else is not relevant.

        if(!provider.supports.featured) {
            yield expectReject(provider.getFeaturedChannels());
            yield expectReject(provider.search());
        }
        // can't test else unless APIs get emulated
    }
};

exports.testRequests = function*(assert) {
    let provider, originalQS, prom;
    let channels = [ getChannel() ];
    let users = [ getUser() ];
    for(let p in providers) {
        console.log("Testing provider", p);
        provider = providers[p];
        originalQS = provider._qs;

        console.log(p, ".getChannelDetails(test)");
        provider._setQs(getMockQS(originalQS));
        yield expectReject(provider.getChannelDetails("test"));
        prom = yield provider._qs.promise;
        assert.equal(typeof prom, "string");

        if(IGNORE_QSUPDATE_PROVIDERS.indexOf(p) === -1) {
            console.log(p, ".updateRequest(channels)");
            provider._setQs(getMockQS(originalQS, true));
            provider.updateRequest(channels);
            prom = yield provider._qs.promise;
            assert.equal(prom.priority, originalQS.HIGH_PRIORITY);
            assert.ok(Array.isArray(prom.urls));

            console.log(p, ".removeRequest()");
            provider._setQs(getMockQS(originalQS));
            provider.removeRequest();
            prom = yield provider._qs.promise;
            assert.equal(prom, originalQS.HIGH_PRIORITY);
        }

        if(provider.supports.favorites) {
            console.log(p, ".getUserFavorites(test)");
            provider._setQs(getMockQS(originalQS));
            yield expectReject(provider.getUserFavorites("test"));
            prom = yield provider._qs.promise;
            assert.equal(typeof prom, "string");

            if(IGNORE_QSUPDATE_PROVIDERS.indexOf(p) === -1) {
                console.log(p, ".updateFavsRequest(users)");
                provider._setQs(getMockQS(originalQS, true));
                provider.updateFavsRequest(users);
                prom = yield provider._qs.promise;
                assert.equal(prom.priority, originalQS.LOW_PRIORITY);
                assert.ok(Array.isArray(prom.urls));

                console.log(p, ".removeFavsRequest()");
                provider._setQs(getMockQS(originalQS));
                provider.removeFavsRequest();
                prom = yield provider._qs.promise;
                assert.equal(prom, originalQS.LOW_PRIORITY);
            }
        }

        if(provider.supports.featured) {
            console.log(p, ".getFeaturedChannels()");
            provider._setQs(getMockQS(originalQS));
            yield expectReject(provider.getFeaturedChannels());
            prom = yield provider._qs.promise;
            assert.equal(typeof prom, "string");

            console.log(p, ".search(test)");
            provider._setQs(getMockQS(originalQS));
            yield expectReject(provider.search("test"));
            prom = yield provider._qs.promise;
            assert.equal(typeof prom, "string");
        }
    }
};

exports.testGenericProvider = function*(assert) {
    let genericProvider = new GenericProvider("test");
    assert.equal(genericProvider._type, "test");
    assert.equal(genericProvider._mature, prefs.find_mature);
    assert.equal(genericProvider.name, "provider_test");
    assert.equal(genericProvider.toString(), genericProvider.name);
    assert.ok("supports" in genericProvider);
    assert.equal(genericProvider._supportsFavorites, genericProvider.supports.favorites);
    assert.equal(genericProvider._supportsCredentials, genericProvider.supports.credentials);
    assert.equal(genericProvider._supportsFeatured, genericProvider.supports.featured);
    assert.ok(Array.isArray(genericProvider.authURL));
    assert.equal(genericProvider.authURL.length, 0);
    yield expectReject(genericProvider.getUserFavorites());
    yield expectReject(genericProvider.getChannelDetails());
    assert.throws(() => genericProvider.updateFavsRequest());
    assert.throws(() => genericProvider.updateRequest());
    //TODO test forwards
    yield expectReject(genericProvider.updateChannel());
    yield expectReject(genericProvider.updateChannels(["asdf"]));
    yield expectReject(genericProvider.getFeaturedChannels());
    yield expectReject(genericProvider.search());
};

require("sdk/test").run(exports);

