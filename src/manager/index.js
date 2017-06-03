/**
 * Channels Manager content script
 *
 * @author Martin Giger
 * @license MPL 2.0
 */
//TODO clicking ok twice shows error panel -> ok sent while loading?
import { hide, show, copy } from '../content/utils';
import { filter } from '../content/filter';
import Port from '../port';
import Tabbed from '../content/tabbed';
import '../content/l10n';
import './channels-manager.css';
import '../content/shared.css';

let providers;
const filters = [
    {
        subtarget: "span"
    },
    {
        subtarget: "small"
    }
    ],
    listener = () => {
        filter(document.getElementById("searchField").value, document.querySelector(".selectableItemsList:not([hidden])"), filters);
    },
    port = new Port("manager", true),

// Methods modifying the DOM

    channels = document.querySelector("#channels"),
    users = document.querySelector("#users"),
    popup = document.querySelector("#popup"),
    tabbed = document.querySelector("main.tabbed"),
    hasOption = (provider) => {
        const providerDropdown = document.querySelector("#providerDropdown");
        for(const o of providerDropdown.options) {
            if(o.value == provider) {
                return true;
            }
        }
        return false;
    };

tabbed._tabbed = new Tabbed(tabbed);
document.getElementById("searchField").addEventListener("keyup", listener);
tabbed.addEventListener("tabchanged", listener);
channels.addEventListener("itemadded", () => {
    if(!document.getElementById("channels").hidden) {
        listener();
    }
});
users.addEventListener("itemadded", () => {
    if(!document.getElementById("users").hidden) {
        listener();
    }
});

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
            port.send("removechannel", channelId);
        });
    }
    else {
        selected.forEach((userId) => {
            port.send("removeuser", {
                userId,
                removeFollows
            });
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

if(tabbed.querySelector("a.current") && tabbed.querySelector("a.current").dataset.tab == 1) {
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

tabbed.addEventListener("tabchanged", (evt) => {
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
    port.send("autoadd");
}, false);

document.querySelector("#showDialog").addEventListener("click", showDialog, false);

document.querySelector("#removeItem").addEventListener("click", (e) => {
    e.preventDefault();
    removeSelectedItems(e.shiftKey);
});

document.querySelector("a[rel='help']").addEventListener("click", (e) => {
    if(e.shiftKey) {
        e.preventDefault();
        port.request("debugdump").then((dump) => {
            if(!copy(dump)) {
                console.warn("Could not copy debug dump", JSON.parse(dump));
            }
        });
    }
});

document.querySelector("#updateItem").addEventListener("click", () => {
    const selected = getSelectedItemIds();
    if(users.hasAttribute("hidden")) {
        selected.forEach((channelId) => {
            port.send("updatechannel", channelId);
        });
    }
    else {
        selected.forEach((userId) => {
            port.send("updatefavorites", userId);
        });
    }
});

document.querySelector("#channelRadio").addEventListener("change", updateSelect);
document.querySelector("#userRadio").addEventListener("change", updateSelect);

popup.querySelector("button[type='button']").addEventListener("click", () => {
    port.send("cancel", [
        popup.querySelector("#channelRadio").checked ? "channel" : "user",
        popup.querySelector("#providerDropdown").value,
        popup.querySelector("#channelNameField").value
    ]);
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
            port.send("addchannel", {
                username: field.value,
                type: popup.querySelector("#providerDropdown").value
            });
        }
        else {
            port.send("adduser", {
                username: field.value,
                type: popup.querySelector("#providerDropdown").value
            });
        }
    }
}, false);

document.getElementById("options").addEventListener("click", (e) => {
    e.preventDefault();
    port.send("showoptions");
}, false);

// Add-on communication backend

port.send("ready");

port.addEventListener("message", ({ detail: message }) => {
    switch(message.command) {
    case "secondary":
        show(document.querySelector("#secondary-manager"));
        document.querySelector("#secondary-manager button").addEventListener("click", (e) => {
            e.preventDefault();
            port.send("focus");
        });
        break;
    case "reload":
        location.reload();
        break;
    case "add":
        addChannel(message.payload);
        break;
    case "remove":
        removeChannel(message.payload);
        break;
    case "update":
        updateChannel(message.payload);
        break;
    case "adduser":
        addUser(message.payload);
        break;
    case "removeuser":
        removeUser(message.payload);
        break;
    case "updateuser":
        updateUser(message.payload);
        break;
    case "addproviders": {
        providers = message.payload;
        const providerDropdown = document.querySelector("#providerDropdown");
        for(const provider in providers) {
            if(!hasOption(provider)) {
                const opt = new Option(providers[provider].name, provider);
                opt.disabled = !providers[provider].enabled;
                providerDropdown.add(opt);
            }
        }
        break;
    }
    case "isloading":
        document.querySelector("main").classList.add("loading");
        users.classList.add("loading");
        channels.classList.add("loading");
        break;
    case "doneloading":
        document.querySelector("main").classList.remove("loading");
        users.classList.remove("loading");
        channels.classList.remove("loading");
        break;
    case "error": {
        let msg;
        if(message.payload) {
            msg = browser.i18n.getMessage("channelManagerLoadError", message.payload);
        }
        else {
            msg = browser.i18n.getMessage("channelManagerGenericError");
        }
        showError(msg);
        break;
    }
    case "theme":
        document.body.classList.toggle("dark", message.payload === 1);
        break;
    default:
        // Do nothing
    }
});
