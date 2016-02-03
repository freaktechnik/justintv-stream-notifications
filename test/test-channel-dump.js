/**
 * Test the dump module
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const dump = requireHelper("../lib/channel/dump");
const clipboard = require("sdk/clipboard");
const { getUser, getChannel } = require("./channeluser/utils");
const { prefs } = require("sdk/simple-prefs");

exports.testDumpCreation = function(assert) {
    const CHANNELS_FIXTURE = [
        getChannel()
    ];
    const USERS_FIXTURE = [
        getUser()
    ];

    const dumpData = dump.create(CHANNELS_FIXTURE, USERS_FIXTURE);

    assert.ok("channels" in dumpData, "channels were dumped");
    assert.ok("users" in dumpData, "users were dumped");
    assert.ok("prefs" in dumpData, "prefs were dumped");
    assert.ok("meta" in dumpData, "meta data was dumped");

    assert.equal(dumpData.channels.length, 1);
    assert.deepEqual(dumpData.channels[0], CHANNELS_FIXTURE[0].serialize(), "Channels were serialized correctly");

    assert.equal(dumpData.users.length, 1);
    assert.deepEqual(dumpData.users[0], USERS_FIXTURE[0].serialize(), "Users were serialized correctly");
    
    for(let branch in dumpData.prefs) {
        for(let name in dumpData.prefs[branch]) {
            assert.equal(prefs[dump.PREFS_MAPPING[branch][name]], dumpData.prefs[branch][name], "Value for "+branch+"."+name+" exported correctly");
        }
    }
};

exports.testDumpFrozen = function(assert) {
    const checkObject = (obj, assertOk) => {
        for(let p in obj) {
            if(typeof obj[p] === "object" && !Array.isArray(obj[p])) {
                checkObject(obj[p], assertOk);
            }
        }
        assertOk(Object.isFrozen(obj), "object is frozen");
    };
    const CHANNELS_FIXTURE = [
        getChannel()
    ];
    const USERS_FIXTURE = [
        getUser()
    ];

    const dumpData = dump.create(CHANNELS_FIXTURE, USERS_FIXTURE);
    
    checkObject(dumpData, assert.ok.bind(assert));
};

exports.testCopying = function(assert) {
    const CHANNELS_FIXTURE = [
        getChannel()
    ];
    const USERS_FIXTURE = [
        getUser()
    ];

    dump.copy(CHANNELS_FIXTURE, USERS_FIXTURE);

    const copied = clipboard.get('text');

    const dumpData = JSON.parse(copied);

    assert.ok("channels" in dumpData, "Channels were dumped to clipboard");
    assert.ok("users" in dumpData, "users were dumped to clipboard");
    assert.ok("prefs" in dumpData, "prefs were dumped to clipboard");
    assert.ok("meta" in dumpData, "meta info was dumped to clipboard");

    assert.equal(dumpData.channels.length, 1);
    assert.deepEqual(dumpData.channels[0], CHANNELS_FIXTURE[0].serialize(), "Channels survived dumping to clipboard");

    assert.equal(dumpData.users.length, 1);
    assert.deepEqual(dumpData.users[0], USERS_FIXTURE[0].serialize(), "Users survived dumping to clipboard");
    
    for(let branch in dumpData.prefs) {
        for(let name in dumpData.prefs[branch]) {
            assert.equal(prefs[dump.PREFS_MAPPING[branch][name]], dumpData.prefs[branch][name], "Value for "+branch+"."+name+" exported to clipboard correctly");
        }
    }
};

exports.testPrefsImport = function(assert) {
    const CHANNELS_FIXTURE = [
        getChannel()
    ];
    const USERS_FIXTURE = [
        getUser()
    ];

    const dumpData = dump.create(CHANNELS_FIXTURE, USERS_FIXTURE);
    
    dump.import(dumpData);
    
    for(let branch in dump.PREFS_MAPPING) {
        for(let name in dump.PREFS_MAPPING[branch]) {
            assert.equal(prefs[dump.PREFS_MAPPING[branch][name]], dumpData.prefs[branch][name], "Value for "+branch+"."+name+" imported correctly");
        }
    }
};

require("sdk/test").run(exports);
