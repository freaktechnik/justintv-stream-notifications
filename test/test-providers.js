/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
"use strict";

const requireHelper = require("./require_helper"),
    providers = requireHelper("../lib/providers").default,
    { isValidURI } = require("sdk/url"),
    { prefs } = require("sdk/simple-prefs"),
    GenericProvider = requireHelper("../lib/providers/generic-provider").default,
    { expectReject } = require("./event/helpers"),
    { getChannel, getUser } = require("./channeluser/utils"),
    { Channel, User } = requireHelper("../lib/channel/core"),
    { when } = require("sdk/event/utils"),
    ParentalControls = requireHelper("../lib/parental-controls").default,
    { getMockQS, getMockAPIQS, apiEndpoints, IGNORE_QSUPDATE_PROVIDERS } = require("./providers/mock-qs");

exports.testProviders = function(assert) {
    let provider;
    for(let p in providers) {
        provider = providers[p];
        assert.ok(Object.isFrozen(provider), "Provider is frozen");
        assert.equal(typeof (provider.name), "string", "Name is a string");
        assert.equal(provider.name, provider.toString(), "toString and name return the same");
        assert.ok(Array.isArray(provider.authURL), "Auth URL is an Array");
        assert.ok(provider.authURL.every((url) => isValidURI(url)), "Auth URLs are valid");
        assert.ok("supports" in provider, "Provider has a supports property");
        assert.equal(typeof provider.enabled, "boolean", "enabled is a boolean");
        assert.ok(Object.isFrozen(provider.supports), "Supports object is frozen");
        assert.equal(typeof (provider.supports.favorites), "boolean", "Provider says whether or not it supports adding favs");
        assert.equal(typeof (provider.supports.credentials), "boolean", "Provider states whether or not it supports adding favs from credentials");
        assert.equal(typeof (provider.supports.featured), "boolean", "Provider states whether or not it suports getting featured content");
        assert.ok((!provider.supports.favorites && !provider.supports.credentials) || provider.supports.favorites, "Supports config is valid");
        assert.equal(typeof (provider.getUserFavorites), "function", "getUserFavorites is implemented");
        assert.equal(typeof (provider.getChannelDetails), "function", "getChannelDetails is implemented");
        assert.equal(typeof (provider.updateRequest), "function", "updateRequest is implemented");
        assert.equal(typeof (provider.updateFavsRequest), "function", "updateFavsRequest is implemented");
        assert.equal(typeof (provider.removeRequest), "function", "removeRequest is implemented");
        assert.equal(typeof (provider.removeFavsRequest), "function", "removeFavsRequest is implemented");
        assert.equal(typeof (provider.updateChannel), "function", "updateChannel is implemented");
        assert.equal(typeof (provider.updateChannels), "function", "updateChannels is implemented");
        assert.equal(typeof (provider.getFeaturedChannels), "function", "getFeaturedChannels is implemented");
        assert.equal(typeof (provider.search), "function", "search is implemented");

        if(!provider.enabled) {
            assert.ok(!provider.supports.favorites, "Doesn't support favorites when disabled");
            assert.ok(!provider.supports.credentials, "Doesn't support credentials when disabled");
            assert.ok(!provider.supports.featured, "Doesn't support featured when disabled");
        }
    }
};

exports.testSupports = function* (assert) {
    let provider;
    const throwCheck = (provider) => () => provider.updateFavsRequest();
    for(let p in providers) {
        provider = providers[p];
        console.info("Testing supports implementation for", p);

        if(!provider.supports.favorites) {
            yield expectReject(provider.getUserFavorites());
            assert.throws(throwCheck(provider), p + " doesn't implement updateFavsRequest");
        }
        // Can't test else unless APIs get emulated (see testRequests)

        if(provider.supports.credentials) {
            assert.ok(provider.authURL.length > 0, p + " has at least one auth URL");
        }
        // Else is not relevant.

        if(!provider.supports.featured) {
            yield expectReject(provider.getFeaturedChannels());
            yield expectReject(provider.search());
        }
        // can't test else unless APIs get emulated (see testRequests)
    }
};

