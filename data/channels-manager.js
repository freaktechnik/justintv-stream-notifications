/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channels Manager content script
 */
//TODO clicking ok twice shows error panel -> ok sent while loading?

/* global unsafeWindow */

const { hide, show } = unsafeWindow;

let providers;

// Methods modifying the DOM

const channels = document.querySelector("#channels"),
    users = document.querySelector("#users"),
    popup = document.querySelector("#popup");

const hasOption = (provider) => {
    const providerDropdown = document.querySelector("#providerDropdown");
    for(let o of providerDropdown.options) {
        if(o.value == provider) {
            return true;
        }
    }
    return false;
};

function hideError() {
    document.getElementById("channelNameField").setCustomValidity("");
}

function hasChannel(channelId) {
    return !!channels.querySelector("#channel" + channelId);
}

function hasUser(userId) {
    return !!users.querySelector("#user" + userId);
}

function checkChannel() {
    popup.querySelector("#channelRadio").checked = true;
    popup.querySelector("#userRadio").checked = false;
}

function checkUser() {
    popup.querySelector("#channelRadio").checked = false;
    popup.querySelector("#userRadio").checked = true;
}

function getSelectedItemIds() {
    const items = [];
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

function removeSelectedItems(removeFollows) {
    const selected = getSelectedItemIds();
    if(users.hasAttribute("hidden")) {
        selected.forEach((channelId) => {
            self.port.emit("removechannel", channelId);
        });
    }
    else {
        selected.forEach((userId) => {
            self.port.emit("removeuser", userId, removeFollows);
        });
    }
}

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
    hide(popup.querySelector("#loadingWrapper"));
    hideError();
}

function showOptions() {
    const options = document.querySelector("#providerDropdown").options;
    for(let i = 0; i < options.length; ++i) {
        options[i].disabled = !providers[options[i].value].enabled;
    }
}

function hideOptions() {
    const options = document.querySelector("#providerDropdown").options;
    for(let i = 0; i < options.length; ++i) {
        if(!providers[options[i].value].supports.favorites) {
            options[i].disabled = true;
            options[i].selected = false;
        }
    }
}

function updateSelect() {
    hideError();
    if(popup.querySelector("#channelRadio").checked) {
        showOptions();
    }
    else {
        hideOptions();
    }
}

function onDialogDone() {
    popup.querySelector("dialog").removeAttribute("open");
    hideDialog();
    resetDialogForms();
}

function getChannelUname(channel) {
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
        const channelNode = document.createElement("option"),
            image = new Image(),
            small = document.createElement("small"),
            span = document.createElement("span"),
            title = document.createTextNode(getChannelUname(channel)),
            type = document.createTextNode(providers[channel.type].name),
            evObj = new CustomEvent("itemadded", { detail: channelNode });
        image.sizes = "50w";
        image.srcset = Object.keys(channel.image)
            .map((s) => channel.image[s] + " " + s + "w").join(",");
        channelNode.id = "channel" + channel.id;
        small.appendChild(type);
        span.appendChild(title);
        channelNode.appendChild(image);
        channelNode.appendChild(span);
        channelNode.appendChild(small);
        channels.appendChild(channelNode);
        channels.dispatchEvent(evObj);
    }
}

function addUser(user) {
    onDialogDone();
    if(!hasUser(user.id)) {
        const userNode = document.createElement("option"),
            image = new Image(),
            small = document.createElement("small"),
            span = document.createElement("span"),
            title = document.createTextNode(user.uname),
            type = document.createTextNode(providers[user.type].name),
            evObj = new CustomEvent("itemadded", { detail: userNode });
        image.sizes = "50w";
        image.srcset = Object.keys(user.image)
            .map((s) => user.image[s] + " " + s + "w").join(",");
        userNode.id = "user" + user.id;
        small.appendChild(type);
        span.appendChild(title);
        userNode.appendChild(image);
        userNode.appendChild(span);
        userNode.appendChild(small);
        users.appendChild(userNode);
        users.dispatchEvent(evObj);
    }
}

function updateChannel(channel) {
    if(hasChannel(channel.id)) {
        const channelNode = channels.querySelector("#channel" + channel.id),
            span = channelNode.querySelector("span");
        channelNode.querySelector("img").srcset = Object.keys(channel.image)
            .map((s) => channel.image[s] + " " + s + "w").join(",");
        span.replaceChild(document.createTextNode(getChannelUname(channel)), span.firstChild);
    }
}

function updateUser(user) {
    if(hasUser(user.id)) {
        const userNode = users.querySelector("#user" + user.id),
            span = userNode.querySelector("span");
        userNode.querySelector("img").srcset = Object.keys(user.image)
            .map((s) => user.image[s] + " " + s + "w").join(",");
        span.replaceChild(document.createTextNode(user.uname), span.firstChild);
    }
}

function removeChannel(channelId) {
    if(hasChannel(channelId)) {
        document.getElementById("channel" + channelId).remove();
    }
}

function removeUser(userId) {
    if(hasUser(userId)) {
        document.getElementById("user" + userId).remove();
    }
}

