var main = require('./main');
var { Channel, ChannelList, Sources, Source } = require('./channellist');

exports['test 403 Error'] = function(test) {
    test.assertEqual(main.noFatalError({'status':403}),false,"403 Errors are detected correctly");
};
exports['test 500 Error'] = function(test) {
    test.assertEqual(main.noFatalError({'status':500}),true,"500 Errors are detected correctly");
};
exports['test json Error'] = function(test) {
    test.assertEqual(main.noFatalError({'json':{'error':"couldn't find user"}}),false,"json Errors are detected correctly");
};
exports['test offline'] = function(test) {
    test.assertEqual(main.noFatalError({'status':0}),false,"Offline is detected correctly");
};

/*
exports['test cchanging button style'] = function(test) {
    test.waitUntilDone();
    // do something!
    main.main();
    main.setPanelAcess();
    test.done();
};*/

exports['test ChannelList enumeration'] = function(test) {
    test.waitUntilDone();
    var channels = createDummyChannelList().channels;
    var ok = true;
    for(var ch in channels) {
        test.assertEqual(channels[ch] instanceof Channel,true,"ChannelList.channels property is a Channel");
    }
    test.done();
};

exports['test ChannelList length property'] = function(test) {
    test.waitUntilDone();
    var channels = createDummyChannelList().channels;
    test.assertEqual(new ChannelList().channels.length,0,"ChannelList.channels length is initialized correctly");
    test.assertEqual(channels.propertyIsEnumerable('length'),false,"ChannelList.channels length property isn't enumerable");
    test.assertEqual(channels.length,2,"ChannelList.channels length gets extended correctly");
    test.done();
};

function createDummyChannelList() {
    var list = new ChannelList();
    list.addChannel({'login':'someChannel','channel_url':'http://twitch.tv/freaktechnik','title':'just a channel','image_url_tiny':'','image_url_medium':''},new Source(Source.TYPE_USER,'someChannel'),true);
    list.addChannel({'login':'yetAnotherChannel','channel_url':'http://twitch.tv/freaktechnik','title':'just another channel','image_url_tiny':'','image_url_medium':''},new Source(Source.TYPE_USER,'yetAnotherChannel'),true);
    return list;
}