exports.testRequests = function* (assert) {
    let provider, originalQS, prom;
    const channels = [ getChannel() ],
        users = [ getUser() ];
    for(let p in providers) {
        console.log("Testing provider", p);
        provider = providers[p];
        originalQS = provider._qs;

        console.log(p, ".getChannelDetails(test)");
        provider._setQs(getMockQS(originalQS));
        yield expectReject(provider.getChannelDetails("test"));
        prom = yield provider._qs.promise;
        assert.equal(typeof prom, "string");

        console.log(p, ".updateChannel(test)");
        provider._setQs(getMockQS(originalQS));
        yield expectReject(provider.updateChannel("test"));
        prom = yield provider._qs.promise;
        assert.equal(typeof prom, "string");

        console.log(p, ".updateChannels(channels)");
        provider._setQs(getMockQS(originalQS));
        // Why not expectReject? Because pagination helpered implementations won't fail.
        yield provider.updateChannels(channels).then(() => {
            // ignore
        }, () => true);
        prom = yield provider._qs.promise;
        assert.equal(typeof prom, "string");

        if(provider.enabled && IGNORE_QSUPDATE_PROVIDERS.indexOf(p) === -1) {
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
        // else is tested in testSupports

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
        // else is tested in testSupports

        provider._setQs(originalQS);
    }
};

exports.testMockAPIRequests = function* (assert) {
    let provider,
        ret,
        live,
        originalQS,
        prom;
    for(let p in providers) {
        if(apiEndpoints.includes(p)) {
            provider = providers[p];
            originalQS = provider._qs;

            provider._setQs(getMockAPIQS(originalQS, p));

            ret = yield provider.getChannelDetails("test");
            assert.ok(ret instanceof Channel, "getChannelDetails resolves to a channel for " + p);
            assert.equal(ret.uname, "test", "test channel channel detail gets the username test for " + p);
            assert.equal(ret.type, p, "getChannelDetails resolves to a channel with correct type for " + p);
            assert.ok(!ret.live.isLive(), "Test channel is not live for " + p);

            live = yield provider.getChannelDetails("live");
            assert.ok(live instanceof Channel, "getChannelDetails for a live channel resolves to a channel for " + p);
            assert.equal(live.uname, "live", "Channel details username for live is correct for " + p);
            assert.equal(live.type, p, "live channel has the correct type for " + p);
            // live status knowledge is no requirement for getChannelDetails.

            ret = yield provider.updateChannel(ret.login);
            assert.ok(ret instanceof Channel, "updateChannel resolves to a channel for " + p);
            assert.equal(ret.uname, "test", "Username of test is correct for updateChannel with " + p);
            assert.equal(ret.type, p, "updateChannel resolves to a channel with correct type for " + p);
            assert.ok(!ret.live.isLive(), "Updated test channel still isn't live for " + p);

            live = yield provider.updateChannel(live.login);
            assert.ok(live instanceof Channel, "updateChannel resolves to a channel with the live channel for " + p);
            assert.equal(live.uname, "live", "Username still is live after update for " + p);
            assert.equal(live.type, p, "Type of channel is still " + p + " after update of a live channel");
            assert.ok(live.live.isLive(), "Live channel is live after update with " + p);

            ret.id = 1;
            live.id = 2;

            ret = yield provider.updateChannels([ ret, live ]);
            assert.equal(ret.length, 2, "Both channels were updated");
            ret.forEach((chan) => {
                assert.ok(chan instanceof Channel, "updateChannels resolves to a channel for " + p);
                assert.equal(chan.type, p, "updateChannels resolves to a channel with correct type for " + p);
                assert.equal(chan.live.isLive(), chan.uname === "live", "Channel " + chan.uname + " is live if it's the live channel, else it's offline for " + p + " after an update of multiple channels together");
            });

            if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
                prom = when(provider, "updatedchannels");
                provider.updateRequest(ret);
                ret = yield prom;
                if(Array.isArray(ret)) {
                    assert.ok(ret.length > 0, "There is mor than one item in the updated channels");
                    ret = ret[0];
                }
                assert.ok(ret instanceof Channel, "updateRequest event holds a channel for " + p);
                assert.equal(ret.type, p, "updateRequest event holds a channel with corect type for " + p);
                assert.equal(ret.live.isLive(), ret.uname === "live", "Update request correctly set live state of " + ret.uname + " for " + p);

                provider.removeRequest();
            }

            if(provider.supports.favorites) {
                ret = yield provider.getUserFavorites("test");
                assert.ok(Array.isArray(ret), "getUserFavorites returned an array for " + p);
                assert.equal(ret.length, 2, "The returned array has exactly two elements for " + p);
                assert.ok(ret[0] instanceof User, "First element is the user for " + p);
                assert.ok(Array.isArray(ret[1]), "Second element is an array for " + p);
                assert.equal(ret[0].uname, "test", "User's name is test for " + p);
                assert.equal(ret[0].type, p, "returned user has the correct type of " + p);
                ret[1].forEach((ch) => assert.equal(ch.type, p, "Each returned channel has the correct type for " + p));

                if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
                    prom = when(provider, "updateduser");
                    provider.updateFavsRequest([ ret[0] ]);
                    ret = yield prom;
                    assert.ok(ret instanceof User, "updateduser is a user for " + p);
                    assert.equal(ret.type, p, "updateduser has the correct type for " + p);
                    assert.equal(ret.uname, "test", "updateduser is called test for " + p);

                    //TODO test newchannels event?

                    provider.removeFavsRequest();
                }
            }

            if(provider.supports.featured) {
                ret = yield provider.getFeaturedChannels();
                assert.ok(Array.isArray(ret), "Featured channels returns an array for " + p);
                assert.ok(ret.length > 0, "There are featured channels for " + p);
                ret.forEach((chan) => {
                    assert.ok(chan instanceof Channel, "One of the featured channels is indeed a channel for " + p);
                    assert.equal(chan.type, p, "It also has the type of " + p);
                });
                assert.equal(ret[0].uname, "featured", "And the first one's username is featured for " + p);

                ret = yield provider.search("test");
                assert.ok(Array.isArray(ret), "Search returns an array for " + p);
                assert.ok(ret.length > 0, "There is more than one search result for " + p);
                ret.forEach((chan) => {
                    assert.ok(chan instanceof Channel, "One of the search results is a channel for " + p);
                    assert.equal(chan.type, p, "It also has the type of " + p);
                });
                assert.equal(ret[0].uname, "test", "The first found item has the username test for " + p);
            }
            provider._setQs(originalQS);
        }
    }
};