function showError(msg) {
    hide(popup.querySelector("#loadingWrapper"));
    document.getElementById("channelNameField").setCustomValidity(msg);
    popup.querySelector('[data-l10n-id="cm_dialog_submit"]').click();
}

if(document.querySelector(".tabbed a.current") && document.querySelector(".tabbed a.current").dataset.tab == 1) {
    hide(document.querySelector("#autoAdd").parentNode);
    checkChannel();
}
else {
    checkUser();
}
updateSelect();

document.addEventListener("keypress", (evt) => {
    if(!popup.querySelector("dialog").hasAttribute("open")) {
        if(evt.key == "a" && evt.ctrlKey) {
            evt.preventDefault();
            let list;
            if(users.hasAttribute("hidden")) {
                list = channels;
            }
            else {
                list = users;
            }

            const items = list.querySelectorAll("option:not([hidden])");
            for(let i = 0; i < items.length; ++i) {
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

document.querySelector("main.tabbed").addEventListener("tabchanged", (evt) => {
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

document.querySelector("#autoAdd").addEventListener("click", () => {
    self.port.emit("autoadd");
}, false);

document.querySelector("#showDialog").addEventListener("click", showDialog, false);

document.querySelector("#removeItem").addEventListener("click", (e) => {
    e.preventDefault();
    removeSelectedItems(e.shiftKey);
});

document.querySelector("a[rel='help']").addEventListener("click", (e) => {
    if(e.shiftKey) {
        e.preventDefault();
        self.port.emit("debugdump");
    }
});

document.querySelector("#updateItem").addEventListener("click", () => {
    const selected = getSelectedItemIds();
    if(users.hasAttribute("hidden")) {
        selected.forEach((channelId) => {
            self.port.emit("refreshchannel", channelId);
        });
    }
    else {
        selected.forEach((userId) => {
            self.port.emit("refreshuser", userId);
        });
    }
});

document.querySelector("#channelRadio").addEventListener("change", updateSelect);
document.querySelector("#userRadio").addEventListener("change", updateSelect);

popup.querySelector("button[type='button']").addEventListener("click", () => {
    self.port.emit("cancel",
                   popup.querySelector("#channelRadio").checked ? "channel" : "user",
                   popup.querySelector("#providerDropdown").value,
                   popup.querySelector("#channelNameField").value
                  );
    hideDialog();
    resetDialogForms();
});

popup.querySelector("#channelNameField").addEventListener("input", hideError, false);
popup.querySelector("#providerDropdown").addEventListener("change", hideError, false);

popup.querySelector("form").addEventListener("submit", (evt) => {
    evt.preventDefault();
    if(!popup.querySelector("#loadingWrapper").hidden) {
        return;
    }
    const field = popup.querySelector("#channelNameField");
    hideError();
    show(popup.querySelector("#loadingWrapper"));
    if(field.value.length > 0) {
        if(popup.querySelector("#channelRadio").checked) {
            self.port.emit("addchannel", field.value, popup.querySelector("#providerDropdown").value);
        }
        else {
            self.port.emit("adduser", field.value, popup.querySelector("#providerDropdown").value);
        }
    }
}, false);

document.getElementById("options").addEventListener("click", (e) => {
    e.preventDefault();
    self.port.emit("showoptions");
}, false);

// Add-on communication backend

self.port.emit("ready");

self.port.once("secondary", () => {
    show(document.querySelector("#secondary-manager"));
    document.querySelector("#secondary-manager button").addEventListener("click", (e) => {
        e.preventDefault();
        self.port.emit("focus");
    });
});

self.port.once("reload", () => {
    location.reload();
});

self.port.on("add", (channel) => {
    addChannel(channel);
});
self.port.on("remove", (channelId) => {
    removeChannel(channelId);
});
self.port.on("update", (channel) => {
    updateChannel(channel);
});
self.port.on("adduser", (user) => {
    addUser(user);
});
self.port.on("removeuser", (userId) => {
    removeUser(userId);
});
self.port.on("updateuser", (user) => {
    updateUser(user);
});
self.port.on("addproviders", (p) => {
    providers = p;
    const providerDropdown = document.querySelector("#providerDropdown");
    for(let provider in providers) {
        if(!hasOption(provider)) {
            const opt = new Option(providers[provider].name, provider);
            opt.disabled = !providers[provider].enabled;
            providerDropdown.add(opt);
        }
    }
});

self.port.on("isloading", () => {
    document.querySelector("main").classList.add("loading");
    users.classList.add("loading");
    channels.classList.add("loading");
});
self.port.on("doneloading", () => {
    document.querySelector("main").classList.remove("loading");
    users.classList.remove("loading");
    channels.classList.remove("loading");
});

self.port.on("error", (errorMsg) => {
    showError(errorMsg);
});

self.port.on("theme", (theme) => {
    document.body.classList.toggle("dark", theme === 1);
});

window.addEventListener("beforeunload", () => {
    self.port.emit("unload");
});
