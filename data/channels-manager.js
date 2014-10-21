/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channels Manager content script
 */

// Add-on communication backend

var providers;
addon.port.on("add", function(channel){
    addChannel(channel);
});
addon.port.on("remove", function(channelId){
    removeChannel(channelId);
});
addon.port.on("update", function(channel){
    updateChannel(channel);
});
addon.port.on("adduser", function(user){
    addUser(user);
});
addon.port.on("removeuser", function(userId){
    removeUser(userId);
});
addon.port.on("initdata", function(options){
    providers = options.providers;

    document.addEventListener("ready", function() {
        options.channels.forEach(function(channel) {
            addChannel(channel);
        });
        options.users.forEach(function(user) {
            addUser(user);
        });
    });
});

// Methods modifying the DOM

function addChannel(channel) {
    if(!hasChannel(channel.id)) {
    }
}

function addUser(user) {
    if(!hasUser(user.id)) {
    }
}

function updateChannel(channel) {
    if(hasChannel(channel.id)) {
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
}

function hasUser(userId) {
}