exports.testGenericProvider = function* (assert) {
    const genericProvider = new GenericProvider("test");
    assert.equal(genericProvider._type, "test");
    assert.equal(genericProvider._mature, prefs.find_mature && !ParentalControls.enabled);
    assert.equal(genericProvider.name, "provider_test");
    assert.equal(genericProvider.toString(), genericProvider.name);
    assert.equal(genericProvider.enabled, genericProvider._enabled);
    assert.ok("supports" in genericProvider);
    assert.equal(genericProvider._supportsFavorites, genericProvider.supports.favorites);
    assert.equal(genericProvider._supportsCredentials, genericProvider.supports.credentials);
    assert.equal(genericProvider._supportsFeatured, genericProvider.supports.featured);
    genericProvider._enabled = false;
    assert.equal(genericProvider.supports.favorites, genericProvider.enabled);
    assert.equal(genericProvider.supports.credentials, genericProvider.enabled);
    assert.equal(genericProvider.supports.featured, genericProvider.enabled);
    assert.ok(Array.isArray(genericProvider.authURL));
    assert.equal(genericProvider.authURL.length, 0);
    yield expectReject(genericProvider.getUserFavorites());
    yield expectReject(genericProvider.getChannelDetails());
    assert.throws(() => genericProvider.updateFavsRequest());
    assert.throws(() => genericProvider.updateRequest());
    yield expectReject(genericProvider.updateChannel());
    yield expectReject(genericProvider.updateChannels([ "asdf" ]));

    // Test forwards
    let name = yield new Promise((resolve) => {
        genericProvider.getChannelDetails = resolve;
        genericProvider.updateChannel("test");
    });
    assert.equal(name, "test", "updateChannel gets forwarded to getChannelDetails");

    name = yield new Promise((resolve) => {
        genericProvider.updateChannel = resolve;
        genericProvider.updateChannels([
            {
                login: "test"
            }
        ]);
    });
    assert.equal(name, "test", "updateChannels forwards to updateChannel");

    yield expectReject(genericProvider.getFeaturedChannels());
    yield expectReject(genericProvider.search());
};

require("sdk/test").run(exports);
