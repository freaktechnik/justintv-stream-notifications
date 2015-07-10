/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO reactivate once e10s is reliable

const tabs = require("sdk/tabs");
var { Channel }  = require('../lib/channeluser'),
    channelUtils = require('../lib/channel-utils');
var { setTimeout } = require("sdk/timers");

function getChannel() {
    var channel = new Channel();
    channel.type = "test";
    channel.url.push('http://foo.bar/lorem');
    channel.archiveUrl = 'http://foo.bar/lorem/archive';
    channel.uname='lorem ipsum';
    channel.login='test';
    channel.logo={'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    return channel;
}

function sequentialTestRunner(tests, assert, done) {
    var i = 0;
    var next = () => {
        if(i == tests.length)
            done();
        else {
            console.log("Running async test function number", i);
            tests[i].call(tests[i++], assert, next);
        }
    };
    next();
}

exports['test open or focus tab'] = function(assert, done) {
    var channel = getChannel(), tabToClose;

    sequentialTestRunner([
        function(assert, done) { //0
            tabs.once("ready", done);
            channelUtils.selectOrOpenTab(channel);
        },
        function(assert, done) { //1
            assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");

            tabs.once("activate", (tab) => {
                tabToClose = tab;
                done();
            });
            tabs.open({url: "http://example.com"});
        },
        function(assert, done) { //2
            tabs.once("activate", done);
            channelUtils.selectOrOpenTab(channel);
        },
        function(assert, done) { //3
            tabToClose.close();

            assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");
            channel.live = true;

            tabs.once("activate", (tab) => {
                tabToClose = tab;
                done();
            });
            tabs.open({url: "http://example.com"});
        },
        function(assert, done) { //4
            tabs.once("activate", done);
            channelUtils.selectOrOpenTab(channel);
        },
        function(assert, done) { //5
            assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");

            tabToClose.close();
            tabs.activeTab.close();

            tabs.once("ready", done);
            channelUtils.selectOrOpenTab(channel);
        },
        function(assert, done) { //6
            assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem");
            tabs.activeTab.close();

            tabs.once("ready", done);
            channelUtils.selectOrOpenTab(channel, true);
        },
        function(assert, done) { //7
            assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");
            tabs.activeTab.close();
            done();
        }
    ], assert, done);
};

require("sdk/test").run(exports);

