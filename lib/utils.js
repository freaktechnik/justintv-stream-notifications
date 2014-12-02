/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";

var { XMLHttpRequest } = require('sdk/net/xhr');

// searches in an array for a value
exports.exactArraySearch = function(array, string, rich) {
    if(!array) {
        return false;
    }
    var name;
    for(var item of array) {
        name = (rich?item.login:item);
        if(string==name)
            return true;
    }
    return false;
};


// loads the file from url and returns its contents

exports.getFileContents = function(url,callback) {
    if(!url.match(/chrome:\/\/|data:\/\/|resource:\/\/|file:\/\//)) {
        throw new Error('Only loading of local files is allowed');
    }
    var req = new XMLHttpRequest();
    function requestLoaded() {
        if(this.readyState==4)
            callback(this.responseText);
    };
    
    req.open('get',url,!!callback);
    if(callback)
        req.onreadystatechange = requestLoaded;
    req.send();
    console.log("sending request for "+url+" with current status "+req.readyState);
    if(!callback)
        return req.responseText;
};

// returns a random number between 100 and 115
exports.randomDelayNumber = function() {
    return 101+Math.floor(Math.random() * 14);
};
