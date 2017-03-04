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
    const promise = when(sink, "updateuser");

    emit(providers[p], "updateuser", getUser('test', p));
    const { detail: user } = await promise;
    t.is(user.login, 'test');
    t.is(user.type, p);
};
testUpdateUser.title = (title, p) => `${title} for ${p}`;

const testUpdateChannels = async (t, p) => {
    const sink = new EventSink();
    const promise = when(sink, "updatedchannels");

    emit(providers[p], "updatedchannels", [ getChannel('test', p) ]);
    const { detail: channels } = await promise;
    t.is(channels.length, 1);
    t.is(channels[0].login, 'test');
    t.is(channels[0].type, p);
};

const testNewChannels = async (t, p) => {
    const sink = new EventSink();
    const promise = when(sink, "newchannels");

    emit(providers[p], "newchannels", [ getChannel('test', p) ]);
    const { detail: channels } = await promise;
    t.is(channels.length, 1);
    t.is(channels[0].login, 'test');
    t.is(channels[0].type, p);
};

for(const p in providers) {
    test('Update users', testUpdateUser, p);
    test('Update channels', testUpdateChannels, p);
    test('New channels', testNewChannels, p);
}
