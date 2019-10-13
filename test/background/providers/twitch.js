/**
 * Test twitch provider specific stuff.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test for Client-ID
 */
import test from 'ava';
import providers from "../../../src/background/providers";
import { getMockAPIQS } from "../../helpers/providers/mock-qs";
import { getChannel } from "../../helpers/channel-user";
import LiveState from "../../../src/background/channel/live-state";
import DatabaseManager from '../../../src/database-manager';

const provider = providers.twitch;

const originalQS = provider._qs;
test.before(() => {
    provider._setQs(getMockAPIQS(originalQS, "twitch"));
});

test.after(() => {
    provider._setQs(originalQS);
});

test("Hosting to offline 1", async (t) => {
    // hosting endpoint is empty
    const hostingChannel = getChannel("0", "twitch");
    hostingChannel.live = new LiveState(LiveState.REDIRECT);

    const channel = await provider._getHostedChannel(hostingChannel);
    t.false(await channel.live.isLive(LiveState.TOWARD_LIVE), "Channel is now marked as offline because there is no info on this channel");
});

test("Hosting to offline 2", async (t) => {
    // hosting endpoint doesn't return a hosting target (not hosting)
    const hostingChannel = await provider.updateChannel("24261394");
    hostingChannel.live = new LiveState(LiveState.REDIRECT);

    const channel = await provider._getHostedChannel(hostingChannel);
    t.false(await channel.live.isLive(LiveState.TOWARD_LIVE), "Channel is now marked as offline because it's not hosting anyone");
});

test("Hosting to offline 3", async (t) => {
    // hosting but host target is offline
    const hostingChannel = getChannel('17', 'twitch');
    hostingChannel.live.redirectTo(getChannel('19309473', 'twitch'));

    const channel = await provider._getHostedChannel(hostingChannel);
    t.false(await channel.live.isLive(LiveState.TOWARD_LIVE), "Channel is now marked as offline because the hosted channel is offline");
});

test.serial("Hosting", async (t) => {
    await DatabaseManager.open();

    const ret = await provider.updateChannel('19309473');
    t.is(ret.live.state, LiveState.REDIRECT);
    t.is(ret.live.alternateUsername, "NVIDIA");

    await DatabaseManager.close();
    DatabaseManager.loading = null; // eslint-disable-line require-atomic-updates
    DatabaseManager.error = null; // eslint-disable-line require-atomic-updates
});

test("Twitch channel language", async (t) => {
    const channel = await provider.updateChannel('1');
    t.is(channel.language, 'en');
});

test.todo("need to mock the result by the provider list");
/* TODO
test("Twitch Update Redirects", async (t) => {
    await provider._getChannelId({
        login: 'mlg_live'
    });

    const prom = when(provider, "updatedchannels");
    const channel = getChannel('mlg_live', 'twitch', 15);
    channel.uname = "MLG";
    provider._updateRequest([
        channel
    ]);
    const { detail: ret } = await prom;

    t.is(ret.length, 1, "Update returns the channel");
    t.is(ret[0].login, 'mlg', "Returned channel has the updated login");
    t.true(await ret[0].live.isLive(LiveState.TOWARD_LIVE), "Returned channel is live");
    t.is(ret[0].id, 15, "Returned channel still has its ID");
});
*/

test.todo("game resolution");
