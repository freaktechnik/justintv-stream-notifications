/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
var { ChannelList } = require('../lib/channellist');
/*
exports['test ChannelList enumeration'] = function(test) {
    test.waitUntilDone();
    var channels = createDummyChannelList().channels;
    for(var type in channels) {
        for(var ch in channels[type]) {
            test.assertEqual(channels[type][ch] instanceof Channel,true,"ChannelList.channels property is a Channel");
        }
    }
    test.done();
};

exports['test ChannelList length property'] = function(test) {
    test.waitUntilDone();
    var channellist = createDummyChannelList();
    test.assertEqual(new ChannelList().channels.length,0,"ChannelList.channels length is initialized correctly");
    test.assertEqual(channellist.channels.propertyIsEnumerable('length'),false,"ChannelList.channels length property isn't enumerable");
    test.assertEqual(channellist.channels.length,2,"ChannelList.channels length gets extended correctly");

    channellist.initLength(5);
    test.assertEqual(channellist.channels.length,2,"ChannelList.channels.length gets set correctly when already existing");
    
    channellist.channels.length = 0;
    channellist.initLength(7);
    test.assertEqual(channellist.channels.length,7,"ChannelList.channels.length gets set correctly when null");
    
    test.done();
};

function createDummyChannelList() {
    var list = new ChannelList();
    var ch1 = baseprovider.channelInfo;
    var ch2 = baseprovider.channelInfo;
    ch1.login = 'someChannel';
    ch2.login = 'yetAnotherChannel';
    ch1.type = 'justintv';
    ch2.type = 'twitch';
    
    list.addChannel(ch1,
                    new Source(Source.TYPE_USERNAME,'someChannel','justintv'),true);
    list.addChannel(ch2,
                    new Source(Source.TYPE_USERNAME,'yetAnotherChannel','twitch'),true);
    return list;
}*/
