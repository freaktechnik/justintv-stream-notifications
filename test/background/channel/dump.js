/**
 * Test the dump module
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import * as dump from "../../../src/background/channel/dump";
import { getUser, getChannel } from "../../helpers/channel-user";
import prefs from "../../../src/background/preferences";

const CHANNELS_FIXTURE = [
        getChannel()
    ],
    USERS_FIXTURE = [
        getUser()
    ];

test("Dump creation", async (t) => {
    const dumpData = await dump.create(CHANNELS_FIXTURE, USERS_FIXTURE);

    t.true("channels" in dumpData, "channels were dumped");
    t.true("users" in dumpData, "users were dumped");
    t.true("prefs" in dumpData, "prefs were dumped");
    t.true("meta" in dumpData, "meta data was dumped");

    t.is(dumpData.channels.length, 1);
    t.deepEqual(dumpData.channels[0], CHANNELS_FIXTURE[0].serialize(), "Channels were serialized correctly");

    t.is(dumpData.users.length, 1);
    t.deepEqual(dumpData.users[0], USERS_FIXTURE[0].serialize(), "Users were serialized correctly");

    for(const branch in dumpData.prefs) {
        for(const name in dumpData.prefs[branch]) {
            t.is(await prefs.get(dump.PREFS_MAPPING[branch][name]), dumpData.prefs[branch][name], `Value for ${branch}.${name} exported correctly`);
        }
    }
});

test("Dump frozen", async (t) => {
    const checkObject = (obj, assertOk) => {
            for(const p in obj) {
                if(typeof obj[p] === "object" && !Array.isArray(obj[p])) {
                    checkObject(obj[p], assertOk);
                }
            }
            assertOk(Object.isFrozen(obj), "object is frozen");
        },
        dumpData = await dump.create(CHANNELS_FIXTURE, USERS_FIXTURE);

    checkObject(dumpData, (...args) => t.true(...args));
});

test.serial.todo("Copying");
/*
test.serial("Copying", (t) => {
    const CHANNELS_FIXTURE = [
            getChannel()
        ],
        USERS_FIXTURE = [
            getUser()
        ];

    dump.copy(CHANNELS_FIXTURE, USERS_FIXTURE);

    const copied = clipboard.get('text'),
        dumpData = JSON.parse(copied);

    t.true("channels" in dumpData, "Channels were dumped to clipboard");
    t.true("users" in dumpData, "users were dumped to clipboard");
    t.true("prefs" in dumpData, "prefs were dumped to clipboard");
    t.true("meta" in dumpData, "meta info was dumped to clipboard");

    t.is(dumpData.channels.length, 1);
    t.deepEqual(dumpData.channels[0], CHANNELS_FIXTURE[0].serialize(), "Channels survived dumping to clipboard");

    t.is(dumpData.users.length, 1);
    t.deepEqual(dumpData.users[0], USERS_FIXTURE[0].serialize(), "Users survived dumping to clipboard");

    for(let branch in dumpData.prefs) {
        for(let name in dumpData.prefs[branch]) {
            t.is(await prefs.get(dump.PREFS_MAPPING[branch][name]), dumpData.prefs[branch][name], `Value for ${branch}.${name} exported to clipboard correctly`);
        }
    }
});*/

test.serial("Prefs import", async (t) => {
    const dumpData = await dump.create(CHANNELS_FIXTURE, USERS_FIXTURE);

    await dump.load(dumpData);

    for(const branch in dump.PREFS_MAPPING) {
        for(const name in dump.PREFS_MAPPING[branch]) {
            t.is(await prefs.get(dump.PREFS_MAPPING[branch][name]), dumpData.prefs[branch][name], `Value for ${branch}.${name} imported correctly`);
        }
    }
});
