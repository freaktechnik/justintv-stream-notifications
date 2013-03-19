var main = require('./main');

exports['test 403 Error'] = function(test) {
    test.assertEqual(!main.noFatalError({'status':403}),true,"403 Errors are detected correctly");
};
exports['test 500 Error'] = function(test) {
    test.assertEqual(!main.noFatalError({'status':500}),false,"500 Errors are detected correctly");
};
exports['test json Error'] = function(test) {
    test.assertEqual(!main.noFatalError({'json':{'error':"couldn't find user"}}),true,"json Errors are detected correctly");
};