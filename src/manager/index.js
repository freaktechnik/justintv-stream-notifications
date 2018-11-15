/**
 * Channels Manager content script
 *
 * @author Martin Giger
 * @license MPL 2.0
 */
//TODO clicking ok twice shows error panel -> ok sent while loading?
import {
    hide, show, copy
} from '../content/utils.js';
import { filter } from '../content/filter.js';
import Port from '../port.js';
import Tabbed from '../content/tabbed.js';
import ReadChannelList from '../read-channel-list.js';
import prefs from '../prefs.json';
import '../content/l10n.js';
import './channels-manager.css';
import '../content/shared.css';

let providers,
    permissionRequest = false;
const CHANNELS_TAB = 1,
    USERS_TAB = 2,
    CHANNEL_PREFIX = "channel",
    USER_PREFIX = "user",
    DARK_THEME = parseInt(prefs.theme.options.find((o) => o.label === "Dark").value, 10),
    filters = [
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
    },
    list = new ReadChannelList();

tabbed._tabbed = new Tabbed(tabbed, 'button');
document.getElementById("searchField").addEventListener("input", listener);
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
    return !!channels.querySelector(`#channel${channelId}`);
}

function hasUser(userId) {
    return !!users.querySelector(`#user${userId}`);
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
            items.push(parseInt(channels.selectedOptions[i].id.substring(CHANNEL_PREFIX.length), 10));
        }
    }
    else {
        for(let i = 0; i < users.selectedOptions.length; ++i) {
            items.push(parseInt(users.selectedOptions[i].id.substring(USER_PREFIX.length), 10));
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
    permissionRequest = false;
}

function resetDialogForms() {
    popup.querySelector("#channelNameField").value = "";
    hide(popup.querySelector("#loadingWrapper"));
    hide(popup.querySelector("#permissionsInfo"));
    hideError();
}

function showOptions() {
    const { options } = document.querySelector("#providerDropdown");
    for(let i = 0; i < options.length; ++i) {
        options[i].disabled = !providers[options[i].value].enabled;
    }
}

function hideOptions() {
    const { options } = document.querySelector("#providerDropdown");
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
            <img srcset="" sizes="50px">
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
            type = document.createTextNode(`${channel.slug} | ${providers[channel.type].name} | ${channel.id}`),
            evObj = new CustomEvent("itemadded", { detail: channelNode });
        image.sizes = "50px";
        image.srcset = Object.keys(channel.image)
            .map((s) => `${channel.image[s]} ${s}w`)
            .join(",");
        channelNode.id = `${CHANNEL_PREFIX}${channel.id}`;
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
            type = document.createTextNode(`${user.slug} | ${providers[user.type].name}`),
            evObj = new CustomEvent("itemadded", { detail: userNode });
        image.sizes = "50w";
        image.srcset = Object.keys(user.image)
            .map((s) => `${user.image[s]} ${s}w`)
            .join(",");
        userNode.id = `${USER_PREFIX}${user.id}`;
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
        const channelNode = channels.querySelector(`#channel${channel.id}`),
            span = channelNode.querySelector("span");
        channelNode.querySelector("img").srcset = Object.keys(channel.image)
            .map((s) => `${channel.image[s]} ${s}w`)
            .join(",");
        span.replaceChild(document.createTextNode(getChannelUname(channel)), span.firstChild);
    }
}

function updateUser(user) {
    if(hasUser(user.id)) {
        const userNode = users.querySelector(`#user${user.id}`),
            span = userNode.querySelector("span");
        userNode.querySelector("img").srcset = Object.keys(user.image)
            .map((s) => `${user.image[s]} ${s}w`)
            .join(",");
        span.replaceChild(document.createTextNode(user.uname), span.firstChild);
    }
}

function removeChannel(channelId) {
    if(hasChannel(channelId)) {
        document.getElementById(`channel${channelId}`).remove();
    }
}

function removeUser(userId) {
    if(hasUser(userId)) {
        document.getElementById(`user${userId}`).remove();
    }
}

function showError(msg) {
    hide(popup.querySelector("#loadingWrapper"));
    document.getElementById("channelNameField").setCustomValidity(msg);
    popup.querySelector('[data-l10n-id="cm_dialog_submit"]').click();
}

if(tabbed.querySelector("button.current") && tabbed.querySelector("button.current").dataset.tab == CHANNELS_TAB) {
    hide(document.querySelector("#autoAdd").parentNode);
    checkChannel();
}
else {
    checkUser();
}
updateSelect();

