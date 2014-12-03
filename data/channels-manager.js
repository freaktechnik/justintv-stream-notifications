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
    users    = document.querySelector("#users"),
    popup    = document.querySelector("#popup");

if(document.querySelector(".tabbed a.current").dataset.tab == 1) {
    hide(document.querySelector("#autoAdd"));
    popup.querySelector("#channelRadio").setAttribute("checked", true);
}

document.querySelector("main.tabbed").addEventListener("tabchanged", function(evt) {
    if(evt.detail == 1) {
        hide(document.querySelector("#autoAdd"));
        popup.querySelector("#channelRadio").setAttribute("checked", true);
    }
    else if(evt.detail == 2) {
        show(document.querySelector("#autoAdd"));
        popup.querySelector("#userRadio").setAttribute("checked", true);
    }
});

document.querySelector("#showDialog").addEventListener("click", function(evt) {
    showDialog();
});

function hide(el) {
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
}

function show(el) {
    el.classList.remove("hidden");
    el.removeAttribute("aria-hidden");
}

function showDialog() {
    popup.querySelector("dialog").setAttribute("open", true);
    show(popup);
    document.querySelector("main").setAttribute("aria-hidden", true);
    popup.querySelector("dialog").focus();
}

function hideDialog() {
    popup.querySelector("dialog").removeAttribute("open");
    hide(popup);
    document.querySelector("main").removeAttribute("aria-hidden");
}

function resetDialogForms() {
    popup.querySelector("#channelNameField").value = "";
}

popup.querySelector("input[type='button']").addEventListener("click", function(evt) {
    hideDialog();
    resetDialogForms();
});

popup.addEventListener("keypress", function(evt) {
    if(evt.keyCode == 27) {
        hideDialog();
        resetDialogForms();
    }        
});

popup.querySelector("input[type='submit']").addEventListener("click", function(evt) {
    evt.preventDefault();
    popup.querySelector("dialog").removeAttribute("open");
    hideDialog();
    // save data
    resetDialogForms();
});

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

