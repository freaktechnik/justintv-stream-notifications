/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 57);
/******/ })
/************************************************************************/
/******/ ({

/***/ 11:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(5);
/* harmony export (immutable) */ __webpack_exports__["b"] = matches;
/* harmony export (immutable) */ __webpack_exports__["a"] = filter;
/**
 * Node filtering script
 * @author Martin Giger
 * @license MPL-2.0
 */


/* eslint-disable no-unused-vars */

/**
 * @typedef {Object} Rule
 * @property {string} [attribute="textContent"] - The attribute this rule checks,
 *                                                if it's "class", individual
 *                                                classes on the Node are
 *                                                checked instead of matching
 *                                                the whole attribute against
 *                                                the query.
 * @property {string} [subtarget] - A selector for a node contained within the
 *                                  checked node as a holder of the potentially
 *                                  matching attribute.
 */
/**
 * An array of rules, of which at least one has to match in order for the whole
 * target to be matching the query.
 *
 * @typedef {Array.<Rule>} RuleSet
 */

/**
 * Check the classes of a node for the query. Ignores the "hidden" class.
 *
 * @param {DOMNode} node - Node to check the classes on.
 * @param {string} query - The string to look for.
 * @returns {boolean} Indicates if the class has been found.
 */
function checkClasses(node, query) {
    let classes = node.className.toLowerCase();
    // remove hidden from the list of classes
    if (node.classList.contains("hidden")) {
        classes = classes.replace("hidden", "").trim();
    }

    return classes.includes(query);
}

/**
 * Check if a node matches the given query based on the rules. Matches are
 * case insensitive.
 *
 * @param {DOMNode} node - Node to search.
 * @param {string} query - Can be mutliple queries that all must match,
 *                         separated by a space.
 * @param {RuleSet} rules - Rules to apply the query to.
 * @returns {boolean} Indicates if the node matches the query or not.
 */
function matches(node, query, rules) {
    query = query.toLowerCase();
    let target = node;
    const queries = query.split(" ");
    return queries.every(q => {
        return rules.some(rule => {
            rule.attribute = rule.attribute || "textContent";
            if (rule.subtarget) {
                target = node.querySelector(rule.subtarget);
            } else {
                target = node;
            }

            if (rule.attribute == "class") {
                return checkClasses(target, q);
            } else {
                return target[rule.attribute].toLowerCase().includes(q);
            }
        });
    });
}

/**
 * Filter nodes inside a root by a query based on rules of which content strings
 * to check (textContent, classes, id etc.).
 *
 * @param {string} query - String to look for.
 * @param {DOMNode} root - Node to start search on.
 * @param {RuleSet} rules - Rules to apply to the query.
 * @returns {undefined}
 */
function filter(query, root, rules) {
    const nodes = root.children;

    for (let i = 0; i < nodes.length; ++i) {
        if (query) {
            if (matches(nodes[i], query, rules)) {
                __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils__["a" /* show */])(nodes[i]);
            } else {
                __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils__["b" /* hide */])(nodes[i]);
            }
        } else {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils__["a" /* show */])(nodes[i]);
        }
    }
}

/***/ }),

/***/ 12:
/***/ (function(module, exports) {

/**
 * Translates a HTMl page in the web l10n style from the Add-on SDK with
 * WebExtensions strings.
 * Large parts of the logic are very similar to the SDK implmentation.
 * All you have to do to use this in a document is load it.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

function translateElementAttributes(element) {
    const attrList = ['title', 'accesskey', 'alt', 'label', 'placeholder'],
          ariaAttrMap = {
        "ariaLabel": 'aria-label',
        "ariaValueText": 'aria-valuetext',
        "ariaMozHint": 'aria-moz-hint'
    },
          attrSeparator = '.';

    // Translate allowed attributes.
    for (const attribute of attrList) {
        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attribute);
        if (data && data != "??") {
            element.setAttribute(attribute, data);
        }
    }

    // Translate aria attributes.
    for (const attrAlias in ariaAttrMap) {
        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attrAlias);
        if (data && data != "??") {
            element.setAttribute(ariaAttrMap[attrAlias], data);
        }
    }
}

function translateElement(element = document) {

    // Get all children that are marked as being translateable.
    const children = element.querySelectorAll('*[data-l10n-id]');
    for (const child of children) {
        const data = browser.i18n.getMessage(child.dataset.l10nId);
        if (data && data != "??") {
            child.textContent = data;
        }
        translateElementAttributes(child);
    }
}

window.addEventListener("load", () => translateElement(), {
    capturing: false,
    passive: true
});

/***/ }),

/***/ 13:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(5);
/**
 * @author Martin Giger
 * @license MPL-2.0
 */



const SELECTED_CLASS = "current";

function Tabbed(el) {
    this.root = el;
    this.length = this.root.querySelectorAll(".tabstrip a").length;

    const tabContents = this.root.querySelectorAll(".tabcontent"),
          tabs = this.root.querySelectorAll(".tabstrip a"),
          clickListener = evt => {
        evt.preventDefault();
        this.select(parseInt(evt.currentTarget.dataset.tab, 10));
    },
          keyListener = evt => {
        evt.preventDefault();
        if (evt.key == "ArrowLeft" && this.current != 1) {
            // left arrow key
            this.select(this.current - 1);
        } else if (evt.key == "ArrowRight" && this.current < this.length) {
            // right arrow key
            this.select(this.current + 1);
        }
    };

    for (let i = 0; i < tabContents.length; ++i) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils__["b" /* hide */])(tabContents[i]);
    }

    for (let j = 0; j < tabs.length; ++j) {
        tabs[j].setAttribute("tabindex", -1);
        tabs[j].addEventListener("click", clickListener);
        tabs[j].addEventListener("keypress", keyListener);
    }

    if (this.root.querySelectorAll(".tabstrip a." + SELECTED_CLASS).length === 0 && this.length > 0) {
        this.select(1);
    } else {
        this.select(parseInt(this.root.querySelector(".tabstrip a." + SELECTED_CLASS).dataset.tab, 10));
    }
}

Tabbed.prototype.root = null;
Tabbed.prototype.length = 0;
Tabbed.prototype.current = 0;

Tabbed.prototype.select = function (index) {
    if (index <= this.length && index > 0) {
        const prevTab = this.root.querySelector(".tabstrip a." + SELECTED_CLASS),
              tab = this.getTabByIndex(index),
              evObj = new CustomEvent("tabchanged", { detail: index });
        if (prevTab) {
            prevTab.removeAttribute("aria-selected");
            prevTab.classList.remove(SELECTED_CLASS);
            prevTab.setAttribute("tabindex", -1);
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils__["b" /* hide */])(this.getContentByIndex(parseInt(prevTab.dataset.tab, 10)));
        }

        this.current = index;
        tab.focus();
        tab.setAttribute("aria-selected", "true");
        tab.classList.add(SELECTED_CLASS);
        tab.setAttribute("tabindex", 0);
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils__["a" /* show */])(this.getContentByIndex(index));
        this.root.dispatchEvent(evObj);
    }
};

Tabbed.prototype.getTabByIndex = function (index) {
    const tabs = this.root.querySelectorAll(".tabstrip a");
    for (let i = 0; i < tabs.length; ++i) {
        if (parseInt(tabs[i].dataset.tab, 10) == index) {
            return tabs[i];
        }
    }
    return undefined;
};

Tabbed.prototype.getContentByIndex = function (index) {
    const contents = this.root.querySelectorAll(".tabcontent");
    for (let i = 0; i < contents.length; ++i) {
        if (parseInt(contents[i].dataset.tab, 10) == index) {
            return contents[i];
        }
    }
    return undefined;
};

window.addEventListener("load", () => {
    const roots = document.querySelectorAll(".tabbed");
    for (let i = 0; i < roots.length; ++i) {
        roots[i]._tabbed = new Tabbed(roots[i]);
    }
});

/***/ }),

/***/ 14:
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),

/***/ 28:
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),

/***/ 5:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = hide;
/* harmony export (immutable) */ __webpack_exports__["a"] = show;
/* harmony export (immutable) */ __webpack_exports__["c"] = toggle;
/**
 * Helper function script.
 * @author Martin Giger
 * @license MPL-2.0
 */

/**
 * Hide an element. Unselects the element if it was previously selected.
 *
 * @param {DOMNode} el - Node to hide.
 * @returns {undefined}
 */
function hide(el) {
    el.setAttribute("hidden", true);
    if (el.selected) {
        el.selected = false;
    }
}

/**
 * Shows an element.
 *
 * @param {DOMNode} el - Node to show.
 * @returns {undefined}
 */
function show(el) {
    el.removeAttribute("hidden");
}

/**
 * Shows or hides an element, dependent on the condition. If the condition is
 * truthy the element will be shown.
 *
 * @param {DOMNode} node - Node to toggle.
 * @param {boolean} condition - Condition whether the node should be shown.
 * @returns {undefined}
 */
function toggle(node, condition) {
    if (condition) {
        show(node);
    } else {
        hide(node);
    }
}

/***/ }),

/***/ 57:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__content_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__content_filter__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__content_tabbed__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__content_l10n__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__content_l10n___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__content_l10n__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__channels_manager_css__ = __webpack_require__(28);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__channels_manager_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__channels_manager_css__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__content_shared_css__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__content_shared_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5__content_shared_css__);
/**
 * Channels Manager content script
 *
 * @author Martin Giger
 * @license MPL 2.0
 */
//TODO clicking ok twice shows error panel -> ok sent while loading?







let providers;
const filters = [{
    subtarget: "span"
}, {
    subtarget: "small"
}],
      listener = () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(document.getElementById("searchField").value, document.querySelector(".selectableItemsList:not([hidden])"), filters);
},
      port = browser.runtime.connect({ name: "manager" }),


// Methods modifying the DOM

channels = document.querySelector("#channels"),
      users = document.querySelector("#users"),
      popup = document.querySelector("#popup"),
      hasOption = provider => {
    const providerDropdown = document.querySelector("#providerDropdown");
    for (const o of providerDropdown.options) {
        if (o.value == provider) {
            return true;
        }
    }
    return false;
};