document.addEventListener("keydown", (evt) => {
    if(!popup.querySelector("dialog").hasAttribute("open")) {
        if(evt.key == "a" && evt.ctrlKey) {
            //TODO broken
            evt.preventDefault();
            let listEl;
            if(users.hasAttribute("hidden")) {
                listEl = channels;
            }
            else {
                listEl = users;
            }

            const items = listEl.querySelectorAll("option:not([hidden])");
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
    else if((evt.key == "w" && evt.ctrlKey) || evt.key == "Escape") {
        popup.querySelector("button[type='button']").click();
        evt.preventDefault();
    }
    else if(evt.key == "f" && evt.ctrlKey) {
        evt.preventDefault();
    }
}, {
    capture: true,
    passive: false
});

tabbed.addEventListener("tabchanged", (evt) => {
    if(evt.detail == CHANNELS_TAB) {
        hide(document.querySelector("#autoAdd").parentNode);
        document.querySelector(".toolbar").setAttribute("aria-controls", "channels");
        checkChannel();
    }
    else if(evt.detail == USERS_TAB) {
        //show(document.querySelector("#autoAdd").parentNode);
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
        port.request("debugdump")
            .then((dump) => copy(dump).catch((e) => console.warn("Could not copy debug dump", JSON.parse(dump), e)))
            .catch(console.error);
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
    if(!permissionRequest) {
        port.send("cancel", [
            popup.querySelector("#channelRadio").checked ? "channel" : "user",
            popup.querySelector("#providerDropdown").value,
            popup.querySelector("#channelNameField").value
        ]);
    }
    else {
        port.reply("requestpermission", false);
    }
    hideDialog();
    resetDialogForms();
});

popup.querySelector("#channelNameField").addEventListener("input", hideError, false);
popup.querySelector("#providerDropdown").addEventListener("change", hideError, false);

popup.querySelector("form").addEventListener("submit", (evt) => {
    evt.preventDefault();
    const field = popup.querySelector("#channelNameField");
    if(!popup.querySelector("#loadingWrapper").hidden || !field.value.length) {
        return;
    }
    hideError();

    if(!field.value.length) {
        return;
    }

    show(popup.querySelector("#loadingWrapper"));
    const p = popup.querySelector("#providerDropdown").value,
        provider = providers[p],
        sendMsg = () => {
            if(!permissionRequest) {
                const message = popup.querySelector("#channelRadio").checked ? "channel" : "user";
                port.send(`add${message}`, {
                    username: field.value,
                    type: p
                });
            }
            else {
                port.reply("requestpermission", true);
                permissionRequest = false;
            }
        };
    if(provider.optionalPermissions.length) {
        browser.permissions.request({
            origins: provider.optionalPermissions
        }).then((wasGranted) => {
            if(wasGranted) {
                sendMsg();
            }
            else {
                showError(browser.i18n.getMessage("permissionRequired"));
            }
        })
            .catch(showError);
    }
    else {
        sendMsg();
    }
}, false);

document.getElementById("options").addEventListener("click", (e) => {
    e.preventDefault();
    port.send("showoptions");
}, false);

const promisedProviders = new Promise((resolve) => {
    port.addEventListener("message", async ({ detail: message }) => {
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
        case "add": {
            const channel = await list.getChannel(message.payload);
            addChannel(channel);
            break;
        }
        case "remove":
            removeChannel(message.payload);
            break;
        case "update": {
            const channel = await list.getChannel(message.payload);
            updateChannel(channel);
            break;
        }
        case "adduser": {
            const user = await list.getUser(message.payload);
            addUser(user);
            break;
        }
        case "removeuser":
            removeUser(message.payload);
            break;
        case "updateuser": {
            const user = await list.getUser(message.payload);
            updateUser(user);
            break;
        }
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
            resolve(providers);
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
            document.body.classList.toggle("dark", message.payload === DARK_THEME);
            break;
        case "requestpermission": {
            const [
                provider,
                name,
                type
            ] = message.payload;
            popup.querySelector("#channelNameField").value = name;
            if(type === "channel") {
                popup.querySelector("#channelRadio").checked = true;
            }
            else {
                popup.querySelector("#userRadio").checked = true;
            }
            popup.querySelector("#providerDropdown").value = provider;
            show(popup.querySelector("#permissionsInfo"));
            permissionRequest = true;
            //TODO also show some helpful message that they have to manually add it from there in order to grant the required permissions
            showDialog();
            break;
        }
        default:
            // Do nothing
        }
    });
});

promisedProviders
    .then(() =>
        Promise.all([
            list.getChannelsByType().then((channelsObj) => {
                channelsObj.forEach(addChannel);
            }),
            list.getUsersByType().then((usersObj) => {
                usersObj.forEach(addUser);
            })
        ])
    )
    .catch(console.error);

// Add-on communication backend

port.send("ready");
