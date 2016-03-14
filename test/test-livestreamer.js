/**
 * Livestreamer module tests
 * @author Martin Giger
 * @license MPL-2.0
 * @todo use a stub livestreamer executable?
 */
"use strict";

const requireHelper = require("./require_helper");
const livestreamer = requireHelper("../lib/livestreamer");
const { prefs } = require("sdk/simple-prefs");
const { when } = require("sdk/event/utils");
const system = require("sdk/system");

const getStubLivestreamer = () => {
    return "/usr/bin/nodejs "+system.env.PWD+"/test/livestreamer/livestreamer-stub.js";
};

/**
 * An URL that doesn't get rejected by livestreamer as not supported but still
 * not an actually working URL that could ever be streamed from.
 * @const
 */
const LAUNCHABLE_EXAMPLE_URL = "https://twitch.tv/cant-launch-this.html";

exports["test existance event"] = function*(assert) {
    let p = when(livestreamer.events, "existance");
    prefs.livestreamer_enabled = true;
    assert.equal((yield p), false);
    p = when(livestreamer.events, "existance");
    prefs.livestreamer_enabled = false;
    yield p;
    p = when(livestreamer.events, "existance");
    prefs.livestreamer_path = "/does/not/exist";
    yield p;
    prefs.livestreamer_path = "";
};

exports["test show property"] = (assert) => {
    const initialShow = livestreamer.show;
    prefs.livestreamer_enabled = true;
    assert.ok(!livestreamer.show);
    prefs.livestreamer_enabled = false;
    assert.equal(initialShow, livestreamer.show);
};

exports["test default property"] = (assert) => {
    assert.equal(livestreamer.default, prefs.livestreamer_enabled);
    prefs.livestreamer_enabled = true;
    assert.equal(livestreamer.default, prefs.livestreamer_enabled);
    prefs.livestreamer_enabled = false;
    assert.equal(livestreamer.default, prefs.livestreamer_enabled);
};

exports["test event object interface"] = (assert) => {
    assert.equal(typeof livestreamer.events, "object");
    assert.equal(typeof livestreamer.events.on, "function");
};

exports["test launch livestreamer that doesn't exist"] = function*(assert) {
    const initialPath = prefs.livestreamer_path;

    const p = when(livestreamer.events, "existance");
    prefs.livestreamer_path = "/does/not/exist";
    const code = yield livestreamer.launch("http://example.com");
    assert.ok(code == 1 || code === undefined);

    prefs.livestreamer_path = initialPath;
};

exports["test launch unsupported stream"] = function*(assert) {
    let counter = 0;
    const listener = () => ++counter;
    livestreamer.events.on("launch", listener);
    const code = yield livestreamer.launch("http://example.com");
    assert.equal(code, 1, "Couldn't launch");
    assert.equal(counter, 0, "Didn't even try to launch");

    livestreamer.events.off("launch", listener);
};

exports["test launch livestreamer"] = function*(assert) {
    const initialLivestreamer = prefs.livestreamer_path;
    const initialQuality = prefs.livestreamer_quality;
    const initialFallbackQuality = prefs.livestreamer_fallbackQuality;

    prefs.livestreamer_quality = "worst";
    prefs.livestreamer_fallbackQuality = "best";
    prefs.livestreamer_path = getStubLivestreamer();

    let counter = 0;
    const listener = () => ++counter;
    livestreamer.events.on("launch", listener);
    const code = yield livestreamer.launch(LAUNCHABLE_EXAMPLE_URL);
    assert.equal(code, 1, "Launch failed");
    assert.equal(counter, 2, "Launched exactly twice");

    prefs.livestreamer_quality = initialQuality;
    prefs.livestreamer_fallbackQuality = initialFallbackQuality;
    livestreamer.events.off("launch", listener);
    prefs.livestreamer_path = initialLivestreamer;
};

exports["test launch livestreamer with two equal presets"] = function*(assert) {
    const initialLivestreamer = prefs.livestreamer_path;
    const initialQuality = prefs.livestreamer_quality;
    prefs.livestreamer_quality = prefs.livestreamer_fallbackQuality;

    prefs.livestreamer_path = getStubLivestreamer();

    let counter = 0;
    const listener = () => ++counter;
    livestreamer.events.on("launch", listener);
    const code = yield livestreamer.launch(LAUNCHABLE_EXAMPLE_URL);
    assert.ok(code == 1 || code === undefined, "Exit code holds failed");
    assert.equal(counter, 1, "Only launched once");

    prefs.livestreamer_quality = initialQuality;
    livestreamer.events.off("launch", listener);
    prefs.livestreamer_path = initialLivestreamer;
};

exports["test launch livestreamer with extra arguments"] = function*(assert) {
    prefs.livestreamer_player = "vlc";
    prefs.livestreamer_extraArguments = "--help";

    const code = yield livestreamer.launch(LAUNCHABLE_EXAMPLE_URL);
    assert.equal(code, 1);

    prefs.livestreamer_extraArguments = "";
    prefs.livestreamer_placer = "";
};

require("sdk/test").run(exports);
