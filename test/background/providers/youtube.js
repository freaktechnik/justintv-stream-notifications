/**
 * Test youtube provider specific things
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import providers from "../../../src/background/providers";
import { getMockAPIQS, getMockQS } from "../../helpers/providers/mock-qs";

const youtube = providers.youtube;

test.serial("Get Channel ID Fallback", async (t) => {
    const oldQS = youtube._qs;
    youtube._setQs(getMockAPIQS(oldQS, "youtube"));

    const channelId = "UCCbfB3cQtkEAiKfdRQnfQvw",
        channel = await youtube.getChannelDetails(channelId);
    t.is(channel.login, channelId, "Channel has the correct ID");
    t.is(channel.type, "youtube");
    t.is(channel.uname, "Jesse Cox");

    youtube._setQs(oldQS);
});

test.serial("Get no Category", async (t) => {
    const oldQS = youtube._qs;
    youtube._setQs(getMockQS(oldQS));

    const categoryName = await youtube._getCategory('test');
    t.is(categoryName, "");

    youtube._setQs(oldQS);
});

test.todo("Pagination of subscriptions");
