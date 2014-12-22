/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
var { exactArraySearch, randomDelayNumber } = require('../lib/utils');

exports['test exactArraySearch'] = function(assert) {
    assert.ok(exactArraySearch([1,2,3,4],1));
    assert.ok(exactArraySearch(['1','2','3','4'],'1'));
    assert.ok(!exactArraySearch([1,2,3,4],0));
    assert.ok(exactArraySearch([1,2,3,4],1),false);
    assert.ok(!exactArraySearch([1,2,3,4],1,true));
    assert.ok(!exactArraySearch([{'login':'a'},{'login':'b'},{'login':'c'},{'login':'d'}],'a'));
    assert.ok(exactArraySearch([{'login':'a'},{'login':'b'},{'login':'c'},{'login':'d'}],'a',true));
};

exports['test randomDelayNumber'] = function(assert, done) {    
    for(var i = 0, first; i<100; i++) {
        first = randomDelayNumber();
        assert.equal(typeof(first),'number',(i+1)+"th random delay number is a number");
        assert.ok(first>100, (i+1)+"th random delay number is bigger 100");
        assert.ok(first<115, (i+1)+"th random delay number is smaller than 115");
    }
    done();
};

require("sdk/test").run(exports);

