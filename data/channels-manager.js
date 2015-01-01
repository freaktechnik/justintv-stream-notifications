/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channels Manager content script
 */
 
// Add-on communication backend

var providers;
self.port.on("add", function(channel) {
    addChannel(channel);
});
self.port.on("remove", function(channelId) {
    removeChannel(channelId);
});
self.port.on("update", function(channel) {
    updateChannel(channel);
});
self.port.on("adduser", function(user) {
    addUser(user);
});
self.port.on("removeuser", function(userId) {
    removeUser(userId);
});
self.port.on("updateuser", function(user) {
    updateUser(user);
});
self.port.on("initdata", function(options){
    providers = options.providers;

    var providerDropdown = document.querySelector("#providerDropdown");
    for(var provider in providers) {
        providerDropdown.add(new Option(providers[provider].name, provider));
    }

    options.channels.forEach(function(channel) {
        addChannel(channel);
    });
    options.users.forEach(function(user) {
        addUser(user);
    });
});

self.port.on("isloading", function() {
    document.querySelector("main").classList.add("loading");
    users.classList.add("loading");
    channels.classList.add("loading");
});
self.port.on("doneloading", function() {
    document.querySelector("main").classList.remove("loading");
    users.classList.remove("loading");
    channels.classList.remove("loading");
});

// Methods modifying the DOM

var channels = document.querySelector("#channels"),
    users    = document.querySelector("#users"),
    popup    = document.querySelector("#popup");

function checkChannel() {
    popup.querySelector("#channelRadio").checked = true;
    popup.querySelector("#userRadio").checked = false;
}

function checkUser() {
    popup.querySelector("#channelRadio").checked = false;
    popup.querySelector("#userRadio").checked = true;
}

if(document.querySelector(".tabbed a.current") && document.querySelector(".tabbed a.current").dataset.tab == 1) {
    hide(document.querySelector("#autoAdd").parentNode);
    checkChannel();
}
else
    checkUser();
updateSelect();
    
document.addEventListener("keypress", function(evt) {
    if(!popup.querySelector("dialog").hasAttribute("open")) {
        if(evt.key == "a" && evt.ctrlKey) {
            evt.preventDefault();
            var list;
            if(users.classList.contains("hidden"))
                list = channels;
            else
                list = users;
                
            var items = list.querySelectorAll("option:not(.hidden)");
            for(var i = 0; i < items.length; ++i) {
                items[i].selected = true;
            }
        }
        else if(evt.key == "Del") {
            removeSelectedItems();
        }
        else if(evt.key == "f" && evt.ctrlKey) {
            document.querySelector("#searchField").select();
        }
    }
});

document.querySelector("main.tabbed").addEventListener("tabchanged", function(evt) {
    if(evt.detail == 1) {
        hide(document.querySelector("#autoAdd").parentNode);
        document.querySelector(".toolbar").setAttribute("aria-controls", "channels");
        checkChannel();
    }
    else if(evt.detail == 2) {
        show(document.querySelector("#autoAdd").parentNode);
        document.querySelector(".toolbar").setAttribute("aria-controls", "users");
        checkUser();
    }
    updateSelect();
});

document.querySelector("#autoAdd").addEventListener("click", function(evt) {
    for(var provider in providers) {
        if(providers[provider].supports.credentials)
            self.port.emit("autoadd", provider);
    }
});

document.querySelector("#showDialog").addEventListener("click", showDialog);

function getSelectedItemIds() {
    var items = [];
    if(users.classList.contains("hidden")) {
        for(var i = 0; i < channels.selectedOptions.length; ++i) {
            items.push(parseInt(channels.selectedOptions[i].id.substring(7), 10));
        }
    }
    else {
        for(var i = 0; i < users.selectedOptions.length; ++i) {
            items.push(parseInt(users.selectedOptions[i].id.substring(4), 10));
        }
    }
    return items;
}

document.querySelector("#updateItem").addEventListener("click", function(evt) {
    var selected = getSelectedItemIds();
    if(users.classList.contains("hidden")) {
        selected.forEach(function(channelId) {
            self.port.emit("refreshchannel", channelId);
        });
    }
    else {
        selected.forEach(function(userId) {
            self.port.emit("refreshuser", userId);
        });
    }
});

function removeSelectedItems() {
    var selected = getSelectedItemIds();
    if(users.classList.contains("hidden")) {
        selected.forEach(function(channelId) {
            self.port.emit("removechannel", channelId);
        });
    }
    else {
        selected.forEach(function(userId) {
            self.port.emit("removeuser", userId);
        });
    }
}

document.querySelector("#removeItem").addEventListener("click", removeSelectedItems);

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

function showOptions() {
    var options = document.querySelector("#providerDropdown").options;
    for(var i = 0; i < options.length; ++i) {
        options[i].disabled = false;
    }
}

