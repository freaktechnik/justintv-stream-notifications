/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channels Manager content script
 */

// Add-on communication backend

var providers;
self.port.on("add", function(channel){
    addChannel(channel);
});
self.port.on("remove", function(channelId){
    removeChannel(channelId);
});
self.port.on("update", function(channel){
    updateChannel(channel);
});
self.port.on("adduser", function(user){
    addUser(user);
});
self.port.on("removeuser", function(userId){
    removeUser(userId);
});
self.port.on("initdata", function(options){
    providers = options.providers;

    var providerDropdown = document.querySelector("#providerDropdown");
    for(var provider in providers) {
        var option = document.createElement("option");
        option.value = provider;
        option.innerHTML = providers[provider].name;
        providerDropdown.appendChild(option);
    }

    options.channels.forEach(function(channel) {
        addChannel(channel);
    });
    options.users.forEach(function(user) {
        addUser(user);
    });
});

// Methods modifying the DOM

var channels = document.querySelector("#channels"),
    users    = document.querySelector("#users");

function addChannel(channel) {
    if(!hasChannel(channel.id)) {
        var channelNode = document.createElement("li");
        channelNode.id        = channel.id;
        channelNode.innerHTML = channel.login;
        channels.appendChild(channelNode);
    }
}

function addUser(user) {
    if(!hasUser(user.id)) {
        var userNode = document.createElement("li");
        userNode.id        = user.id;
        userNode.innerHTML = user.login;
        users.appendChild(userNode);
    }
}

function updateChannel(channel) {
    if(hasChannel(channel.id)) {
        var channelNode = channels.getElementById(channel.id);
        channelNode.innerHTML = channel.login;
    }
}

function removeChannel(channelId) {
    if(hasChannel(channelId)) {
    }
}

function removeUser(userId) {
    if(hasUser(userId)) {
    }
}

function hasChannel(channelId) {
    return !!channels.getElementById(channelId);
}

function hasUser(userId) {
    return !!users.getElementById(userId);
}

