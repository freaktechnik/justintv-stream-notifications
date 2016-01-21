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
const mockAPIEnpoints = require("./providers/mockAPI.json");
const { Channel, User } = requireHelper("../lib/channel/core");
const { when } = require("sdk/event/utils");
const qs = require("sdk/querystring");
const ParentalControls = requireHelper("../lib/parental-controls");

// These are either defunct providers, or providers that don't use polling
// (or beam, which I should switch to sockets)
const IGNORE_QSUPDATE_PROVIDERS = [ "picarto", "beam" ];

const getRequest = (type, url)  => {
    if(type === "youtube") {
        let u = url.split("?");
        u[1] = qs.parse(u[1]);
        delete u[1].part;
        if("fields" in u[1])
            delete u[1].fields;
        if("hl" in u[1])
            delete u[1].hl;
        if("relevanceLanguage" in u[1])
            delete u[1].relevanceLanguage;
        delete u[1].key;

        u[1] = qs.stringify(u[1]);

        url = u.join("?");
    }
    console.log("Getting", url);
    if(type in mockAPIEnpoints && url in mockAPIEnpoints[type]) {
        return {
            status: 200,
            json: mockAPIEnpoints[type][url],
            text: typeof mockAPIEnpoints[type][url] === "string" ?
                mockAPIEnpoints[type][url] :
                JSON.stringify(mockAPIEnpoints[type][url])
        };
    }
    else {
        return {
            status: 404
        };
    }
};

const getMockAPIQS = (originalQS, type) => {
    return {
        queueRequest(url) {
            return Promise.resolve(getRequest(type, url));
        },
        unqueueUpdateRequest(priority) {},
        queueUpdateRequest(urls, priority, callback) {
            urls.forEach((url) => {
                callback(getRequest(type, url), url);
            });
        },
        HIGH_PRIORITY: originalQS.HIGH_PRIORITY,
        LOW_PRIORITY: originalQS.LOW_PRIORITY
    };
};

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

        console.log(p, ".updateChannel(test)");
        provider._setQs(getMockQS(originalQS));
        yield expectReject(provider.updateChannel("test"));
        prom = yield provider._qs.promise;
        assert.equal(typeof prom, "string");

        console.log(p, ".updateChannels(channels)");
        provider._setQs(getMockQS(originalQS));
        // Why not expectReject? Because pagination helpered implementations won't fail.
        yield provider.updateChannels(channels).then(() => {}, () => true);
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

exports.testMockAPIRequests = function*(assert) {
    let provider, ret, live, originalQS, prom;
    for(let p in providers) {
        if(p in mockAPIEnpoints) {
            provider = providers[p];
            originalQS = provider._qs;

            provider._setQs(getMockAPIQS(originalQS, p));

            ret = yield provider.getChannelDetails("test");
            assert.ok(ret instanceof Channel, "getChannelDetails resolves to a channel for "+p);
            assert.equal(ret.uname, "test");
            assert.equal(ret.type, p, "getChannelDetails resolves to a channel with correct type for "+p);
            assert.ok(!ret.live);

            live = yield provider.getChannelDetails("live");
            assert.ok(live instanceof Channel, "getChannelDetails for a live channel resolves to a channel for " + p);
            assert.equal(live.uname, "live");
            assert.equal(live.type, p);
            // live status knowledge is no requirement for getChannelDetails.

            ret = yield provider.updateChannel(ret.login);
            assert.ok(ret instanceof Channel, "updateChannel resolves to a channel for "+p);
            assert.equal(ret.uname, "test");
            assert.equal(ret.type, p, "updateChannel resolves to a channel with correct type for "+p);
            assert.ok(!ret.live);

            live = yield provider.updateChannel(live.login);
            assert.ok(live instanceof Channel);
            assert.equal(live.uname, "live");
            assert.equal(live.type, p);
            assert.ok(live.live, "Live channel is live after update with " + p);

            ret.id = 1;
            live.id = 2;

            ret = yield provider.updateChannels([ret, live]);
            assert.equal(ret.length, 2);
            ret.forEach((chan) => {
                assert.ok(chan instanceof Channel, "updateChannels resolves to a channel for "+p);
                assert.equal(chan.type, p, "updateChannels resolves to a channel with correct type for "+p);
                assert.equal(chan.live, chan.uname === "live");
            });

            if(IGNORE_QSUPDATE_PROVIDERS.indexOf(p) === -1) {
                prom = when(provider, "updatedchannels");
                provider.updateRequest(ret);
                ret = yield prom;
                if(Array.isArray(ret)) {
                    assert.ok(ret.length > 0);
                    ret = ret[0];
                }
                assert.ok(ret instanceof Channel, "updateRequest event holds a channel for "+p);
                assert.equal(ret.type, p, "updateRequest event holds a channel with corect type for "+p);
                assert.equal(ret.live, ret.uname === "live");
            }

            if(provider.supports.featured) {
                ret = yield provider.getFeaturedChannels();
                assert.ok(Array.isArray(ret));
                assert.ok(ret.length > 0);
                ret.forEach((chan) => {
                    assert.ok(chan instanceof Channel);
                    assert.equal(chan.type, p);
                });
                assert.equal(ret[0].uname, "featured");

                ret = yield provider.search("test");
                assert.ok(Array.isArray(ret));
                assert.ok(ret.length > 0);
                ret.forEach((chan) => {
                    assert.ok(chan instanceof Channel);
                    assert.equal(chan.type, p);
                });
                assert.equal(ret[0].uname, "test");
            }
        }
    }
    //TODO test favorites
};

exports.testTwitchHostingRedirects = function*(assert) {
    const provider = providers.twitch;
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));
    const ret = yield provider.updateChannel('mlg_live');
    assert.equal(ret.login, 'mlg');
    assert.ok(!ret.live);
};

exports.testTwitchLiveRedirects = function*(assert) {
    const provider = providers.twitch;
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));
    const ret = yield provider.updateChannels([
        {
            login: 'mlg_live',
            uname: 'MLG',
            id: 15
        }
    ]);
    assert.equal(ret.length, 1);
    assert.equal(ret[0].login, 'mlg');
    assert.ok(ret[0].live);
    assert.equal(ret[0].id, 15);
};

exports.testTwitchUpdateRedirects = function*(assert) {
    const provider = providers.twitch;
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));
    
    yield provider._getChannelId({
        login:'mlg_live'
    });

    const prom = when(provider, "updatedchannels");
    provider.updateRequest([
        {
            login: 'mlg_live',
            uname: 'MLG',
            id: 15
        }
    ]);
    const ret = yield prom;
    
    assert.equal(ret.length, 1, "Update returns the channel");
    assert.equal(ret[0].login, 'mlg', "Returned channel has the updated login");
    assert.ok(ret[0].live, "Returned channel is live");
    assert.equal(ret[0].id, 15, "Returned channel still has its ID");
};

exports.testGenericProvider = function*(assert) {
    let genericProvider = new GenericProvider("test");
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
    yield expectReject(genericProvider.updateChannels(["asdf"]));

    // Test forwards
    let p = defer();
    genericProvider.getChannelDetails = p.resolve;
    genericProvider.updateChannel("test");
    let name = yield p.promise;
    assert.equal(name, "test", "updateChannel gets forwarded to getChannelDetails");

    p = defer();
    genericProvider.updateChannel = p.resolve;
    genericProvider.updateChannels([{login: "test"}]);
    name = yield p.promise;
    assert.equal(name, "test", "updateChannels forwards to updateChannel");

    yield expectReject(genericProvider.getFeaturedChannels());
    yield expectReject(genericProvider.search());
};

require("sdk/test").run(exports);

