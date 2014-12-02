var { ChannelList } = require('../lib/channellist');

/*exports['test channel url comparison'] = function(test) {
    var channel = getFullChannel();
    test.assert(channel.compareUrl('http://foo.bar/lorem'));
    test.assert(channel.compareUrl('http://foo.bar/lorem/archive'));
    test.assert(!channel.compareUrl('http://asdf.com'));
};*/

// depends on source.getfirstSourceType()
/*exports['test first source object'] = function(test) {
    var source = getFullChannel().getFirstSourceObject();
    test.assertEqual(source.type,Source.TYPE_USER);
    test.assertEqual(source.name,Source.TYPE_USER);
    test.assertEqual(source.channelType,'justintv');
};

function getFullChannel() {
    return new Channel(Channel.FULL,new Source(Source.TYPE_USER,Source.TYPE_USER,'justintv'),{'url':'http://foo.bar/lorem','name':'lorem ipsum','login':'test','panelAvatar':'http://foo.bar/0.jpg',
                        'notificationAvatar':'http://foo.bar/1.jpg','backgroundColor':'#ffffff','textColor':'#000000','linkColor':'#cccccc'});
}

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
}

exports['test adding new request to queue'] = function(test) {
    var q = new UpdateQueue();
    var i = q.addRequest({})
    test.assertEqual(i,1);
    test.assertEqual(i,q.queue[0].id);
    test.assertEqual(typeof(q.queue[0]),'object');
};*/
