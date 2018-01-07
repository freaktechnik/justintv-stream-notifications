/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
import test from "ava";
import providers from "../../../src/background/providers";
import { getChannel, getUser } from "../../helpers/channel-user";
import { Channel, User } from "../../../src/background/channel/core";
import { getMockQS, getMockAPIQS, apiEndpoints, IGNORE_QSUPDATE_PROVIDERS } from "../../helpers/providers/mock-qs";
import LiveState from "../../../src/live-state.json";
import ChannelList from '../../../src/background/channel/list';

test.afterEach(() => {
    providers.beam._getUserIdFromUsername.cache.clear();
});

const checkAuthUrls = (provider) => provider.authURL.every((url) => new URL(url));
const testProviders = (t, p) => {
    const provider = providers[p];
    t.true(Object.isFrozen(provider), "Provider is frozen");
    t.is(typeof (provider.name), "string", "Name is a string");
    t.is(provider.name, provider.toString(), "toString and name return the same");
    t.true(Array.isArray(provider.authURL), "Auth URL is an Array");
    t.notThrows(checkAuthUrls.bind(null, provider), "Auth URLs are valid");
    t.true("supports" in provider, "Provider has a supports property");
    t.is(typeof provider.enabled, "boolean", "enabled is a boolean");
    t.true(Object.isFrozen(provider.supports), "Supports object is frozen");
    t.is(typeof (provider.supports.favorites), "boolean", "Provider says whether or not it supports adding favs");
    t.is(typeof (provider.supports.credentials), "boolean", "Provider states whether or not it supports adding favs from credentials");
    t.is(typeof (provider.supports.featured), "boolean", "Provider states whether or not it suports getting featured content");
    t.true((!provider.supports.favorites && !provider.supports.credentials) || provider.supports.favorites, "Supports config is valid");
    t.is(typeof (provider.getUserFavorites), "function", "getUserFavorites is implemented");
    t.is(typeof (provider.getChannelDetails), "function", "getChannelDetails is implemented");
    t.is(typeof (provider.updateRequest), "function", "updateRequest is implemented");
    t.is(typeof (provider.updateFavsRequest), "function", "updateFavsRequest is implemented");
    t.is(typeof (provider.removeRequest), "function", "removeRequest is implemented");
    t.is(typeof (provider.removeFavsRequest), "function", "removeFavsRequest is implemented");
    t.is(typeof (provider.updateChannel), "function", "updateChannel is implemented");
    t.is(typeof (provider.updateChannels), "function", "updateChannels is implemented");
    t.is(typeof (provider.getFeaturedChannels), "function", "getFeaturedChannels is implemented");
    t.is(typeof (provider.search), "function", "search is implemented");

    if(!provider.enabled) {
        t.false(provider.supports.favorites, "Doesn't support favorites when disabled");
        t.false(provider.supports.credentials, "Doesn't support credentials when disabled");
        t.false(provider.supports.featured, "Doesn't support featured when disabled");
    }
};
testProviders.title = (title, p) => `Basic properties of ${p}`;

const testNotSupportsFavorites = async (t, p) => {
    const provider = providers[p];

    await t.throws(provider.getUserFavorites(), Error, "doesn't implement getUserFavorites");
    t.throws(provider.updateFavsRequest, Error, "doesn't implement updateFavsRequest");
};
testNotSupportsFavorites.title = (title, p) => `Support favorites false implementation of ${p}`;

const testSupportsCredentials = (t, p) => {
    const provider = providers[p];

    t.true(provider.authURL.length > 0, "has at least one auth URL");
};
testSupportsCredentials.title = (title, p) => `Support credentials implementation of ${p}`;

const testNotSupportsFeatured = async (t, p) => {
    const provider = providers[p];

    await t.throws(provider.getFeaturedChannels(), Error, "doesn't implement getFeaturedChannels");
    await t.throws(provider.search(), Error, "doesn't implement search");
};
testNotSupportsFeatured.title = (title, p) => `Support featured false implementation of ${p}`;

