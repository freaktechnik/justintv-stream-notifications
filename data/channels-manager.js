/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channels Manager content script
 */

/* global self */
/* global unsafeWindow */

// Add-on communication backend

var { hide, show } = unsafeWindow;

var providers;

self.port.emit("ready");

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
self.port.on("addproviders", (p) => {
    providers = p;
    var providerDropdown = document.querySelector("#providerDropdown");
    for(var provider in providers) {
        if(!hasOption(provider)) {
            let opt = new Option(providers[provider].name, provider);
            opt.disabled = !providers[provider].enabled;
            providerDropdown.add(opt);
        }
    }
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

self.port.on("error", function(errorMsg) {
    showError(errorMsg);
});

// Methods modifying the DOM

var channels = document.querySelector("#channels"),
    users    = document.querySelector("#users"),
    popup    = document.querySelector("#popup");

var hasOption = (provider) => {
    var providerDropdown = document.querySelector("#providerDropdown");
    for(var o of providerDropdown.options) {
        if(o.value == provider) {
            return true;
        }
    }
    return false;
};

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
            if(users.hasAttribute("hidden"))
                list = channels;
            else
                list = users;

            var items = list.querySelectorAll("option:not([hidden])");
            for(var i = 0; i < items.length; ++i) {
                items[i].selected = true;
            }
        }
        else if(evt.key == "Delete") {
            removeSelectedItems(evt.shiftKey);
        }
        else if(evt.key == "f" && evt.ctrlKey) {
            document.querySelector("#searchField").select();
            evt.preventDefault();
        }
        else if(evt.key == "Help") {
            window.open(document.querySelector("[rel='help']").href);
        }
    }
    else {
        if((evt.key == "w" && evt.ctrlKey) || evt.key == "Escape") {
            hideDialog();
            resetDialogForms();
            evt.preventDefault();
        }
        else if(evt.key == "f" && evt.ctrlKey) {
            evt.preventDefault();
        }
    }
}, true);

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
}, false);

document.querySelector("#autoAdd").addEventListener("click", function(evt) {
    self.port.emit("autoadd");
}, false);

document.querySelector("#showDialog").addEventListener("click", showDialog, false);

function getSelectedItemIds() {
    let items = [];
    if(users.hasAttribute("hidden")) {
        for(let i = 0; i < channels.selectedOptions.length; ++i) {
            items.push(parseInt(channels.selectedOptions[i].id.substring(7), 10));
        }
    }
    else {
        for(let i = 0; i < users.selectedOptions.length; ++i) {
            items.push(parseInt(users.selectedOptions[i].id.substring(4), 10));
        }
    }
    return items;
}

document.querySelector("#updateItem").addEventListener("click", function(evt) {
    var selected = getSelectedItemIds();
    if(users.hasAttribute("hidden")) {
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

function removeSelectedItems(removeFollows) {
    var selected = getSelectedItemIds();
    if(users.hasAttribute("hidden")) {
        selected.forEach(function(channelId) {
            self.port.emit("removechannel", channelId);
        });
    }
    else {
        selected.forEach(function(userId) {
            self.port.emit("removeuser", userId, removeFollows);
        });
    }
}

document.querySelector("#removeItem").addEventListener("click", (e) => removeSelectedItems(e.shiftKey));

function showDialog() {
    popup.querySelector("dialog").setAttribute("open", true);
    show(popup);
    hideError();
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
    hideError();
}

function showOptions() {
    var options = document.querySelector("#providerDropdown").options;
    for(var i = 0; i < options.length; ++i) {
        options[i].disabled = !providers[options[i].value].enabled;
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
    hideError();
    if(popup.querySelector("#channelRadio").checked)
        showOptions();
    else
        hideOptions();
}

document.querySelector("#channelRadio").addEventListener("change", updateSelect);
document.querySelector("#userRadio").addEventListener("change", updateSelect);

popup.querySelector("button[type='button']").addEventListener("click", function(evt) {
    hideDialog();
    resetDialogForms();
});

popup.querySelector("#channelNameField").addEventListener("input", hideError, false);
popup.querySelector("#providerDropdown").addEventListener("change", hideError, false);

popup.querySelector("form").addEventListener("submit", function(evt) {
    evt.preventDefault();
    let field = popup.querySelector("#channelNameField");
    hideError();
    if(field.value.length > 0) {
        if(popup.querySelector("#channelRadio").checked)
            self.port.emit("addchannel", field.value, popup.querySelector("#providerDropdown").value);
        else
            self.port.emit("adduser", field.value, popup.querySelector("#providerDropdown").value);
    }
}, false);

function onDialogDone() {
    popup.querySelector("dialog").removeAttribute("open");
    hideDialog();
    resetDialogForms();
}

/** @todo improve this like in the twitch provider */
function getChannelUname(channel) {
    if(channel.type == "twitch")
        channel.uname = channel.uname.split(" ")[0];
    return channel.uname;
}

function addChannel(channel) {
    onDialogDone();
    /*
        DOM structure:
        <option id="channelId">
            <img srcset="" sizes="50w">
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
            title       = document.createTextNode(getChannelUname(channel)),
            type        = document.createTextNode(providers[channel.type].name);
        image.sizes = "50w";
        image.srcset = Object.keys(channel.image)
            .map((s) => channel.image[s] + " " + s + "w").join(",");
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
    onDialogDone();
    if(!hasUser(user.id)) {
        let userNode = document.createElement("option"),
            image    = new Image(),
            small    = document.createElement("small"),
            span     = document.createElement("span"),
            title    = document.createTextNode(user.uname),
            type     = document.createTextNode(providers[user.type].name);
        image.sizes = "50w";
        image.srcset = Object.keys(user.image)
            .map((s) => user.image[s] + " " + s + "w").join(",");
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
        channelNode.querySelector("img").srcset = Object.keys(channel.image)
            .map((s) => channel.image[s] + " " + s + "w").join(",");
        span.replaceChild(document.createTextNode(getChannelUname(channel)), span.firstChild);
    }
}

function updateUser(user) {
    if(hasUser(user.id)) {
        var userNode = users.querySelector("#user"+user.id),
            span     = userNode.querySelector("span");
        userNode.querySelector("img").srcset = Object.keys(user.image)
            .map((s) => user.image[s] + " " + s + "w").join(",");
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

function showError(msg) {
    document.getElementById("channelNameField").setCustomValidity(msg);
    popup.querySelector('[data-l10n-id="cm_dialog_submit"]').click();
}

function hideError() {
    document.getElementById("channelNameField").setCustomValidity("");
}
