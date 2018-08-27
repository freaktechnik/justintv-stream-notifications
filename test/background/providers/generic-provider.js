import test from 'ava';
import GenericProvider from '../../../src/background/providers/generic-provider';

test("GenericProvider", async (t) => {
    const genericProvider = new GenericProvider("test");
    t.is(genericProvider._type, "test");

    const maturePromise = genericProvider._mature();
    t.is(await maturePromise, true);

    t.is(genericProvider.name, "providertest");
    t.is(genericProvider.toString(), genericProvider.name);
    t.is(genericProvider.enabled, genericProvider._enabled);
    t.true("supports" in genericProvider);
    t.is(genericProvider._supportsFavorites, genericProvider.supports.favorites);
    t.is(genericProvider._supportsCredentials, genericProvider.supports.credentials);
    t.is(genericProvider._supportsFeatured, genericProvider.supports.featured);
    genericProvider._enabled = false;
    t.is(genericProvider.supports.favorites, genericProvider.enabled);
    t.is(genericProvider.supports.credentials, genericProvider.enabled);
    t.is(genericProvider.supports.featured, genericProvider.enabled);
    t.true(Array.isArray(genericProvider.authURL));
    t.is(genericProvider.authURL.length, 0);
    await t.throwsAsync(genericProvider.getUserFavorites(), Error, "cannot getUserFavorites");
    await t.throwsAsync(genericProvider.getChannelDetails(), Error, "cannot getChannelDetails");
    t.throws(genericProvider.updateFavsRequest, Error, "cannot updateFavsRequest");
    t.throws(genericProvider.updateRequest, Error, "cannot updateReq");
    await t.throwsAsync(genericProvider.updateChannel(), Error, "cannot updateChannel");
    await t.throwsAsync(genericProvider.updateChannels([ { login: "asdf" } ]), Error, "cannot updateChannels");

    // Test forwards
    let name = await new Promise((resolve) => {
        genericProvider.getChannelDetails = resolve;
        genericProvider.updateChannel("test");
    });
    t.is(name, "test", "updateChannel gets forwarded to getChannelDetails");

    name = await new Promise((resolve) => {
        genericProvider.updateChannel = resolve;
        genericProvider.updateChannels([ {
            login: "test"
        } ]);
    });
    t.is(name, "test", "updateChannels forwards to updateChannel");

    await t.throwsAsync(genericProvider.getFeaturedChannels(), Error, "cannot getFeaturedChannels");
    await t.throwsAsync(genericProvider.search(), Error, "cannot search");
});

test.todo("generic provider queueUpdateRequest");
test.todo("generic provider queueFavsRequest");
test.todo("generic provider intializes update requests from list");