const testRequests = async (t, p) => {
    const channels = [ getChannel() ],
        users = [ getUser() ];
    const provider = providers[p],
        originalQS = provider._qs;
    let prom;

    provider._setQs(getMockQS(originalQS));
    await t.throws(provider.getChannelDetails("test"), Error, 'getChannelDetails throws');
    prom = await provider._qs.promise;
    t.is(typeof prom, "string");

    provider._setQs(getMockQS(originalQS));
    await t.throws(provider.updateChannel("test"), Error, 'updateChannel throws');
    prom = await provider._qs.promise;
    t.is(typeof prom, "string");

    provider._setQs(getMockQS(originalQS));
    // Why not expectReject? Because pagination helpered implementations won't fail.
    await provider.updateChannels(channels).then(() => {
        // ignore
    }, () => true);
    prom = await provider._qs.promise;
    t.is(typeof prom, "string");

    if(provider.enabled && !IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
        const requestConfig = provider.updateRequest();
        t.true("getURLs" in requestConfig);
        t.true("onComplete" in requestConfig);
        t.is(typeof requestConfig.getURLs, "function");
        t.is(typeof requestConfig.onComplete, "function");
        const urls = requestConfig.getURLs();
        t.true("then" in urls);
        urls.catch(console.warn);
        const complete = requestConfig.onComplete({}, '');
        t.true("then" in urls);
        complete.catch(console.warn);

        if("headers" in requestConfig) {
            t.is(typeof requestConfig.headers, "object");
        }
        t.false("priority" in requestConfig);
        t.false("requeue" in requestConfig);

        provider._setQs(getMockQS(originalQS));
        provider.removeRequest();
        prom = await provider._qs.promise;
        t.is(prom, originalQS.HIGH_PRIORITY);
    }

    if(provider.supports.favorites) {
        provider._setQs(getMockQS(originalQS));
        await t.throws(provider.getUserFavorites("test"), Error, 'getUserFavorrites throws');
        prom = await provider._qs.promise;
        t.is(typeof prom, "string");

        if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
            const requestConfig = provider.updateFavsRequest(users);
            t.true("getURLs" in requestConfig);
            t.true("onComplete" in requestConfig);
            t.is(typeof requestConfig.getURLs, "function");
            t.is(typeof requestConfig.onComplete, "function");
            const urls = requestConfig.getURLs();
            t.true("then" in urls);
            urls.catch(console.warn);
            const complete = requestConfig.onComplete({});
            t.true("then" in urls);
            complete.catch(console.warn);

            if("headers" in requestConfig) {
                t.is(typeof requestConfig.headers, "object");
            }
            t.false("priority" in requestConfig);
            t.false("requeue" in requestConfig);

            provider._setQs(getMockQS(originalQS));
            provider.removeFavsRequest();
            prom = await provider._qs.promise;
            t.is(prom, originalQS.LOW_PRIORITY);
        }
    }
    // else is tested in testSupports

    if(provider.supports.featured) {
        provider._setQs(getMockQS(originalQS));
        await t.throws(provider.getFeaturedChannels(), Error, 'getFeaturedChannels throws');
        prom = await provider._qs.promise;
        t.is(typeof prom, "string");

        provider._setQs(getMockQS(originalQS));
        await t.throws(provider.search("test"), Error, 'search throws');
        prom = await provider._qs.promise;
        t.is(typeof prom, "string");
    }
    // else is tested in testSupports

    provider._setQs(originalQS);
};