window.addEventListener("load", () => {
    document.getElementById("searchField").addEventListener("keyup", listener);
    document.querySelector("main.tabbed").addEventListener("tabchanged", listener);
    document.getElementById("channels").addEventListener("itemadded", () => {
        if (!document.getElementById("channels").hidden) {
            listener();
        }
    });
    document.getElementById("users").addEventListener("itemadded", () => {
        if (!document.getElementById("users").hidden) {
            listener();
        }
    });
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
    if (users.hasAttribute("hidden")) {
        for (let i = 0; i < channels.selectedOptions.length; ++i) {
            items.push(parseInt(channels.selectedOptions[i].id.substring(7), 10));
        }
    } else {
        for (let i = 0; i < users.selectedOptions.length; ++i) {
            items.push(parseInt(users.selectedOptions[i].id.substring(4), 10));
        }
    }
    return items;
}

function removeSelectedItems(removeFollows) {
    const selected = getSelectedItemIds();
    if (users.hasAttribute("hidden")) {
        selected.forEach(channelId => {
            port.postMessage({
                target: "removechannel",
                channelId
            });
        });
    } else {
        selected.forEach(userId => {
            port.postMessage({
                target: "removeuser",
                userId,
                removeFollows
            });
        });
    }
}

function showDialog() {
    popup.querySelector("dialog").setAttribute("open", true);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(popup);
    hideError();
    document.querySelector("main").setAttribute("aria-hidden", true);
    popup.querySelector("dialog").focus();
}

function hideDialog() {
    popup.querySelector("dialog").removeAttribute("open");
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(popup);
    document.querySelector("main").removeAttribute("aria-hidden");
}

function resetDialogForms() {
    popup.querySelector("#channelNameField").value = "";
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(popup.querySelector("#loadingWrapper"));
    hideError();
}

function showOptions() {
    const options = document.querySelector("#providerDropdown").options;
    for (let i = 0; i < options.length; ++i) {
        options[i].disabled = !providers[options[i].value].enabled;
    }
}

function hideOptions() {
    const options = document.querySelector("#providerDropdown").options;
    for (let i = 0; i < options.length; ++i) {
        if (!providers[options[i].value].supports.favorites) {
            options[i].disabled = true;
            options[i].selected = false;
        }
    }
}

function updateSelect() {
    hideError();
    if (popup.querySelector("#channelRadio").checked) {
        showOptions();
    } else {
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
    if (!hasChannel(channel.id)) {
        const channelNode = document.createElement("option"),
              image = new Image(),
              small = document.createElement("small"),
              span = document.createElement("span"),
              title = document.createTextNode(getChannelUname(channel)),
              type = document.createTextNode(providers[channel.type].name),
              evObj = new CustomEvent("itemadded", { detail: channelNode });
        image.sizes = "50w";
        image.srcset = Object.keys(channel.image).map(s => channel.image[s] + " " + s + "w").join(",");
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
    if (!hasUser(user.id)) {
        const userNode = document.createElement("option"),
              image = new Image(),
              small = document.createElement("small"),
              span = document.createElement("span"),
              title = document.createTextNode(user.uname),
              type = document.createTextNode(providers[user.type].name),
              evObj = new CustomEvent("itemadded", { detail: userNode });
        image.sizes = "50w";
        image.srcset = Object.keys(user.image).map(s => user.image[s] + " " + s + "w").join(",");
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
    if (hasChannel(channel.id)) {
        const channelNode = channels.querySelector("#channel" + channel.id),
              span = channelNode.querySelector("span");
        channelNode.querySelector("img").srcset = Object.keys(channel.image).map(s => channel.image[s] + " " + s + "w").join(",");
        span.replaceChild(document.createTextNode(getChannelUname(channel)), span.firstChild);
    }
}

function updateUser(user) {
    if (hasUser(user.id)) {
        const userNode = users.querySelector("#user" + user.id),
              span = userNode.querySelector("span");
        userNode.querySelector("img").srcset = Object.keys(user.image).map(s => user.image[s] + " " + s + "w").join(",");
        span.replaceChild(document.createTextNode(user.uname), span.firstChild);
    }
}

function removeChannel(channelId) {
    if (hasChannel(channelId)) {
        document.getElementById("channel" + channelId).remove();
    }
}

function removeUser(userId) {
    if (hasUser(userId)) {
        document.getElementById("user" + userId).remove();
    }
}

function showError(msg) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(popup.querySelector("#loadingWrapper"));
    document.getElementById("channelNameField").setCustomValidity(msg);
    popup.querySelector('[data-l10n-id="cm_dialog_submit"]').click();
}

if (document.querySelector(".tabbed a.current") && document.querySelector(".tabbed a.current").dataset.tab == 1) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(document.querySelector("#autoAdd").parentNode);
    checkChannel();
} else {
    checkUser();
}
updateSelect();

document.addEventListener("keypress", evt => {
    if (!popup.querySelector("dialog").hasAttribute("open")) {
        if (evt.key == "a" && evt.ctrlKey) {
            evt.preventDefault();
            let list;
            if (users.hasAttribute("hidden")) {
                list = channels;
            } else {
                list = users;
            }

            const items = list.querySelectorAll("option:not([hidden])");
            for (let i = 0; i < items.length; ++i) {
                items[i].selected = true;
            }
        } else if (evt.key == "Delete") {
            removeSelectedItems(evt.shiftKey);
        } else if (evt.key == "f" && evt.ctrlKey) {
            document.querySelector("#searchField").select();
            evt.preventDefault();
        } else if (evt.key == "Help") {
            window.open(document.querySelector("[rel='help']").href);
        }
    } else {
        if (evt.key == "w" && evt.ctrlKey || evt.key == "Escape") {
            hideDialog();
            resetDialogForms();
            evt.preventDefault();
        } else if (evt.key == "f" && evt.ctrlKey) {
            evt.preventDefault();
        }
    }
}, true);

document.querySelector("main.tabbed").addEventListener("tabchanged", evt => {
    if (evt.detail == 1) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(document.querySelector("#autoAdd").parentNode);
        document.querySelector(".toolbar").setAttribute("aria-controls", "channels");
        checkChannel();
    } else if (evt.detail == 2) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.querySelector("#autoAdd").parentNode);
        document.querySelector(".toolbar").setAttribute("aria-controls", "users");
        checkUser();
    }
    updateSelect();
}, false);

document.querySelector("#autoAdd").addEventListener("click", () => {
    port.postMessage({ target: "autoadd" });
}, false);

document.querySelector("#showDialog").addEventListener("click", showDialog, false);

document.querySelector("#removeItem").addEventListener("click", e => {
    e.preventDefault();
    removeSelectedItems(e.shiftKey);
});

document.querySelector("a[rel='help']").addEventListener("click", e => {
    if (e.shiftKey) {
        e.preventDefault();
        port.postMessage({ target: "debugdump" });
    }
});

document.querySelector("#updateItem").addEventListener("click", () => {
    const selected = getSelectedItemIds();
    if (users.hasAttribute("hidden")) {
        selected.forEach(channelId => {
            port.postMessage({
                target: "updatechannel",
                channelId
            });
        });
    } else {
        selected.forEach(userId => {
            port.postMessage({
                target: "updatefavorites",
                userId
            });
        });
    }
});

document.querySelector("#channelRadio").addEventListener("change", updateSelect);
document.querySelector("#userRadio").addEventListener("change", updateSelect);

popup.querySelector("button[type='button']").addEventListener("click", () => {
    port.postMessage({
        target: "cancel",
        values: [popup.querySelector("#channelRadio").checked ? "channel" : "user", popup.querySelector("#providerDropdown").value, popup.querySelector("#channelNameField").value]
    });
    hideDialog();
    resetDialogForms();
});

popup.querySelector("#channelNameField").addEventListener("input", hideError, false);
popup.querySelector("#providerDropdown").addEventListener("change", hideError, false);

popup.querySelector("form").addEventListener("submit", evt => {
    evt.preventDefault();
    if (!popup.querySelector("#loadingWrapper").hidden) {
        return;
    }
    const field = popup.querySelector("#channelNameField");
    hideError();
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(popup.querySelector("#loadingWrapper"));
    if (field.value.length > 0) {
        if (popup.querySelector("#channelRadio").checked) {
            port.postMessage({
                target: "addchannel",
                username: field.value,
                type: popup.querySelector("#providerDropdown").value
            });
        } else {
            port.postMessage({
                target: "adduser",
                username: field.value,
                type: popup.querySelector("#providerDropdown").value
            });
        }
    }
}, false);

document.getElementById("options").addEventListener("click", e => {
    e.preventDefault();
    port.postMessage({ target: "showoptions" });
}, false);

// Add-on communication backend

port.postMessage({ target: "ready" });

port.onMessage.addListener(message => {
    if (message.target == "secondary") {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.querySelector("#secondary-manager"));
        document.querySelector("#secondary-manager button").addEventListener("click", e => {
            e.preventDefault();
            port.postMessage({ target: "focus" });
        });
    } else if (message.target == "reload") {
        location.reload();
    } else if (message.target == "add") {
        addChannel(message.data);
    } else if (message.target == "remove") {
        removeChannel(message.data);
    } else if (message.target == "update") {
        updateChannel(message.data);
    } else if (message.target == "adduser") {
        addUser(message.data);
    } else if (message.target == "removeuser") {
        removeUser(message.data);
    } else if (message.target == "updateuser") {
        updateUser(message.data);
    } else if (message.target == "addproviders") {
        providers = message.data;
        const providerDropdown = document.querySelector("#providerDropdown");
        for (const provider in providers) {
            if (!hasOption(provider)) {
                const opt = new Option(providers[provider].name, provider);
                opt.disabled = !providers[provider].enabled;
                providerDropdown.add(opt);
            }
        }
    } else if (message.target == "isloading") {
        document.querySelector("main").classList.add("loading");
        users.classList.add("loading");
        channels.classList.add("loading");
    } else if (message.target == "doneloading") {
        document.querySelector("main").classList.remove("loading");
        users.classList.remove("loading");
        channels.classList.remove("loading");
    } else if (message.target == "error") {
        let msg;
        if (message.data) {
            msg = browser.i18n.getMessage("channelManagerLoadError", message.data);
        } else {
            msg = browser.i18n.getMessage("channelManagerGenericError");
        }
        showError(msg);
    } else if (message.target == "theme") {
        document.body.classList.toggle("dark", message.data === 1);
    }
});

