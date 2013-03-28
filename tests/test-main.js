var main = require('./main');
var { Channel, ChannelList, Sources, Source } = require('./channellist');

exports['test 403 Error'] = function(test) {
    test.assertEqual(main.checkResponse({'status':403}),0,"403 Errors are detected correctly");
};
exports['test 500 Error'] = function(test) {
    test.assertEqual(main.checkResponse({'status':500}),2,"500 Errors are detected correctly");
};
exports['test json Error'] = function(test) {
    test.assertEqual(main.checkResponse({'status':200,'json':{'error':"couldn't find user"}}),2,"json Errors are detected correctly");
};
exports['test offline'] = function(test) {
    test.assertEqual(main.checkResponse({'status':0}),0,"Offline is detected correctly");
};
exports['test ratelimit'] = function(test) {
    test.assertEqual(main.checkResponse({'status':200,'json':{'rate_limited':true}}),2,"Ratelimit is detected correctly");
};
exports['test normal response'] = function(test) {
    test.assertEqual(main.checkResponse({'status':200,'json':{}}),1,"correct responses are detected correctly");
};

/*
exports['test changing button style'] = function(test) {
    test.waitUntilDone();
    // do something!
    main.main();
    main.setPanelAcess();
    test.done();
};*/
