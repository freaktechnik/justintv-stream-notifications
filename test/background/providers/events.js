/**
 * Test provider events
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import EventSink from "../../../src/background/providers/events";
import providers from "../../../src/background/providers";
import { getUser, getChannel } from "../../helpers/channel-user";
import { emit, when } from "../../../src/utils";

const testUpdateUser = async (t, p) => {
    const sink = new EventSink();
    const promise = when(sink, "updateduser");

    emit(providers[p], "updateduser", getUser('test', p));
    const { detail: user } = await promise;
    t.is(user.login, 'test');
    t.is(user.type, p);
};
testUpdateUser.title = (title, p) => `${title} for ${p}`;

const testChannels = async (t, p, event) => {
    const sink = new EventSink();
    const promise = when(sink, event);

    emit(providers[p], event, [ getChannel('test', p) ]);
    const { detail: channels } = await promise;
    t.is(channels.length, 1);
    t.is(channels[0].login, 'test');
    t.is(channels[0].type, p);
};
testChannels.title = (title, p) => `${title} for ${p}`;

for(const p in providers) {
    if(providers[p].supports.favorites) {
        test('Update users', testUpdateUser, p);
        test('New channels', testChannels, p, 'newchannels');
    }
    test('Update channels', testChannels, p, 'updatedchannels');
}
