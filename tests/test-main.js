var main = require('./main');

exports['test checkResponse'] = function(test) {
    test.assertEqual(main.checkResponse({'status':403}),0,"403 Errors are detected correctly");
    test.assertEqual(main.checkResponse({'status':500}),2,"500 Errors are detected correctly");
    test.assertEqual(main.checkResponse({'status':0}),0,"Offline is detected correctly");
    test.assertEqual(main.checkResponse({'status':200,'json':{'error':"couldn't find user"}}),0,"json user Errors are detected correctly");
    test.assertEqual(main.checkResponse({'status':200,'json':{'error':"couldn't find channel"}}),0,"json channel Errors are detected correctly");
    test.assertEqual(main.checkResponse({'status':200,'json':{'error':"a"}}),2,"other json Errors are detected correctly");
    test.assertEqual(main.checkResponse({'status':200,'json':{'rate_limited':true}}),2,"Ratelimit is detected correctly");
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
