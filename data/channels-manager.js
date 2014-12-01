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
self.port.emit("init");

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