function hideOptions() {
    var options = document.querySelector("#providerDropdown").options;
    for(var i = 0; i < options.length; ++i) {
        if(!providers[options[i].value].supports.favorites) {
            options[i].disabled = true;
            options[i].selected = false;
        }
    }
}

function updateSelect() {
    if(popup.querySelector("#channelRadio").checked)
        showOptions();
    else
        hideOptions();
}

document.querySelector("#channelRadio").addEventListener("change", updateSelect);
document.querySelector("#userRadio").addEventListener("change", updateSelect);

popup.querySelector("input[type='button']").addEventListener("click", function(evt) {
    hideDialog();
    resetDialogForms();
});

popup.addEventListener("keypress", function(evt) {
    if(evt.key == "Esc") {
        hideDialog();
        resetDialogForms();
    }        
});

popup.querySelector("form").addEventListener("submit", function(evt) {
    evt.preventDefault();
    if(popup.querySelector("#channelNameField").value.length > 0) {
        popup.querySelector("dialog").removeAttribute("open");
        hideDialog();
        if(popup.querySelector("#channelRadio").checked)
            self.port.emit("addchannel", popup.querySelector("#channelNameField").value, popup.querySelector("#providerDropdown").value);
        else
            self.port.emit("adduser", popup.querySelector("#channelNameField").value, popup.querySelector("#providerDropdown").value);
        resetDialogForms();
    }
});

function getBestImageForSize(user, size) {
    size = parseInt(size, 10);
    // shortcut if there's an image with the size demanded
    if(user.image.hasOwnProperty(size.toString())) {
        return user.image[size];
    }
    
    // search next biggest image
    var index = Number.MAX_VALUE, biggest = 0;
    Object.keys(user.image).forEach(function(s) {
        s = parseInt(s, 10);
        if(s > size && s < index)
            index = s;
        if(s > biggest)
            biggest = s;
    });

    if(index > biggest)
        index = biggest;
    
    return user.image[index];
}

var filters = [
                {
                    subtarget: "span"
                },
                {
                    subtarget: "small"
                }
            ];

function addChannel(channel) {
    /*
        DOM structure:
        <option id="channelId">
            <img src="">
            <span>
                Username
            </span>
            <small>
                Type
            </small>
        </option>
    */
    if(!hasChannel(channel.id)) {
        var channelNode = document.createElement("option"),
            image       = new Image(),
            small       = document.createElement("small"),
            span        = document.createElement("span"),
            title       = document.createTextNode(channel.uname),
            type        = document.createTextNode(providers[channel.type].name);
        image.src       = getBestImageForSize(channel, 50);
        channelNode.id  = "channel"+channel.id;
        small.appendChild(type);
        span.appendChild(title);
        channelNode.appendChild(image);
        channelNode.appendChild(span);
        channelNode.appendChild(small);
        channels.appendChild(channelNode);
        var evObj = new CustomEvent("itemadded", { detail: channelNode });
        channels.dispatchEvent(evObj);
    }
}

function addUser(user) {
    if(!hasUser(user.id)) {
        var userNode = document.createElement("option");
            image    = new Image(),
            small    = document.createElement("small"),
            span     = document.createElement("span"),
            title    = document.createTextNode(user.uname),
            type     = document.createTextNode(providers[user.type].name);
        image.src    = getBestImageForSize(user, 50);
        userNode.id  = "user"+user.id;
        small.appendChild(type);
        span.appendChild(title);
        userNode.appendChild(image);
        userNode.appendChild(span);
        userNode.appendChild(small);
        users.appendChild(userNode);
        var evObj = new CustomEvent("itemadded", { detail: userNode });
        users.dispatchEvent(evObj);
    }
}

function updateChannel(channel) {
    if(hasChannel(channel.id)) {
        var channelNode = channels.querySelector("#channel"+channel.id),
            span        = channelNode.querySelector("span");
        channelNode.querySelector("img").src = getBestImageForSize(channel, 50);
        span.replaceChild(document.createTextNode(channel.uname), span.firstChild);
    }
}

function updateUser(user) {
    if(hasUser(user.id)) {
        var userNode = users.querySelector("#user"+user.id),
            span     = userNode.querySelector("span");
        userNode.querySelector("img").src = getBestImageForSize(user, 50);
        span.replaceChild(document.createTextNode(user.uname), span.firstChild);
    }
}

function removeChannel(channelId) {
    if(hasChannel(channelId)) {
        document.getElementById("channel"+channelId).remove();
    }
}

function removeUser(userId) {
    if(hasUser(userId)) {
        document.getElementById("user"+userId).remove();
    }
}

function hasChannel(channelId) {
    return !!channels.querySelector("#channel"+channelId);
}

function hasUser(userId) {
    return !!users.querySelector("#user"+userId);
}