const list = new ChannelList();
const testMockAPI = async (t, p) => {
    const provider = providers[p],
        originalQS = provider._qs;
    let ret, live;

    provider._setQs(getMockAPIQS(originalQS, p));

    ret = await provider.getChannelDetails("test");
    t.true(ret instanceof Channel, "getChannelDetails resolves to a channel");
    t.is(ret.uname, "test", "test channel channel detail gets the username test");
    t.is(ret.type, p, "getChannelDetails resolves to a channel with correct type");
    t.false(await ret.live.isLive(LiveState.TOWARD_OFFLINE), "Test channel is not live");

    live = await provider.getChannelDetails("live");
    t.true(live instanceof Channel, "getChannelDetails for a live channel resolves to a channel");
    t.is(live.uname, "live", "Channel details username for live is correct");
    t.is(live.type, p, "live channel has the correct type");
    // live status knowledge is no requirement for getChannelDetails.

    ret = await provider.updateChannel(ret.login);
    t.true(ret instanceof Channel, "updateChannel resolves to a channel");
    t.is(ret.uname, "test", "Username of test is correct for updateChannel");
    t.is(ret.type, p, "updateChannel resolves to a channel with correct type");
    t.false(await ret.live.isLive(LiveState.TOWARD_OFFLINE), "Updated test channel still isn't live");

    live = await provider.updateChannel(live.login);
    t.true(live instanceof Channel, "updateChannel resolves to a channel with the live channel");
    t.is(live.uname, "live", "Username still is live after update");
    t.is(live.type, p, "Type of channel is still correct after update of a live channel");
    t.true(await live.live.isLive(LiveState.TOWARD_OFFLINE), "Live channel is live after update");

    ret.id = 1;
    live.id = 2;

    ret = await provider.updateChannels([
        ret,
        live
    ]);
    t.is(ret.length, 2, "Both channels were updated");
    await Promise.all(ret.map(async (chan) => {
        t.true(chan instanceof Channel, "updateChannels resolves to a channel");
        t.is(chan.type, p, "updateChannels resolves to a channel with correct type");
        t.is(await chan.live.isLive(LiveState.TOWARD_OFFLINE), chan.uname === "live", `Channel ${chan.uname} is live if it's the live channel, else it's offline after an update of multiple channels together`);
    }));

    if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
        await list.addChannels(ret);
        const spec = provider.updateRequest();
        if("headers" in spec) {
            t.is(typeof spec.headers, 'object');
        }
        const urls = await spec.getURLs();
        t.true(Array.isArray(urls));
        for(const url of urls) {
            const res = await provider._qs.queueRequest(url);
            let retval = await spec.onComplete(res, url);
            if(Array.isArray(retval)) {
                t.true(retval.length > 0, "There is mor than one item in the updated channels");
                [ retval ] = retval;
            }
            t.true(retval instanceof Channel, "updateRequest holds a channel");
            t.is(retval.type, p, "updateRequest event holds a channel with corect type");
            t.is(await retval.live.isLive(LiveState.TOWARD_OFFLINE), retval.uname === "live", `Update request correctly set live state of ${retval.uname}`);
        }

        const errorRet = await spec.onComplete({}, urls[0]);
        if(!errorRet) {
            t.is(errorRet, undefined);
        }
        else {
            t.true(errorRet instanceof Channel);
        }

        for(const chan of ret) {
            await list.removeChannel(chan.login, chan.type);
        }

        const noUrls = await spec.getURLs();
        t.true(Array.isArray(noUrls));
        t.is(noUrls.length, 0);
    }

    if(provider.supports.favorites) {
        ret = await provider.getUserFavorites("test");
        t.true(Array.isArray(ret), "getUserFavorites returned an array");
        t.is(ret.length, 2, "The returned array has exactly two elements");
        t.true(ret[0] instanceof User, "First element is the user");
        t.true(Array.isArray(ret[1]), "Second element is an array");
        t.is(ret[0].uname, "test", "User's name is test");
        t.is(ret[0].type, p, "returned user has the correct type");
        ret[1].forEach((ch) => t.is(ch.type, p, "Each returned channel has the correct type"));

        if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
            await list.addUser(ret[0]);
            const spec = provider.updateFavsRequest();
            if("headers" in spec) {
                t.is(typeof spec.headers, 'object');
            }
            const urls = await spec.getURLs();
            t.true(Array.isArray(urls));
            for(const url of urls) {
                const result = await provider._qs.queueRequest(url);
                let [
                    retval,
                    channels
                ] = await spec.onComplete(result, url);
                if(Array.isArray(retval)) {
                    [ retval ] = retval;
                }
                t.true(retval instanceof User, "updateduser is a user");
                t.is(retval.type, p, "updateduser has the correct type");
                t.is(retval.uname, "test", "updateduser is called test");
                t.true(Array.isArray(channels));
                if(channels.length) {
                    for(const channel of channels) {
                        t.true(channel instanceof Channel);
                    }
                }
            }

            const errorRet = await spec.onComplete({}, urls[0]);
            t.true(Array.isArray(errorRet));
            t.is(errorRet.length, 0);

            await list.removeUser(ret[0].login, ret[0].type);

            const noUrls = await spec.getURLs();
            t.true(Array.isArray(noUrls));
            t.is(noUrls.length, 0);
        }
    }

    if(provider.supports.featured) {
        ret = await provider.getFeaturedChannels();
        t.true(Array.isArray(ret), "Featured channels returns an array");
        t.true(ret.length > 0, "There are featured channels");
        ret.forEach((chan) => {
            t.true(chan instanceof Channel, "One of the featured channels is indeed a channel");
            t.is(chan.type, p, "It also has the type");
        });
        t.is(ret[0].uname, "featured", "And the first one's username is featured");

        ret = await provider.search("test");
        t.true(Array.isArray(ret), "Search returns an array");
        t.true(ret.length > 0, "There is more than one search result");
        ret.forEach((chan) => {
            t.true(chan instanceof Channel, "One of the search results is a channel");
            t.is(chan.type, p, "It also has the type");
        });
        t.is(ret[0].uname, "test", "The first found item has the username test");
    }
    provider._setQs(originalQS);
};

const testMock = async (t, p) => {
    await testRequests(t, p);
    //TODO not the nicest solution, since afterEach has to be called manually.
    if(apiEndpoints.includes(p)) {
        if(p === "beam") {
            providers[p]._getUserIdFromUsername.cache.clear();
        }
        await testMockAPI(t, p);
    }
};
testMock.title = (title, p) => `Mocked requests with ${p}`;

const macros = [
    testProviders,
    testMock
];

for(const p in providers) {
    //TODO something about the db transactions breaks if this isn't serial :(
    test.serial(macros, p);
    if(!providers[p].supports.favorites) {
        test(testNotSupportsFavorites, p);
    }
    else if(providers[p].supports.credentials) {
        test(testSupportsCredentials, p);
    }
    if(!providers[p].supports.featured) {
        test(testNotSupportsFeatured, p);
    }
}
