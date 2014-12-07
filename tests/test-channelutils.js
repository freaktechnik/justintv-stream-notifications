/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO reactivate once e10s is reliable

const tabs = require("sdk/tabs");
var { Channel }  = require('../lib/channeluser'),
    channelUtils = require('../lib/channel-utils');

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
/*
exports['test open or focus tab'] = function(test, done) {
    var channel = getChannel(), tabToClose;
    tabs.once("open", function(tab) {
        test.assertEqual(tab.url, "http://foo.bar/lorem/archive");
        tab.once("activate", function(tab) {
            test.assertEqual(tab.url, "http://foo.bar/lorem/archive");
            channel.live = true;
            tabToClose.close();

            tab.once("activate", function(tab) {
                test.assertEqual(tab.url, "http://foo.bar/lorem/archive");
                tab.close();
                tabToClose.close();
                tabs.once("open", function(tab) {
                    test.assertEqual(tab.url, "http://foo.bar/lorem");
                    tab.close();
                    tabs.once("open", function(tab) {
                        test.assertEqual(tab.url, "http://foo.bar/lorem/archive");
                        tab.close(function() {
                            for(var t in tabs) {
                                tabs[t].close();
                            }
                            done();
                        });
                    });
                    channelUtils.selectOrOpenTab(channel, true);
                });
                channelUtils.selectOrOpenTab(channel);
            });
            tabs.once("open", function(tab) {
                tabToClose = tab;
                channelUtils.selectOrOpenTab(channel);
            });
            tabs.open({url:"http://example.com"});
        });
        tabs.once("open", function(tab) {
            tabToClose = tab;
            channelUtils.selectOrOpenTab(channel);
        });
        tabs.open({url:"http://example.com"});
    });
    channelUtils.selectOrOpenTab(channel);
};
*/
