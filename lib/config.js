/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 * Simple wrapper about the low-level prefs for add-on prefs
 * with the path the sdk also uses to store prefs
 */
var config = require("sdk/preferences/service");
var id = "extensions."+require("sdk/self").id+"@jetpack.";

exports.setPreference = function(name, value) {
    config.set(id+name,value);
};

exports.getPreference = function(name) {
    return config.get(id+name);
};
exports.hasPreference = function(name) {
    return congif.has(id+name);
};