/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYTJhNDM5MWNlMzhkMzA1ODYyYzg/M2M5NyoiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbnRlbnQvZmlsdGVyLmpzPzdkNDgiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbnRlbnQvbDEwbi5qcz80MmZkIiwid2VicGFjazovLy8uL3NyYy9jb250ZW50L3RhYmJlZC5qcz83ODkyIiwid2VicGFjazovLy8uL3NyYy9jb250ZW50L3NoYXJlZC5jc3M/ZWQ1MCIsIndlYnBhY2s6Ly8vLi9zcmMvbWFuYWdlci9jaGFubmVscy1tYW5hZ2VyLmNzcyIsIndlYnBhY2s6Ly8vLi9zcmMvY29udGVudC91dGlscy5qcz81OWRiIiwid2VicGFjazovLy8uL3NyYy9tYW5hZ2VyL2luZGV4LmpzIl0sIm5hbWVzIjpbImNoZWNrQ2xhc3NlcyIsIm5vZGUiLCJxdWVyeSIsImNsYXNzZXMiLCJjbGFzc05hbWUiLCJ0b0xvd2VyQ2FzZSIsImNsYXNzTGlzdCIsImNvbnRhaW5zIiwicmVwbGFjZSIsInRyaW0iLCJpbmNsdWRlcyIsIm1hdGNoZXMiLCJydWxlcyIsInRhcmdldCIsInF1ZXJpZXMiLCJzcGxpdCIsImV2ZXJ5IiwicSIsInNvbWUiLCJydWxlIiwiYXR0cmlidXRlIiwic3VidGFyZ2V0IiwicXVlcnlTZWxlY3RvciIsImZpbHRlciIsInJvb3QiLCJub2RlcyIsImNoaWxkcmVuIiwiaSIsImxlbmd0aCIsInNob3ciLCJoaWRlIiwidHJhbnNsYXRlRWxlbWVudEF0dHJpYnV0ZXMiLCJlbGVtZW50IiwiYXR0ckxpc3QiLCJhcmlhQXR0ck1hcCIsImF0dHJTZXBhcmF0b3IiLCJkYXRhIiwiYnJvd3NlciIsImkxOG4iLCJnZXRNZXNzYWdlIiwiZGF0YXNldCIsImwxMG5JZCIsInNldEF0dHJpYnV0ZSIsImF0dHJBbGlhcyIsInRyYW5zbGF0ZUVsZW1lbnQiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJjaGlsZCIsInRleHRDb250ZW50Iiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNhcHR1cmluZyIsInBhc3NpdmUiLCJTRUxFQ1RFRF9DTEFTUyIsIlRhYmJlZCIsImVsIiwidGFiQ29udGVudHMiLCJ0YWJzIiwiY2xpY2tMaXN0ZW5lciIsImV2dCIsInByZXZlbnREZWZhdWx0Iiwic2VsZWN0IiwicGFyc2VJbnQiLCJjdXJyZW50VGFyZ2V0IiwidGFiIiwia2V5TGlzdGVuZXIiLCJrZXkiLCJjdXJyZW50IiwiaiIsInByb3RvdHlwZSIsImluZGV4IiwicHJldlRhYiIsImdldFRhYkJ5SW5kZXgiLCJldk9iaiIsIkN1c3RvbUV2ZW50IiwiZGV0YWlsIiwicmVtb3ZlQXR0cmlidXRlIiwicmVtb3ZlIiwiZ2V0Q29udGVudEJ5SW5kZXgiLCJmb2N1cyIsImFkZCIsImRpc3BhdGNoRXZlbnQiLCJ1bmRlZmluZWQiLCJjb250ZW50cyIsInJvb3RzIiwiX3RhYmJlZCIsInNlbGVjdGVkIiwidG9nZ2xlIiwiY29uZGl0aW9uIiwicHJvdmlkZXJzIiwiZmlsdGVycyIsImxpc3RlbmVyIiwiZ2V0RWxlbWVudEJ5SWQiLCJ2YWx1ZSIsInBvcnQiLCJydW50aW1lIiwiY29ubmVjdCIsIm5hbWUiLCJjaGFubmVscyIsInVzZXJzIiwicG9wdXAiLCJoYXNPcHRpb24iLCJwcm92aWRlciIsInByb3ZpZGVyRHJvcGRvd24iLCJvIiwib3B0aW9ucyIsImhpZGRlbiIsImhpZGVFcnJvciIsInNldEN1c3RvbVZhbGlkaXR5IiwiaGFzQ2hhbm5lbCIsImNoYW5uZWxJZCIsImhhc1VzZXIiLCJ1c2VySWQiLCJjaGVja0NoYW5uZWwiLCJjaGVja2VkIiwiY2hlY2tVc2VyIiwiZ2V0U2VsZWN0ZWRJdGVtSWRzIiwiaXRlbXMiLCJoYXNBdHRyaWJ1dGUiLCJzZWxlY3RlZE9wdGlvbnMiLCJwdXNoIiwiaWQiLCJzdWJzdHJpbmciLCJyZW1vdmVTZWxlY3RlZEl0ZW1zIiwicmVtb3ZlRm9sbG93cyIsImZvckVhY2giLCJwb3N0TWVzc2FnZSIsInNob3dEaWFsb2ciLCJoaWRlRGlhbG9nIiwicmVzZXREaWFsb2dGb3JtcyIsInNob3dPcHRpb25zIiwiZGlzYWJsZWQiLCJlbmFibGVkIiwiaGlkZU9wdGlvbnMiLCJzdXBwb3J0cyIsImZhdm9yaXRlcyIsInVwZGF0ZVNlbGVjdCIsIm9uRGlhbG9nRG9uZSIsImdldENoYW5uZWxVbmFtZSIsImNoYW5uZWwiLCJ1bmFtZSIsImFkZENoYW5uZWwiLCJjaGFubmVsTm9kZSIsImNyZWF0ZUVsZW1lbnQiLCJpbWFnZSIsIkltYWdlIiwic21hbGwiLCJzcGFuIiwidGl0bGUiLCJjcmVhdGVUZXh0Tm9kZSIsInR5cGUiLCJzaXplcyIsInNyY3NldCIsIk9iamVjdCIsImtleXMiLCJtYXAiLCJzIiwiam9pbiIsImFwcGVuZENoaWxkIiwiYWRkVXNlciIsInVzZXIiLCJ1c2VyTm9kZSIsInVwZGF0ZUNoYW5uZWwiLCJyZXBsYWNlQ2hpbGQiLCJmaXJzdENoaWxkIiwidXBkYXRlVXNlciIsInJlbW92ZUNoYW5uZWwiLCJyZW1vdmVVc2VyIiwic2hvd0Vycm9yIiwibXNnIiwiY2xpY2siLCJwYXJlbnROb2RlIiwiY3RybEtleSIsImxpc3QiLCJzaGlmdEtleSIsIm9wZW4iLCJocmVmIiwiZSIsInZhbHVlcyIsImZpZWxkIiwidXNlcm5hbWUiLCJvbk1lc3NhZ2UiLCJhZGRMaXN0ZW5lciIsIm1lc3NhZ2UiLCJsb2NhdGlvbiIsInJlbG9hZCIsIm9wdCIsIk9wdGlvbiIsImJvZHkiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxt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QixpQkFBUzVGLFNBQVQsQ0FBbUIwRSxHQUFuQixDQUF1QixTQUF2QjtBQUNILEtBSkksTUFLQSxJQUFHdUcsUUFBUTFLLE1BQVIsSUFBa0IsYUFBckIsRUFBb0M7QUFDckNnQyxpQkFBU3ZCLGFBQVQsQ0FBdUIsTUFBdkIsRUFBK0JoQixTQUEvQixDQUF5Q3VFLE1BQXpDLENBQWdELFNBQWhEO0FBQ0FzQixjQUFNN0YsU0FBTixDQUFnQnVFLE1BQWhCLENBQXVCLFNBQXZCO0FBQ0FxQixpQkFBUzVGLFNBQVQsQ0FBbUJ1RSxNQUFuQixDQUEwQixTQUExQjtBQUNILEtBSkksTUFLQSxJQUFHMEcsUUFBUTFLLE1BQVIsSUFBa0IsT0FBckIsRUFBOEI7QUFDL0IsWUFBSTRKLEdBQUo7QUFDQSxZQUFHYyxRQUFRbkosSUFBWCxFQUFpQjtBQUNicUksa0JBQU1wSSxRQUFRQyxJQUFSLENBQWFDLFVBQWIsQ0FBd0IseUJBQXhCLEVBQW1EZ0osUUFBUW5KLElBQTNELENBQU47QUFDSCxTQUZELE1BR0s7QUFDRHFJLGtCQUFNcEksUUFBUUMsSUFBUixDQUFhQyxVQUFiLENBQXdCLDRCQUF4QixDQUFOO0FBQ0g7QUFDRGlJLGtCQUFVQyxHQUFWO0FBQ0gsS0FUSSxNQVVBLElBQUdjLFFBQVExSyxNQUFSLElBQWtCLE9BQXJCLEVBQThCO0FBQy9CZ0MsaUJBQVMrSSxJQUFULENBQWN0TCxTQUFkLENBQXdCaUYsTUFBeEIsQ0FBK0IsTUFBL0IsRUFBdUNnRyxRQUFRbkosSUFBUixLQUFpQixDQUF4RDtBQUNIO0FBQ0osQ0EvREQsRSIsImZpbGUiOiJtYW5hZ2VyL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gNTcpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGEyYTQzOTFjZTM4ZDMwNTg2MmM4IiwiLyoqXG4gKiBOb2RlIGZpbHRlcmluZyBzY3JpcHRcbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwtMi4wXG4gKi9cbmltcG9ydCB7IHNob3csIGhpZGUgfSBmcm9tICcuL3V0aWxzJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBSdWxlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2F0dHJpYnV0ZT1cInRleHRDb250ZW50XCJdIC0gVGhlIGF0dHJpYnV0ZSB0aGlzIHJ1bGUgY2hlY2tzLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiBpdCdzIFwiY2xhc3NcIiwgaW5kaXZpZHVhbFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzIG9uIHRoZSBOb2RlIGFyZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2VkIGluc3RlYWQgb2YgbWF0Y2hpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHdob2xlIGF0dHJpYnV0ZSBhZ2FpbnN0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBxdWVyeS5cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbc3VidGFyZ2V0XSAtIEEgc2VsZWN0b3IgZm9yIGEgbm9kZSBjb250YWluZWQgd2l0aGluIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tlZCBub2RlIGFzIGEgaG9sZGVyIG9mIHRoZSBwb3RlbnRpYWxseVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hpbmcgYXR0cmlidXRlLlxuICovXG4vKipcbiAqIEFuIGFycmF5IG9mIHJ1bGVzLCBvZiB3aGljaCBhdCBsZWFzdCBvbmUgaGFzIHRvIG1hdGNoIGluIG9yZGVyIGZvciB0aGUgd2hvbGVcbiAqIHRhcmdldCB0byBiZSBtYXRjaGluZyB0aGUgcXVlcnkuXG4gKlxuICogQHR5cGVkZWYge0FycmF5LjxSdWxlPn0gUnVsZVNldFxuICovXG5cbi8qKlxuICogQ2hlY2sgdGhlIGNsYXNzZXMgb2YgYSBub2RlIGZvciB0aGUgcXVlcnkuIElnbm9yZXMgdGhlIFwiaGlkZGVuXCIgY2xhc3MuXG4gKlxuICogQHBhcmFtIHtET01Ob2RlfSBub2RlIC0gTm9kZSB0byBjaGVjayB0aGUgY2xhc3NlcyBvbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBxdWVyeSAtIFRoZSBzdHJpbmcgdG8gbG9vayBmb3IuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gSW5kaWNhdGVzIGlmIHRoZSBjbGFzcyBoYXMgYmVlbiBmb3VuZC5cbiAqL1xuZnVuY3Rpb24gY2hlY2tDbGFzc2VzKG5vZGUsIHF1ZXJ5KSB7XG4gICAgbGV0IGNsYXNzZXMgPSBub2RlLmNsYXNzTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIC8vIHJlbW92ZSBoaWRkZW4gZnJvbSB0aGUgbGlzdCBvZiBjbGFzc2VzXG4gICAgaWYobm9kZS5jbGFzc0xpc3QuY29udGFpbnMoXCJoaWRkZW5cIikpIHtcbiAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMucmVwbGFjZShcImhpZGRlblwiLCBcIlwiKS50cmltKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuaW5jbHVkZXMocXVlcnkpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgbm9kZSBtYXRjaGVzIHRoZSBnaXZlbiBxdWVyeSBiYXNlZCBvbiB0aGUgcnVsZXMuIE1hdGNoZXMgYXJlXG4gKiBjYXNlIGluc2Vuc2l0aXZlLlxuICpcbiAqIEBwYXJhbSB7RE9NTm9kZX0gbm9kZSAtIE5vZGUgdG8gc2VhcmNoLlxuICogQHBhcmFtIHtzdHJpbmd9IHF1ZXJ5IC0gQ2FuIGJlIG11dGxpcGxlIHF1ZXJpZXMgdGhhdCBhbGwgbXVzdCBtYXRjaCxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHNlcGFyYXRlZCBieSBhIHNwYWNlLlxuICogQHBhcmFtIHtSdWxlU2V0fSBydWxlcyAtIFJ1bGVzIHRvIGFwcGx5IHRoZSBxdWVyeSB0by5cbiAqIEByZXR1cm5zIHtib29sZWFufSBJbmRpY2F0ZXMgaWYgdGhlIG5vZGUgbWF0Y2hlcyB0aGUgcXVlcnkgb3Igbm90LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hlcyhub2RlLCBxdWVyeSwgcnVsZXMpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XG4gICAgbGV0IHRhcmdldCA9IG5vZGU7XG4gICAgY29uc3QgcXVlcmllcyA9IHF1ZXJ5LnNwbGl0KFwiIFwiKTtcbiAgICByZXR1cm4gcXVlcmllcy5ldmVyeSgocSkgPT4ge1xuICAgICAgICByZXR1cm4gcnVsZXMuc29tZSgocnVsZSkgPT4ge1xuICAgICAgICAgICAgcnVsZS5hdHRyaWJ1dGUgPSBydWxlLmF0dHJpYnV0ZSB8fCBcInRleHRDb250ZW50XCI7XG4gICAgICAgICAgICBpZihydWxlLnN1YnRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IG5vZGUucXVlcnlTZWxlY3RvcihydWxlLnN1YnRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSBub2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihydWxlLmF0dHJpYnV0ZSA9PSBcImNsYXNzXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tDbGFzc2VzKHRhcmdldCwgcSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3J1bGUuYXR0cmlidXRlXS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBGaWx0ZXIgbm9kZXMgaW5zaWRlIGEgcm9vdCBieSBhIHF1ZXJ5IGJhc2VkIG9uIHJ1bGVzIG9mIHdoaWNoIGNvbnRlbnQgc3RyaW5nc1xuICogdG8gY2hlY2sgKHRleHRDb250ZW50LCBjbGFzc2VzLCBpZCBldGMuKS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcXVlcnkgLSBTdHJpbmcgdG8gbG9vayBmb3IuXG4gKiBAcGFyYW0ge0RPTU5vZGV9IHJvb3QgLSBOb2RlIHRvIHN0YXJ0IHNlYXJjaCBvbi5cbiAqIEBwYXJhbSB7UnVsZVNldH0gcnVsZXMgLSBSdWxlcyB0byBhcHBseSB0byB0aGUgcXVlcnkuXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyKHF1ZXJ5LCByb290LCBydWxlcykge1xuICAgIGNvbnN0IG5vZGVzID0gcm9vdC5jaGlsZHJlbjtcblxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZihxdWVyeSkge1xuICAgICAgICAgICAgaWYobWF0Y2hlcyhub2Rlc1tpXSwgcXVlcnksIHJ1bGVzKSkge1xuICAgICAgICAgICAgICAgIHNob3cobm9kZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaGlkZShub2Rlc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzaG93KG5vZGVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9jb250ZW50L2ZpbHRlci5qcyIsIi8qKlxuICogVHJhbnNsYXRlcyBhIEhUTWwgcGFnZSBpbiB0aGUgd2ViIGwxMG4gc3R5bGUgZnJvbSB0aGUgQWRkLW9uIFNESyB3aXRoXG4gKiBXZWJFeHRlbnNpb25zIHN0cmluZ3MuXG4gKiBMYXJnZSBwYXJ0cyBvZiB0aGUgbG9naWMgYXJlIHZlcnkgc2ltaWxhciB0byB0aGUgU0RLIGltcGxtZW50YXRpb24uXG4gKiBBbGwgeW91IGhhdmUgdG8gZG8gdG8gdXNlIHRoaXMgaW4gYSBkb2N1bWVudCBpcyBsb2FkIGl0LlxuICpcbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwtMi4wXG4gKi9cblxuZnVuY3Rpb24gdHJhbnNsYXRlRWxlbWVudEF0dHJpYnV0ZXMoZWxlbWVudCkge1xuICAgIGNvbnN0IGF0dHJMaXN0ID0gWyAndGl0bGUnLCAnYWNjZXNza2V5JywgJ2FsdCcsICdsYWJlbCcsICdwbGFjZWhvbGRlcicgXSxcbiAgICAgICAgYXJpYUF0dHJNYXAgPSB7XG4gICAgICAgICAgICBcImFyaWFMYWJlbFwiOiAnYXJpYS1sYWJlbCcsXG4gICAgICAgICAgICBcImFyaWFWYWx1ZVRleHRcIjogJ2FyaWEtdmFsdWV0ZXh0JyxcbiAgICAgICAgICAgIFwiYXJpYU1vekhpbnRcIjogJ2FyaWEtbW96LWhpbnQnXG4gICAgICAgIH0sXG4gICAgICAgIGF0dHJTZXBhcmF0b3IgPSAnLic7XG5cbiAgICAvLyBUcmFuc2xhdGUgYWxsb3dlZCBhdHRyaWJ1dGVzLlxuICAgIGZvcihjb25zdCBhdHRyaWJ1dGUgb2YgYXR0ckxpc3QpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGJyb3dzZXIuaTE4bi5nZXRNZXNzYWdlKGVsZW1lbnQuZGF0YXNldC5sMTBuSWQgKyBhdHRyU2VwYXJhdG9yICsgYXR0cmlidXRlKTtcbiAgICAgICAgaWYoZGF0YSAmJiBkYXRhICE9IFwiPz9cIikge1xuICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCBkYXRhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyYW5zbGF0ZSBhcmlhIGF0dHJpYnV0ZXMuXG4gICAgZm9yKGNvbnN0IGF0dHJBbGlhcyBpbiBhcmlhQXR0ck1hcCkge1xuICAgICAgICBjb25zdCBkYXRhID0gYnJvd3Nlci5pMThuLmdldE1lc3NhZ2UoZWxlbWVudC5kYXRhc2V0LmwxMG5JZCArIGF0dHJTZXBhcmF0b3IgKyBhdHRyQWxpYXMpO1xuICAgICAgICBpZihkYXRhICYmIGRhdGEgIT0gXCI/P1wiKSB7XG4gICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShhcmlhQXR0ck1hcFthdHRyQWxpYXNdLCBkYXRhKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlRWxlbWVudChlbGVtZW50ID0gZG9jdW1lbnQpIHtcblxuICAgIC8vIEdldCBhbGwgY2hpbGRyZW4gdGhhdCBhcmUgbWFya2VkIGFzIGJlaW5nIHRyYW5zbGF0ZWFibGUuXG4gICAgY29uc3QgY2hpbGRyZW4gPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJypbZGF0YS1sMTBuLWlkXScpO1xuICAgIGZvcihjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICBjb25zdCBkYXRhID0gYnJvd3Nlci5pMThuLmdldE1lc3NhZ2UoY2hpbGQuZGF0YXNldC5sMTBuSWQpO1xuICAgICAgICBpZihkYXRhICYmIGRhdGEgIT0gXCI/P1wiKSB7XG4gICAgICAgICAgICBjaGlsZC50ZXh0Q29udGVudCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgdHJhbnNsYXRlRWxlbWVudEF0dHJpYnV0ZXMoY2hpbGQpO1xuICAgIH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHRyYW5zbGF0ZUVsZW1lbnQoKSwge1xuICAgIGNhcHR1cmluZzogZmFsc2UsXG4gICAgcGFzc2l2ZTogdHJ1ZVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvY29udGVudC9sMTBuLmpzIiwiLyoqXG4gKiBAYXV0aG9yIE1hcnRpbiBHaWdlclxuICogQGxpY2Vuc2UgTVBMLTIuMFxuICovXG5cbmltcG9ydCB7IHNob3csIGhpZGUgfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgU0VMRUNURURfQ0xBU1MgPSBcImN1cnJlbnRcIjtcblxuZnVuY3Rpb24gVGFiYmVkKGVsKSB7XG4gICAgdGhpcy5yb290ID0gZWw7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvckFsbChcIi50YWJzdHJpcCBhXCIpLmxlbmd0aDtcblxuICAgIGNvbnN0IHRhYkNvbnRlbnRzID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGFiY29udGVudFwiKSxcbiAgICAgICAgdGFicyA9IHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRhYnN0cmlwIGFcIiksXG4gICAgICAgIGNsaWNrTGlzdGVuZXIgPSAoZXZ0KSA9PiB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0KHBhcnNlSW50KGV2dC5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudGFiLCAxMCkpO1xuICAgICAgICB9LFxuICAgICAgICBrZXlMaXN0ZW5lciA9IChldnQpID0+IHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYoZXZ0LmtleSA9PSBcIkFycm93TGVmdFwiICYmIHRoaXMuY3VycmVudCAhPSAxKSB7IC8vIGxlZnQgYXJyb3cga2V5XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QodGhpcy5jdXJyZW50IC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmKGV2dC5rZXkgPT0gXCJBcnJvd1JpZ2h0XCIgJiYgdGhpcy5jdXJyZW50IDwgdGhpcy5sZW5ndGgpIHsgLy8gcmlnaHQgYXJyb3cga2V5XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QodGhpcy5jdXJyZW50ICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGFiQ29udGVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaGlkZSh0YWJDb250ZW50c1tpXSk7XG4gICAgfVxuXG4gICAgZm9yKGxldCBqID0gMDsgaiA8IHRhYnMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgdGFic1tqXS5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCAtMSk7XG4gICAgICAgIHRhYnNbal0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNsaWNrTGlzdGVuZXIpO1xuICAgICAgICB0YWJzW2pdLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBrZXlMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgaWYodGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGFic3RyaXAgYS5cIiArIFNFTEVDVEVEX0NMQVNTKS5sZW5ndGggPT09IDAgJiYgdGhpcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0KDEpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZWxlY3QocGFyc2VJbnQodGhpcy5yb290LnF1ZXJ5U2VsZWN0b3IoXCIudGFic3RyaXAgYS5cIiArIFNFTEVDVEVEX0NMQVNTKS5kYXRhc2V0LnRhYiwgMTApKTtcbiAgICB9XG59XG5cblRhYmJlZC5wcm90b3R5cGUucm9vdCA9IG51bGw7XG5UYWJiZWQucHJvdG90eXBlLmxlbmd0aCA9IDA7XG5UYWJiZWQucHJvdG90eXBlLmN1cnJlbnQgPSAwO1xuXG5UYWJiZWQucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYoaW5kZXggPD0gdGhpcy5sZW5ndGggJiYgaW5kZXggPiAwKSB7XG4gICAgICAgIGNvbnN0IHByZXZUYWIgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcihcIi50YWJzdHJpcCBhLlwiICsgU0VMRUNURURfQ0xBU1MpLFxuICAgICAgICAgICAgdGFiID0gdGhpcy5nZXRUYWJCeUluZGV4KGluZGV4KSxcbiAgICAgICAgICAgIGV2T2JqID0gbmV3IEN1c3RvbUV2ZW50KFwidGFiY2hhbmdlZFwiLCB7IGRldGFpbDogaW5kZXggfSk7XG4gICAgICAgIGlmKHByZXZUYWIpIHtcbiAgICAgICAgICAgIHByZXZUYWIucmVtb3ZlQXR0cmlidXRlKFwiYXJpYS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgIHByZXZUYWIuY2xhc3NMaXN0LnJlbW92ZShTRUxFQ1RFRF9DTEFTUyk7XG4gICAgICAgICAgICBwcmV2VGFiLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIC0xKTtcbiAgICAgICAgICAgIGhpZGUodGhpcy5nZXRDb250ZW50QnlJbmRleChwYXJzZUludChwcmV2VGFiLmRhdGFzZXQudGFiLCAxMCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3VycmVudCA9IGluZGV4O1xuICAgICAgICB0YWIuZm9jdXMoKTtcbiAgICAgICAgdGFiLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgXCJ0cnVlXCIpO1xuICAgICAgICB0YWIuY2xhc3NMaXN0LmFkZChTRUxFQ1RFRF9DTEFTUyk7XG4gICAgICAgIHRhYi5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCAwKTtcbiAgICAgICAgc2hvdyh0aGlzLmdldENvbnRlbnRCeUluZGV4KGluZGV4KSk7XG4gICAgICAgIHRoaXMucm9vdC5kaXNwYXRjaEV2ZW50KGV2T2JqKTtcbiAgICB9XG59O1xuXG5UYWJiZWQucHJvdG90eXBlLmdldFRhYkJ5SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGNvbnN0IHRhYnMgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvckFsbChcIi50YWJzdHJpcCBhXCIpO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmKHBhcnNlSW50KHRhYnNbaV0uZGF0YXNldC50YWIsIDEwKSA9PSBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhYnNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cblRhYmJlZC5wcm90b3R5cGUuZ2V0Q29udGVudEJ5SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGNvbnN0IGNvbnRlbnRzID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGFiY29udGVudFwiKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgY29udGVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYocGFyc2VJbnQoY29udGVudHNbaV0uZGF0YXNldC50YWIsIDEwKSA9PSBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XG4gICAgY29uc3Qgcm9vdHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRhYmJlZFwiKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcm9vdHNbaV0uX3RhYmJlZCA9IG5ldyBUYWJiZWQocm9vdHNbaV0pO1xuICAgIH1cbn0pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvY29udGVudC90YWJiZWQuanMiLCIvLyByZW1vdmVkIGJ5IGV4dHJhY3QtdGV4dC13ZWJwYWNrLXBsdWdpblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2NvbnRlbnQvc2hhcmVkLmNzc1xuLy8gbW9kdWxlIGlkID0gMTRcbi8vIG1vZHVsZSBjaHVua3MgPSAxIDIiLCIvLyByZW1vdmVkIGJ5IGV4dHJhY3QtdGV4dC13ZWJwYWNrLXBsdWdpblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL21hbmFnZXIvY2hhbm5lbHMtbWFuYWdlci5jc3Ncbi8vIG1vZHVsZSBpZCA9IDI4XG4vLyBtb2R1bGUgY2h1bmtzID0gMiIsIi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHNjcmlwdC5cbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwtMi4wXG4gKi9cblxuLyoqXG4gKiBIaWRlIGFuIGVsZW1lbnQuIFVuc2VsZWN0cyB0aGUgZWxlbWVudCBpZiBpdCB3YXMgcHJldmlvdXNseSBzZWxlY3RlZC5cbiAqXG4gKiBAcGFyYW0ge0RPTU5vZGV9IGVsIC0gTm9kZSB0byBoaWRlLlxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhpZGUoZWwpIHtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJoaWRkZW5cIiwgdHJ1ZSk7XG4gICAgaWYoZWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgZWwuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICB9XG59XG5cbi8qKlxuICogU2hvd3MgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge0RPTU5vZGV9IGVsIC0gTm9kZSB0byBzaG93LlxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3coZWwpIHtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJoaWRkZW5cIik7XG59XG5cbi8qKlxuICogU2hvd3Mgb3IgaGlkZXMgYW4gZWxlbWVudCwgZGVwZW5kZW50IG9uIHRoZSBjb25kaXRpb24uIElmIHRoZSBjb25kaXRpb24gaXNcbiAqIHRydXRoeSB0aGUgZWxlbWVudCB3aWxsIGJlIHNob3duLlxuICpcbiAqIEBwYXJhbSB7RE9NTm9kZX0gbm9kZSAtIE5vZGUgdG8gdG9nZ2xlLlxuICogQHBhcmFtIHtib29sZWFufSBjb25kaXRpb24gLSBDb25kaXRpb24gd2hldGhlciB0aGUgbm9kZSBzaG91bGQgYmUgc2hvd24uXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9nZ2xlKG5vZGUsIGNvbmRpdGlvbikge1xuICAgIGlmKGNvbmRpdGlvbikge1xuICAgICAgICBzaG93KG5vZGUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaGlkZShub2RlKTtcbiAgICB9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvY29udGVudC91dGlscy5qcyIsIi8qKlxuICogQ2hhbm5lbHMgTWFuYWdlciBjb250ZW50IHNjcmlwdFxuICpcbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKi9cbi8vVE9ETyBjbGlja2luZyBvayB0d2ljZSBzaG93cyBlcnJvciBwYW5lbCAtPiBvayBzZW50IHdoaWxlIGxvYWRpbmc/XG5pbXBvcnQgeyBoaWRlLCBzaG93IH0gZnJvbSAnLi4vY29udGVudC91dGlscyc7XG5pbXBvcnQgeyBmaWx0ZXIgfSBmcm9tICcuLi9jb250ZW50L2ZpbHRlcic7XG5pbXBvcnQgJy4uL2NvbnRlbnQvdGFiYmVkJztcbmltcG9ydCAnLi4vY29udGVudC9sMTBuJztcbmltcG9ydCAnLi9jaGFubmVscy1tYW5hZ2VyLmNzcyc7XG5pbXBvcnQgJy4uL2NvbnRlbnQvc2hhcmVkLmNzcyc7XG5cbmxldCBwcm92aWRlcnM7XG5jb25zdCBmaWx0ZXJzID0gW1xuICAgIHtcbiAgICAgICAgc3VidGFyZ2V0OiBcInNwYW5cIlxuICAgIH0sXG4gICAge1xuICAgICAgICBzdWJ0YXJnZXQ6IFwic21hbGxcIlxuICAgIH1cbiAgICBdLFxuICAgIGxpc3RlbmVyID0gKCkgPT4ge1xuICAgICAgICBmaWx0ZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZWFyY2hGaWVsZFwiKS52YWx1ZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5zZWxlY3RhYmxlSXRlbXNMaXN0Om5vdChbaGlkZGVuXSlcIiksIGZpbHRlcnMpO1xuICAgIH0sXG4gICAgcG9ydCA9IGJyb3dzZXIucnVudGltZS5jb25uZWN0KHsgbmFtZTogXCJtYW5hZ2VyXCIgfSksXG5cbi8vIE1ldGhvZHMgbW9kaWZ5aW5nIHRoZSBET01cblxuICAgIGNoYW5uZWxzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjaGFubmVsc1wiKSxcbiAgICB1c2VycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdXNlcnNcIiksXG4gICAgcG9wdXAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3BvcHVwXCIpLFxuICAgIGhhc09wdGlvbiA9IChwcm92aWRlcikgPT4ge1xuICAgICAgICBjb25zdCBwcm92aWRlckRyb3Bkb3duID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNwcm92aWRlckRyb3Bkb3duXCIpO1xuICAgICAgICBmb3IoY29uc3QgbyBvZiBwcm92aWRlckRyb3Bkb3duLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmKG8udmFsdWUgPT0gcHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlYXJjaEZpZWxkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBsaXN0ZW5lcik7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIm1haW4udGFiYmVkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ0YWJjaGFuZ2VkXCIsIGxpc3RlbmVyKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYW5uZWxzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJpdGVtYWRkZWRcIiwgKCkgPT4ge1xuICAgICAgICBpZighZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGFubmVsc1wiKS5oaWRkZW4pIHtcbiAgICAgICAgICAgIGxpc3RlbmVyKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVzZXJzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJpdGVtYWRkZWRcIiwgKCkgPT4ge1xuICAgICAgICBpZighZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2Vyc1wiKS5oaWRkZW4pIHtcbiAgICAgICAgICAgIGxpc3RlbmVyKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5mdW5jdGlvbiBoaWRlRXJyb3IoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGFubmVsTmFtZUZpZWxkXCIpLnNldEN1c3RvbVZhbGlkaXR5KFwiXCIpO1xufVxuXG5mdW5jdGlvbiBoYXNDaGFubmVsKGNoYW5uZWxJZCkge1xuICAgIHJldHVybiAhIWNoYW5uZWxzLnF1ZXJ5U2VsZWN0b3IoXCIjY2hhbm5lbFwiICsgY2hhbm5lbElkKTtcbn1cblxuZnVuY3Rpb24gaGFzVXNlcih1c2VySWQpIHtcbiAgICByZXR1cm4gISF1c2Vycy5xdWVyeVNlbGVjdG9yKFwiI3VzZXJcIiArIHVzZXJJZCk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQ2hhbm5lbCgpIHtcbiAgICBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI2NoYW5uZWxSYWRpb1wiKS5jaGVja2VkID0gdHJ1ZTtcbiAgICBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI3VzZXJSYWRpb1wiKS5jaGVja2VkID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNoZWNrVXNlcigpIHtcbiAgICBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI2NoYW5uZWxSYWRpb1wiKS5jaGVja2VkID0gZmFsc2U7XG4gICAgcG9wdXAucXVlcnlTZWxlY3RvcihcIiN1c2VyUmFkaW9cIikuY2hlY2tlZCA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdGVkSXRlbUlkcygpIHtcbiAgICBjb25zdCBpdGVtcyA9IFtdO1xuICAgIGlmKHVzZXJzLmhhc0F0dHJpYnV0ZShcImhpZGRlblwiKSkge1xuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgY2hhbm5lbHMuc2VsZWN0ZWRPcHRpb25zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKHBhcnNlSW50KGNoYW5uZWxzLnNlbGVjdGVkT3B0aW9uc1tpXS5pZC5zdWJzdHJpbmcoNyksIDEwKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB1c2Vycy5zZWxlY3RlZE9wdGlvbnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2gocGFyc2VJbnQodXNlcnMuc2VsZWN0ZWRPcHRpb25zW2ldLmlkLnN1YnN0cmluZyg0KSwgMTApKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaXRlbXM7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVNlbGVjdGVkSXRlbXMocmVtb3ZlRm9sbG93cykge1xuICAgIGNvbnN0IHNlbGVjdGVkID0gZ2V0U2VsZWN0ZWRJdGVtSWRzKCk7XG4gICAgaWYodXNlcnMuaGFzQXR0cmlidXRlKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgIHNlbGVjdGVkLmZvckVhY2goKGNoYW5uZWxJZCkgPT4ge1xuICAgICAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBcInJlbW92ZWNoYW5uZWxcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsSWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlbGVjdGVkLmZvckVhY2goKHVzZXJJZCkgPT4ge1xuICAgICAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBcInJlbW92ZXVzZXJcIixcbiAgICAgICAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgICAgICAgcmVtb3ZlRm9sbG93c1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2hvd0RpYWxvZygpIHtcbiAgICBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiZGlhbG9nXCIpLnNldEF0dHJpYnV0ZShcIm9wZW5cIiwgdHJ1ZSk7XG4gICAgc2hvdyhwb3B1cCk7XG4gICAgaGlkZUVycm9yKCk7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIm1haW5cIikuc2V0QXR0cmlidXRlKFwiYXJpYS1oaWRkZW5cIiwgdHJ1ZSk7XG4gICAgcG9wdXAucXVlcnlTZWxlY3RvcihcImRpYWxvZ1wiKS5mb2N1cygpO1xufVxuXG5mdW5jdGlvbiBoaWRlRGlhbG9nKCkge1xuICAgIHBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCJkaWFsb2dcIikucmVtb3ZlQXR0cmlidXRlKFwib3BlblwiKTtcbiAgICBoaWRlKHBvcHVwKTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwibWFpblwiKS5yZW1vdmVBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiKTtcbn1cblxuZnVuY3Rpb24gcmVzZXREaWFsb2dGb3JtcygpIHtcbiAgICBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI2NoYW5uZWxOYW1lRmllbGRcIikudmFsdWUgPSBcIlwiO1xuICAgIGhpZGUocG9wdXAucXVlcnlTZWxlY3RvcihcIiNsb2FkaW5nV3JhcHBlclwiKSk7XG4gICAgaGlkZUVycm9yKCk7XG59XG5cbmZ1bmN0aW9uIHNob3dPcHRpb25zKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3Byb3ZpZGVyRHJvcGRvd25cIikub3B0aW9ucztcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgICBvcHRpb25zW2ldLmRpc2FibGVkID0gIXByb3ZpZGVyc1tvcHRpb25zW2ldLnZhbHVlXS5lbmFibGVkO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaGlkZU9wdGlvbnMoKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcHJvdmlkZXJEcm9wZG93blwiKS5vcHRpb25zO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBvcHRpb25zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmKCFwcm92aWRlcnNbb3B0aW9uc1tpXS52YWx1ZV0uc3VwcG9ydHMuZmF2b3JpdGVzKSB7XG4gICAgICAgICAgICBvcHRpb25zW2ldLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG9wdGlvbnNbaV0uc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VsZWN0KCkge1xuICAgIGhpZGVFcnJvcigpO1xuICAgIGlmKHBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCIjY2hhbm5lbFJhZGlvXCIpLmNoZWNrZWQpIHtcbiAgICAgICAgc2hvd09wdGlvbnMoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGhpZGVPcHRpb25zKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBvbkRpYWxvZ0RvbmUoKSB7XG4gICAgcG9wdXAucXVlcnlTZWxlY3RvcihcImRpYWxvZ1wiKS5yZW1vdmVBdHRyaWJ1dGUoXCJvcGVuXCIpO1xuICAgIGhpZGVEaWFsb2coKTtcbiAgICByZXNldERpYWxvZ0Zvcm1zKCk7XG59XG5cbmZ1bmN0aW9uIGdldENoYW5uZWxVbmFtZShjaGFubmVsKSB7XG4gICAgcmV0dXJuIGNoYW5uZWwudW5hbWU7XG59XG5cbmZ1bmN0aW9uIGFkZENoYW5uZWwoY2hhbm5lbCkge1xuICAgIG9uRGlhbG9nRG9uZSgpO1xuICAgIC8qXG4gICAgICAgIERPTSBzdHJ1Y3R1cmU6XG4gICAgICAgIDxvcHRpb24gaWQ9XCJjaGFubmVsSWRcIj5cbiAgICAgICAgICAgIDxpbWcgc3Jjc2V0PVwiXCIgc2l6ZXM9XCI1MHdcIj5cbiAgICAgICAgICAgIDxzcGFuPlxuICAgICAgICAgICAgICAgIFVzZXJuYW1lXG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8c21hbGw+XG4gICAgICAgICAgICAgICAgVHlwZVxuICAgICAgICAgICAgPC9zbWFsbD5cbiAgICAgICAgPC9vcHRpb24+XG4gICAgKi9cbiAgICBpZighaGFzQ2hhbm5lbChjaGFubmVsLmlkKSkge1xuICAgICAgICBjb25zdCBjaGFubmVsTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIiksXG4gICAgICAgICAgICBpbWFnZSA9IG5ldyBJbWFnZSgpLFxuICAgICAgICAgICAgc21hbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic21hbGxcIiksXG4gICAgICAgICAgICBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIiksXG4gICAgICAgICAgICB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGdldENoYW5uZWxVbmFtZShjaGFubmVsKSksXG4gICAgICAgICAgICB0eXBlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocHJvdmlkZXJzW2NoYW5uZWwudHlwZV0ubmFtZSksXG4gICAgICAgICAgICBldk9iaiA9IG5ldyBDdXN0b21FdmVudChcIml0ZW1hZGRlZFwiLCB7IGRldGFpbDogY2hhbm5lbE5vZGUgfSk7XG4gICAgICAgIGltYWdlLnNpemVzID0gXCI1MHdcIjtcbiAgICAgICAgaW1hZ2Uuc3Jjc2V0ID0gT2JqZWN0LmtleXMoY2hhbm5lbC5pbWFnZSlcbiAgICAgICAgICAgIC5tYXAoKHMpID0+IGNoYW5uZWwuaW1hZ2Vbc10gKyBcIiBcIiArIHMgKyBcIndcIikuam9pbihcIixcIik7XG4gICAgICAgIGNoYW5uZWxOb2RlLmlkID0gXCJjaGFubmVsXCIgKyBjaGFubmVsLmlkO1xuICAgICAgICBzbWFsbC5hcHBlbmRDaGlsZCh0eXBlKTtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aXRsZSk7XG4gICAgICAgIGNoYW5uZWxOb2RlLmFwcGVuZENoaWxkKGltYWdlKTtcbiAgICAgICAgY2hhbm5lbE5vZGUuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgIGNoYW5uZWxOb2RlLmFwcGVuZENoaWxkKHNtYWxsKTtcbiAgICAgICAgY2hhbm5lbHMuYXBwZW5kQ2hpbGQoY2hhbm5lbE5vZGUpO1xuICAgICAgICBjaGFubmVscy5kaXNwYXRjaEV2ZW50KGV2T2JqKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZFVzZXIodXNlcikge1xuICAgIG9uRGlhbG9nRG9uZSgpO1xuICAgIGlmKCFoYXNVc2VyKHVzZXIuaWQpKSB7XG4gICAgICAgIGNvbnN0IHVzZXJOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKSxcbiAgICAgICAgICAgIGltYWdlID0gbmV3IEltYWdlKCksXG4gICAgICAgICAgICBzbWFsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzbWFsbFwiKSxcbiAgICAgICAgICAgIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKSxcbiAgICAgICAgICAgIHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodXNlci51bmFtZSksXG4gICAgICAgICAgICB0eXBlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocHJvdmlkZXJzW3VzZXIudHlwZV0ubmFtZSksXG4gICAgICAgICAgICBldk9iaiA9IG5ldyBDdXN0b21FdmVudChcIml0ZW1hZGRlZFwiLCB7IGRldGFpbDogdXNlck5vZGUgfSk7XG4gICAgICAgIGltYWdlLnNpemVzID0gXCI1MHdcIjtcbiAgICAgICAgaW1hZ2Uuc3Jjc2V0ID0gT2JqZWN0LmtleXModXNlci5pbWFnZSlcbiAgICAgICAgICAgIC5tYXAoKHMpID0+IHVzZXIuaW1hZ2Vbc10gKyBcIiBcIiArIHMgKyBcIndcIikuam9pbihcIixcIik7XG4gICAgICAgIHVzZXJOb2RlLmlkID0gXCJ1c2VyXCIgKyB1c2VyLmlkO1xuICAgICAgICBzbWFsbC5hcHBlbmRDaGlsZCh0eXBlKTtcbiAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZCh0aXRsZSk7XG4gICAgICAgIHVzZXJOb2RlLmFwcGVuZENoaWxkKGltYWdlKTtcbiAgICAgICAgdXNlck5vZGUuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgIHVzZXJOb2RlLmFwcGVuZENoaWxkKHNtYWxsKTtcbiAgICAgICAgdXNlcnMuYXBwZW5kQ2hpbGQodXNlck5vZGUpO1xuICAgICAgICB1c2Vycy5kaXNwYXRjaEV2ZW50KGV2T2JqKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNoYW5uZWwoY2hhbm5lbCkge1xuICAgIGlmKGhhc0NoYW5uZWwoY2hhbm5lbC5pZCkpIHtcbiAgICAgICAgY29uc3QgY2hhbm5lbE5vZGUgPSBjaGFubmVscy5xdWVyeVNlbGVjdG9yKFwiI2NoYW5uZWxcIiArIGNoYW5uZWwuaWQpLFxuICAgICAgICAgICAgc3BhbiA9IGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCJzcGFuXCIpO1xuICAgICAgICBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiaW1nXCIpLnNyY3NldCA9IE9iamVjdC5rZXlzKGNoYW5uZWwuaW1hZ2UpXG4gICAgICAgICAgICAubWFwKChzKSA9PiBjaGFubmVsLmltYWdlW3NdICsgXCIgXCIgKyBzICsgXCJ3XCIpLmpvaW4oXCIsXCIpO1xuICAgICAgICBzcGFuLnJlcGxhY2VDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShnZXRDaGFubmVsVW5hbWUoY2hhbm5lbCkpLCBzcGFuLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlVXNlcih1c2VyKSB7XG4gICAgaWYoaGFzVXNlcih1c2VyLmlkKSkge1xuICAgICAgICBjb25zdCB1c2VyTm9kZSA9IHVzZXJzLnF1ZXJ5U2VsZWN0b3IoXCIjdXNlclwiICsgdXNlci5pZCksXG4gICAgICAgICAgICBzcGFuID0gdXNlck5vZGUucXVlcnlTZWxlY3RvcihcInNwYW5cIik7XG4gICAgICAgIHVzZXJOb2RlLnF1ZXJ5U2VsZWN0b3IoXCJpbWdcIikuc3Jjc2V0ID0gT2JqZWN0LmtleXModXNlci5pbWFnZSlcbiAgICAgICAgICAgIC5tYXAoKHMpID0+IHVzZXIuaW1hZ2Vbc10gKyBcIiBcIiArIHMgKyBcIndcIikuam9pbihcIixcIik7XG4gICAgICAgIHNwYW4ucmVwbGFjZUNoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHVzZXIudW5hbWUpLCBzcGFuLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2hhbm5lbChjaGFubmVsSWQpIHtcbiAgICBpZihoYXNDaGFubmVsKGNoYW5uZWxJZCkpIHtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGFubmVsXCIgKyBjaGFubmVsSWQpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlVXNlcih1c2VySWQpIHtcbiAgICBpZihoYXNVc2VyKHVzZXJJZCkpIHtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2VyXCIgKyB1c2VySWQpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2hvd0Vycm9yKG1zZykge1xuICAgIGhpZGUocG9wdXAucXVlcnlTZWxlY3RvcihcIiNsb2FkaW5nV3JhcHBlclwiKSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGFubmVsTmFtZUZpZWxkXCIpLnNldEN1c3RvbVZhbGlkaXR5KG1zZyk7XG4gICAgcG9wdXAucXVlcnlTZWxlY3RvcignW2RhdGEtbDEwbi1pZD1cImNtX2RpYWxvZ19zdWJtaXRcIl0nKS5jbGljaygpO1xufVxuXG5pZihkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnRhYmJlZCBhLmN1cnJlbnRcIikgJiYgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi50YWJiZWQgYS5jdXJyZW50XCIpLmRhdGFzZXQudGFiID09IDEpIHtcbiAgICBoaWRlKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjYXV0b0FkZFwiKS5wYXJlbnROb2RlKTtcbiAgICBjaGVja0NoYW5uZWwoKTtcbn1cbmVsc2Uge1xuICAgIGNoZWNrVXNlcigpO1xufVxudXBkYXRlU2VsZWN0KCk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCAoZXZ0KSA9PiB7XG4gICAgaWYoIXBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCJkaWFsb2dcIikuaGFzQXR0cmlidXRlKFwib3BlblwiKSkge1xuICAgICAgICBpZihldnQua2V5ID09IFwiYVwiICYmIGV2dC5jdHJsS2V5KSB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGxldCBsaXN0O1xuICAgICAgICAgICAgaWYodXNlcnMuaGFzQXR0cmlidXRlKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgICAgICAgICAgbGlzdCA9IGNoYW5uZWxzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGlzdCA9IHVzZXJzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IGxpc3QucXVlcnlTZWxlY3RvckFsbChcIm9wdGlvbjpub3QoW2hpZGRlbl0pXCIpO1xuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0uc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoZXZ0LmtleSA9PSBcIkRlbGV0ZVwiKSB7XG4gICAgICAgICAgICByZW1vdmVTZWxlY3RlZEl0ZW1zKGV2dC5zaGlmdEtleSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihldnQua2V5ID09IFwiZlwiICYmIGV2dC5jdHJsS2V5KSB7XG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3NlYXJjaEZpZWxkXCIpLnNlbGVjdCgpO1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihldnQua2V5ID09IFwiSGVscFwiKSB7XG4gICAgICAgICAgICB3aW5kb3cub3Blbihkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiW3JlbD0naGVscCddXCIpLmhyZWYpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZigoZXZ0LmtleSA9PSBcIndcIiAmJiBldnQuY3RybEtleSkgfHwgZXZ0LmtleSA9PSBcIkVzY2FwZVwiKSB7XG4gICAgICAgICAgICBoaWRlRGlhbG9nKCk7XG4gICAgICAgICAgICByZXNldERpYWxvZ0Zvcm1zKCk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGV2dC5rZXkgPT0gXCJmXCIgJiYgZXZ0LmN0cmxLZXkpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfVxufSwgdHJ1ZSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJtYWluLnRhYmJlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwidGFiY2hhbmdlZFwiLCAoZXZ0KSA9PiB7XG4gICAgaWYoZXZ0LmRldGFpbCA9PSAxKSB7XG4gICAgICAgIGhpZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNhdXRvQWRkXCIpLnBhcmVudE5vZGUpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnRvb2xiYXJcIikuc2V0QXR0cmlidXRlKFwiYXJpYS1jb250cm9sc1wiLCBcImNoYW5uZWxzXCIpO1xuICAgICAgICBjaGVja0NoYW5uZWwoKTtcbiAgICB9XG4gICAgZWxzZSBpZihldnQuZGV0YWlsID09IDIpIHtcbiAgICAgICAgc2hvdyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2F1dG9BZGRcIikucGFyZW50Tm9kZSk7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudG9vbGJhclwiKS5zZXRBdHRyaWJ1dGUoXCJhcmlhLWNvbnRyb2xzXCIsIFwidXNlcnNcIik7XG4gICAgICAgIGNoZWNrVXNlcigpO1xuICAgIH1cbiAgICB1cGRhdGVTZWxlY3QoKTtcbn0sIGZhbHNlKTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNhdXRvQWRkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7IHRhcmdldDogXCJhdXRvYWRkXCIgfSk7XG59LCBmYWxzZSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2hvd0RpYWxvZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc2hvd0RpYWxvZywgZmFsc2UpO1xuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3JlbW92ZUl0ZW1cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJlbW92ZVNlbGVjdGVkSXRlbXMoZS5zaGlmdEtleSk7XG59KTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImFbcmVsPSdoZWxwJ11cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgaWYoZS5zaGlmdEtleSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB0YXJnZXQ6IFwiZGVidWdkdW1wXCIgfSk7XG4gICAgfVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdXBkYXRlSXRlbVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkID0gZ2V0U2VsZWN0ZWRJdGVtSWRzKCk7XG4gICAgaWYodXNlcnMuaGFzQXR0cmlidXRlKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgIHNlbGVjdGVkLmZvckVhY2goKGNoYW5uZWxJZCkgPT4ge1xuICAgICAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBcInVwZGF0ZWNoYW5uZWxcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsSWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlbGVjdGVkLmZvckVhY2goKHVzZXJJZCkgPT4ge1xuICAgICAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBcInVwZGF0ZWZhdm9yaXRlc1wiLFxuICAgICAgICAgICAgICAgIHVzZXJJZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn0pO1xuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NoYW5uZWxSYWRpb1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHVwZGF0ZVNlbGVjdCk7XG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3VzZXJSYWRpb1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHVwZGF0ZVNlbGVjdCk7XG5cbnBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCJidXR0b25bdHlwZT0nYnV0dG9uJ11cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgdGFyZ2V0OiBcImNhbmNlbFwiLFxuICAgICAgICB2YWx1ZXM6IFtcbiAgICAgICAgICAgIHBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCIjY2hhbm5lbFJhZGlvXCIpLmNoZWNrZWQgPyBcImNoYW5uZWxcIiA6IFwidXNlclwiLFxuICAgICAgICAgICAgcG9wdXAucXVlcnlTZWxlY3RvcihcIiNwcm92aWRlckRyb3Bkb3duXCIpLnZhbHVlLFxuICAgICAgICAgICAgcG9wdXAucXVlcnlTZWxlY3RvcihcIiNjaGFubmVsTmFtZUZpZWxkXCIpLnZhbHVlXG4gICAgICAgIF1cbiAgICB9KTtcbiAgICBoaWRlRGlhbG9nKCk7XG4gICAgcmVzZXREaWFsb2dGb3JtcygpO1xufSk7XG5cbnBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCIjY2hhbm5lbE5hbWVGaWVsZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgaGlkZUVycm9yLCBmYWxzZSk7XG5wb3B1cC5xdWVyeVNlbGVjdG9yKFwiI3Byb3ZpZGVyRHJvcGRvd25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBoaWRlRXJyb3IsIGZhbHNlKTtcblxucG9wdXAucXVlcnlTZWxlY3RvcihcImZvcm1cIikuYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCAoZXZ0KSA9PiB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYoIXBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCIjbG9hZGluZ1dyYXBwZXJcIikuaGlkZGVuKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmllbGQgPSBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI2NoYW5uZWxOYW1lRmllbGRcIik7XG4gICAgaGlkZUVycm9yKCk7XG4gICAgc2hvdyhwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI2xvYWRpbmdXcmFwcGVyXCIpKTtcbiAgICBpZihmaWVsZC52YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmKHBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCIjY2hhbm5lbFJhZGlvXCIpLmNoZWNrZWQpIHtcbiAgICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgIHRhcmdldDogXCJhZGRjaGFubmVsXCIsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGZpZWxkLnZhbHVlLFxuICAgICAgICAgICAgICAgIHR5cGU6IHBvcHVwLnF1ZXJ5U2VsZWN0b3IoXCIjcHJvdmlkZXJEcm9wZG93blwiKS52YWx1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IFwiYWRkdXNlclwiLFxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBmaWVsZC52YWx1ZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBwb3B1cC5xdWVyeVNlbGVjdG9yKFwiI3Byb3ZpZGVyRHJvcGRvd25cIikudmFsdWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufSwgZmFsc2UpO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm9wdGlvbnNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB0YXJnZXQ6IFwic2hvd29wdGlvbnNcIiB9KTtcbn0sIGZhbHNlKTtcblxuLy8gQWRkLW9uIGNvbW11bmljYXRpb24gYmFja2VuZFxuXG5wb3J0LnBvc3RNZXNzYWdlKHsgdGFyZ2V0OiBcInJlYWR5XCIgfSk7XG5cbnBvcnQub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlKSA9PiB7XG4gICAgaWYobWVzc2FnZS50YXJnZXQgPT0gXCJzZWNvbmRhcnlcIikge1xuICAgICAgICBzaG93KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2Vjb25kYXJ5LW1hbmFnZXJcIikpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3NlY29uZGFyeS1tYW5hZ2VyIGJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB0YXJnZXQ6IFwiZm9jdXNcIiB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYobWVzc2FnZS50YXJnZXQgPT0gXCJyZWxvYWRcIikge1xuICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcImFkZFwiKSB7XG4gICAgICAgIGFkZENoYW5uZWwobWVzc2FnZS5kYXRhKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcInJlbW92ZVwiKSB7XG4gICAgICAgIHJlbW92ZUNoYW5uZWwobWVzc2FnZS5kYXRhKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcInVwZGF0ZVwiKSB7XG4gICAgICAgIHVwZGF0ZUNoYW5uZWwobWVzc2FnZS5kYXRhKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcImFkZHVzZXJcIikge1xuICAgICAgICBhZGRVc2VyKG1lc3NhZ2UuZGF0YSk7XG4gICAgfVxuICAgIGVsc2UgaWYobWVzc2FnZS50YXJnZXQgPT0gXCJyZW1vdmV1c2VyXCIpIHtcbiAgICAgICAgcmVtb3ZlVXNlcihtZXNzYWdlLmRhdGEpO1xuICAgIH1cbiAgICBlbHNlIGlmKG1lc3NhZ2UudGFyZ2V0ID09IFwidXBkYXRldXNlclwiKSB7XG4gICAgICAgIHVwZGF0ZVVzZXIobWVzc2FnZS5kYXRhKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcImFkZHByb3ZpZGVyc1wiKSB7XG4gICAgICAgIHByb3ZpZGVycyA9IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJEcm9wZG93biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcHJvdmlkZXJEcm9wZG93blwiKTtcbiAgICAgICAgZm9yKGNvbnN0IHByb3ZpZGVyIGluIHByb3ZpZGVycykge1xuICAgICAgICAgICAgaWYoIWhhc09wdGlvbihwcm92aWRlcikpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHQgPSBuZXcgT3B0aW9uKHByb3ZpZGVyc1twcm92aWRlcl0ubmFtZSwgcHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIG9wdC5kaXNhYmxlZCA9ICFwcm92aWRlcnNbcHJvdmlkZXJdLmVuYWJsZWQ7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXJEcm9wZG93bi5hZGQob3B0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmKG1lc3NhZ2UudGFyZ2V0ID09IFwiaXNsb2FkaW5nXCIpIHtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIm1haW5cIikuY2xhc3NMaXN0LmFkZChcImxvYWRpbmdcIik7XG4gICAgICAgIHVzZXJzLmNsYXNzTGlzdC5hZGQoXCJsb2FkaW5nXCIpO1xuICAgICAgICBjaGFubmVscy5jbGFzc0xpc3QuYWRkKFwibG9hZGluZ1wiKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcImRvbmVsb2FkaW5nXCIpIHtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIm1haW5cIikuY2xhc3NMaXN0LnJlbW92ZShcImxvYWRpbmdcIik7XG4gICAgICAgIHVzZXJzLmNsYXNzTGlzdC5yZW1vdmUoXCJsb2FkaW5nXCIpO1xuICAgICAgICBjaGFubmVscy5jbGFzc0xpc3QucmVtb3ZlKFwibG9hZGluZ1wiKTtcbiAgICB9XG4gICAgZWxzZSBpZihtZXNzYWdlLnRhcmdldCA9PSBcImVycm9yXCIpIHtcbiAgICAgICAgbGV0IG1zZztcbiAgICAgICAgaWYobWVzc2FnZS5kYXRhKSB7XG4gICAgICAgICAgICBtc2cgPSBicm93c2VyLmkxOG4uZ2V0TWVzc2FnZShcImNoYW5uZWxNYW5hZ2VyTG9hZEVycm9yXCIsIG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBtc2cgPSBicm93c2VyLmkxOG4uZ2V0TWVzc2FnZShcImNoYW5uZWxNYW5hZ2VyR2VuZXJpY0Vycm9yXCIpO1xuICAgICAgICB9XG4gICAgICAgIHNob3dFcnJvcihtc2cpO1xuICAgIH1cbiAgICBlbHNlIGlmKG1lc3NhZ2UudGFyZ2V0ID09IFwidGhlbWVcIikge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoXCJkYXJrXCIsIG1lc3NhZ2UuZGF0YSA9PT0gMSk7XG4gICAgfVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWFuYWdlci9pbmRleC5qcyJdLCJzb3VyY2VSb290IjoiIn0=