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
/******/ 	return __webpack_require__(__webpack_require__.s = 56);
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

/***/ 17:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/**
 * Live state constants
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

/* harmony default export */ __webpack_exports__["a"] = {
    OFFLINE: -1,
    LIVE: 0,
    REDIRECT: 1,
    REBROADCAST: 2,
    TOWARD_LIVE: 0,
    TOWARD_OFFLINE: 1
};

/***/ }),

/***/ 27:
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),

/***/ 29:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__.p + "assets/images/open-iconic.min.svg";

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

/***/ 56:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__content_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__content_filter__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__content_tabbed__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__content_l10n__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__content_l10n___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__content_l10n__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__list_css__ = __webpack_require__(27);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__list_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__list_css__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__content_shared_css__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__content_shared_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5__content_shared_css__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_open_iconic_sprite_open_iconic_min_svg__ = __webpack_require__(29);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_open_iconic_sprite_open_iconic_min_svg___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_open_iconic_sprite_open_iconic_min_svg__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__live_state__ = __webpack_require__(17);
/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Ctrl+F should toggle filter
 */









let live, secondaryLive, offline, distinct, explore, currentMenuTarget, currentStyle, providers, nonLiveDisplay;
const port = browser.runtime.connect({ name: "list" }),
      CHANNEL_ID_PREFIX = "channel",
      EXPLORE_ID_PREFIX = "explorechan",
      CONTEXTMENU_ID = "context",
      EXPLORE_CONTEXTMENU_ID = "explore-context",
      filters = [{
    subtarget: ".provider"
}, {
    subtarget: ".name"
}, {
    subtarget: ".alternate-name"
}, {
    subtarget: ".title"
}, {
    subtarget: ".viewers"
}, {
    subtarget: ".category"
}],
      channelIsLive = channel => channel.live.state == __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].LIVE || nonLiveDisplay < 3 && channel.live.state > __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].LIVE,
      getChannelIdFromId = id => parseInt(id.substring(CHANNEL_ID_PREFIX.length), 10),
      contextMenuCommand = event => {
    port.postMessage({
        target: event,
        channelId: getChannelIdFromId(currentMenuTarget.id)
    });
    if (event == "openArchive" || event == "openChat") {
        window.close();
    }
    currentMenuTarget = null;
},
      openChannel = (channelId, e) => {
    if (e) {
        e.preventDefault();
    }
    port.postMessage({
        target: "open",
        channelId
    });
    window.close();
},
      openUrl = (url, e) => {
    if (e) {
        e.preventDefault();
    }
    port.postMessage({
        target: "openUrl",
        url
    });
    window.close();
},
      displayNoOnline = () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.getElementById("noonline"));
},
      hideNoOnline = () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(document.getElementById("noonline"));
},
      hideNoChannels = () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(document.getElementById("nochannels"));
},
      displayNoChannels = () => {
    displayNoOnline();
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.getElementById("nochannels"));
},
      displayLoading = () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.getElementById("loadingexplore"));
    explore.parentNode.classList.add("loading");
},
      hideLoading = () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(document.getElementById("loadingexplore"));
    explore.parentNode.classList.remove("loading");
},
      setStyle = style => {
    let newClass;
    switch (style) {
        case 2:
            newClass = "thumbnail";
            break;
        case 0:
            newClass = "compact";
            break;
        default:
            newClass = "default";
    }
    if (newClass != currentStyle) {
        const main = document.querySelector(".tabbed");
        if (currentStyle) {
            main.classList.replace(currentStyle, newClass);
        } else {
            main.classList.add(newClass);
        }
        currentStyle = newClass;
    }
},
      setExtrasVisibility = visible => {
    document.querySelector(".tabbed").classList.toggle("extras", visible);
},
      findInsertionNodeIn = (list, name) => {
    // Find the node to insert before in order to keep the list sorted
    let node = list.firstElementChild;

    while (node && name.localeCompare(node.querySelector(".name").textContent) >= 0) {
        node = node.nextSibling;
    }
    return node;
},
      insertBefore = (parent, node, uname) => {
    if (!parent.querySelector("#" + node.id)) {
        parent.insertBefore(node, findInsertionNodeIn(parent, uname));
    }
},
      insertChannel = (channel, node) => {
    const isNonLive = channel.live.state >= __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].REDIRECT;
    if (channel.live.state == __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].LIVE || nonLiveDisplay === 0 && isNonLive) {
        insertBefore(live, node, channel.uname);
    } else if (isNonLive && nonLiveDisplay == 1) {
        insertBefore(secondaryLive, node, channel.uname);
    } else if (isNonLive && nonLiveDisplay == 2) {
        insertBefore(distinct, node, channel.uname);
    } else {
        insertBefore(offline, node, channel.uname);
    }
},
      contextMenuListener = e => {
    currentMenuTarget = e.currentTarget;
    const isOffline = e.currentTarget.parentNode.id == "offline";
    document.getElementById("contextOpen").disabled = isOffline;
    document.getElementById("contextRefresh").disabled = !providers[e.currentTarget.className].enabled;
    document.getElementById("contextAdd").disabled = !providers[e.currentTarget.className].enabled;
},
      buildChannel = (channel, unspecific = false) => {
    const channelNode = document.createElement("li");
    channelNode.insertAdjacentHTML("beforeend", `<a href="" contextmenu="${ unspecific ? EXPLORE_CONTEXTMENU_ID : CONTEXTMENU_ID }">
    <img src="">
    <div>
        <img srcset="" sizes="30w">
        <span class="rebroadcast hide-offline" hidden><svg class="icon" viewBox="0 0 8 8">
            <use xlink:href="../assets/images/open-iconic.min.svg#loop"></use>
        </svg> </span><span class="name"></span><span class="nonlivename hide-offline" hidden> → <span class="alternate-name"></span></span><br>
        <span class="title hide-offline"></span>
        <aside>
            <span class="viewersWrapper hide-offline">
                <svg class="icon" viewBox="0 0 8 8">
                    <use xlink:href="../assets/images/open-iconic.min.svg#eye"></use>
                </svg>&nbsp;<span class="viewers">0</span>&#x20;
            </span>
            <span class="categoryWrapper hide-offline">
                <svg class="icon" viewBox="0 0 8 8">
                    <use xlink:href="../assets/images/open-iconic.min.svg#tag"></use>
                </svg>&nbsp;<span class="category"></span>&#x20;
            </span>
            <span class="providerWrapper">
                <svg class="icon" viewBox="0 0 8 8">
                    <use xlink:href="../assets/images/open-iconic.min.svg#hard-drive"></use>
                </svg>&nbsp;<span class="provider"></span>
            </span>
        </aside>
    </div>
</a>`);
    channelNode.querySelector("div img").setAttribute("srcset", Object.keys(channel.image).map(s => channel.image[s] + " " + s + "w").join(","));
    channelNode.querySelector("a > img").setAttribute("src", channel.thumbnail);
    channelNode.querySelector(".name").textContent = channel.uname;
    channelNode.querySelector(".title").textContent = channel.title;
    channelNode.querySelector(".alternate-name").textContent = channel.live.alternateUsername;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(channelNode.querySelector(".nonlivename"), channel.live.alternateUsername !== "");
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(channelNode.querySelector(".rebroadcast"), channel.live.state == __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].REBROADCAST);
    if (!("viewers" in channel) || channel.viewers < 0) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(channelNode.querySelector(".viewersWrapper"));
    }
    channelNode.querySelector(".viewers").textContent = channel.viewers;
    if (!channel.category) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(channelNode.querySelector(".categoryWrapper"));
    }
    channelNode.querySelector(".category").textContent = channel.category;
    channelNode.querySelector(".provider").textContent = providers[channel.type].name;
    channelNode.classList.add(channel.type);
    if (!unspecific) {
        channelNode.id = CHANNEL_ID_PREFIX + channel.id;
        channelNode.querySelector("a").addEventListener("click", openChannel.bind(null, channel.id));
    } else {
        channelNode.id = EXPLORE_ID_PREFIX + channel.login;
        channelNode.dataset.url = channel.url[0];
        channelNode.querySelector("a").addEventListener("click", openUrl.bind(null, channelIsLive(channel) ? channel.url[0] : channel.archiveUrl));
    }
    channelNode.addEventListener("contextmenu", contextMenuListener);

    if (channel.live.state > 0) {
        channelNode.classList.add("nonlive");
    }

    return channelNode;
},
      countLiveChannels = () => live.childElementCount + secondaryLive.childElementCount,
      addChannel = channel => {
    const channelNode = buildChannel(channel);
    // hide the channel by if it's filtered out atm
    if (!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["b" /* matches */])(channelNode, document.querySelector("#searchField").value, filters)) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(channelNode);
    }

    insertChannel(channel, channelNode);
    hideNoChannels();
    if (channelIsLive(channel)) {
        hideNoOnline();
    }
},
      removeChannel = channelId => {
    const channelNode = document.getElementById(CHANNEL_ID_PREFIX + channelId);
    if (channelNode.parentNode.id === "live") {
        port.postMessage({
            target: "removedLive",
            channelId
        });
        // Smaller two, since we remove the channel node after this, as we still
        // needed its parent's id before.
        if (countLiveChannels() < 2) {
            displayNoOnline();
        }
    }

    channelNode.remove();

    if (countLiveChannels() === 0 && offline.childElementCount === 0 && distinct.childElementCount === 0) {
        displayNoChannels();
    }
},
      updateNodeContent = channel => {
    const channelNode = document.getElementById(CHANNEL_ID_PREFIX + channel.id),
          nameNode = channelNode.querySelector(".name"),
          titleNode = channelNode.querySelector(".title"),
          viewers = channelNode.querySelector(".viewers"),
          category = channelNode.querySelector(".category");

    titleNode.textContent = channel.title;
    nameNode.textContent = channel.uname;
    channelNode.querySelector(".alternate-name").textContent = channel.live.alternateUsername;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(channelNode.querySelector(".nonlivename"), channel.live.alternateUsername !== "");
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(channelNode.querySelector(".rebroadcast"), channel.live.state == __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].REBROADCAST);

    viewers.textContent = channel.viewers;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(channelNode.querySelector(".viewersWrapper"), "viewers" in channel && channel.viewers > 0);

    category.textContent = channel.category;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(channelNode.querySelector(".categoryWrapper"), !!channel.category);

    channelNode.classList.toggle("nonlive", channel.live.state > __WEBPACK_IMPORTED_MODULE_7__live_state__["a" /* default */].LIVE);

    // only update images if the user is online to avoid broken images
    if (navigator.onLine) {
        if (channelIsLive(channel)) {
            channelNode.querySelector("a>img").setAttribute("src", channel.thumbnail + "?timestamp=" + Date.now());
        }

        channelNode.querySelector("a div img").srcset = Object.keys(channel.image).map(s => channel.image[s] + " " + s + "w").join(",");
    }
},

//TODO placing stuff (live channel goes hosted -> might need reordering)
makeChannelLive = channel => {
    hideNoOnline();
    updateNodeContent(channel);
    insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX + channel.id));
},
      makeChannelOffline = channel => {
    insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX + channel.id));
    updateNodeContent(channel);
    if (countLiveChannels() === 0) {
        displayNoOnline();
    }
},
      makeChannelDistinct = channel => {
    insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX + channel.id));
    updateNodeContent(channel);
    if (countLiveChannels() === 0) {
        displayNoOnline();
    }
},
      getFeaturedChannels = type => {
    displayLoading();
    port.postMessage({
        target: "explore",
        type
    });
},
      providerSearch = (type, query) => {
    displayLoading();
    port.postMessage({
        target: "search",
        type,
        query
    });
},
      externalContextMenuCommand = command => {
    port.postMessage({
        target: command,
        type: currentMenuTarget.className,
        login: currentMenuTarget.id.substring(EXPLORE_ID_PREFIX.length)
    });
    currentMenuTarget = null;
},
      forwardEvent = (name, event) => {
    if (event) {
        event.preventDefault();
    }
    port.postMessage({
        target: name
    });
    if (name == "configure") {
        window.close();
    }
},
      applySearchToExplore = (exploreSelect, field) => {
    if (field.hasAttribute("hidden") || field.value === "") {
        getFeaturedChannels(exploreSelect.value);
    } else {
        providerSearch(exploreSelect.value, field.value);
    }
},
      hasOption = provider => {
    const providerDropdown = document.getElementById("exploreprovider");
    for (const o of providerDropdown.options) {
        if (o.value == provider) {
            return true;
        }
    }
    return false;
},
      addExploreProviders = exploreProviders => {
    if (exploreProviders.length > 0) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.getElementById("exploreTab"));
        const providerDropdown = document.getElementById("exploreprovider");
        exploreProviders.forEach(p => {
            if (!hasOption(p)) {
                providerDropdown.add(new Option(providers[p].name, p));
            }
        });
        displayLoading();
    }
},
      toggleQueueContextItems = queuePaused => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(document.getElementById("pauseAutorefresh"), !queuePaused);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(document.getElementById("resumeAutorefresh"), queuePaused);
},
      setNonLiveDisplay = display => {
    const nonLiveTab = document.getElementById("nonliveTab"),
          tabbed = document.querySelector(".tabbed"),
          channelsToMove = Array.from(document.querySelectorAll(".nonlive"));

    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(nonLiveTab, display == 2);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["c" /* toggle */])(secondaryLive, display == 1);

    if (nonLiveDisplay == 2 && display != 2 && tabbed._tabbed.current == 4) {
        tabbed._tabbed.select(1);
    }

    nonLiveDisplay = display;

    // Reposition all existing non-live channels
    let parent = live;
    if (display == 1) {
        parent = secondaryLive;
    } else if (display == 2) {
        parent = distinct;
    } else if (display == 3) {
        parent = offline;
    }

    if (channelsToMove.length && display <= 1) {
        hideNoOnline();
    }

    for (const node of channelsToMove) {
        insertBefore(parent, node, node.querySelector(".name").textContent);
    }

    if (countLiveChannels() === 0 && display >= 2) {
        displayNoOnline();
    }
},
      setTheme = theme => {
    document.body.classList.toggle("dark", theme === 1);
};

// Set up port commmunication listeners
port.onMessage.addListener(event => {
    if (event.target == "setStyle") {
        setStyle(event.data);
    } else if (event.target == "setExtras") {
        setExtrasVisibility(event.data);
    } else if (event.target == "addChannels") {
        event.data.forEach(addChannel);
    } else if (event.target == "removeChannel") {
        removeChannel(event.data);
    } else if (event.target == "setOnline") {
        makeChannelLive(event.data);
    } else if (event.target == "setOffline") {
        makeChannelOffline(event.data);
    } else if (event.target == "setDistinct") {
        makeChannelDistinct(event.data);
    } else if (event.target == "setNonLiveDisplay") {
        setNonLiveDisplay(event.data);
    } else if (event.target == "queuePaused") {
        toggleQueueContextItems(event.data);
        document.getElementById("refreshButton").classList.toggle("running", !event.data);
    }
    // Queue autorefresh is enabled/disabled in the settings
    else if (event.target == "queueStatus") {
            const button = document.getElementById("refreshButton");
            if (event.data) {
                button.setAttribute("contextmenu", "queue-context");
            } else {
                button.removeAttribute("contextmenu");
            }

            button.classList.toggle("running", event.data);
        } else if (event.target == "setProviders") {
            providers = event.data;
            addExploreProviders(Object.keys(providers).filter(p => providers[p].supports.featured));
        } else if (event.target == "setFeatured") {
            const { channels, type, q } = event.data;
            if (type !== document.getElementById("exploreprovider").value || q !== null && document.getElementById("searchField").value != q) {
                return;
            }

            while (explore.hasChildNodes()) {
                explore.firstChild.remove();
            }

            if (channels.length === 0) {
                __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(document.getElementById("noresults"));
            } else {
                __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(document.getElementById("noresults"));
                explore.append.apply(explore, channels.map(channel => {
                    return buildChannel(channel, true);
                }));
            }

            hideLoading();
        } else if (event.target == "theme") {
            setTheme(event.data);
        }
});

// Set up DOM listeners and all that.
window.addEventListener("load", () => {
    live = document.getElementById("live");
    offline = document.getElementById("offline");
    distinct = document.getElementById("nonlive");
    explore = document.getElementById("featured");
    secondaryLive = document.getElementById("secondarylive");
    const exploreSelect = document.getElementById("exploreprovider"),
          field = document.querySelector("#searchField");

    document.getElementById("configure").addEventListener("click", forwardEvent.bind(null, "configure"));
    document.getElementById("refreshButton").addEventListener("click", e => {
        forwardEvent("refresh", e);
        if (!explore.parentNode.hasAttribute("hidden")) {
            getFeaturedChannels(exploreSelect.value);
        }
    });
    document.getElementById("contextRefresh").addEventListener("click", contextMenuCommand.bind(null, "refresh"), false);
    document.getElementById("contextOpen").addEventListener("click", contextMenuCommand.bind(null, "openArchive"), false);
    document.getElementById("contextChat").addEventListener("click", contextMenuCommand.bind(null, "openChat"), false);
    document.getElementById("contextCopy").addEventListener("click", contextMenuCommand.bind(null, "copy"), false);
    document.getElementById("contextAdd").addEventListener("click", externalContextMenuCommand.bind(null, "add"), false);
    document.getElementById("contextExploreCopy").addEventListener("click", externalContextMenuCommand.bind(null, "copyexternal"), false);
    document.getElementById("pauseAutorefresh").addEventListener("click", () => forwardEvent.bind(null, "pause", null), false);
    document.getElementById("resumeAutorefresh").addEventListener("click", () => forwardEvent.bind(null, "resume", null), false);
    document.querySelector(".tabbed").addEventListener("tabchanged", e => {
        if (e.detail === 3) {
            applySearchToExplore(exploreSelect, field);
        }
    }, false);
    exploreSelect.addEventListener("change", () => {
        applySearchToExplore(exploreSelect, field);
    }, false);
    document.querySelector("#searchButton").addEventListener("click", e => {
        e.preventDefault();
        if (field.hasAttribute("hidden")) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["a" /* show */])(field);
            field.focus();
            e.currentTarget.setAttribute("aria-pressed", "true");
        } else {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__content_utils__["b" /* hide */])(field);
            field.value = "";
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(field.value, live, filters);
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(field.value, offline, filters);
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(field.value, secondaryLive, filters);
            e.currentTarget.setAttribute("aria-pressed", "false");
            field.blur();

            if (!explore.parentNode.hasAttribute("hidden")) {
                applySearchToExplore(exploreSelect, field);
            }
        }
    }, false);
    field.addEventListener("keyup", () => {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(field.value, live, filters);
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(field.value, offline, filters);
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__content_filter__["a" /* filter */])(field.value, secondaryLive, filters);
        if (!explore.parentNode.hasAttribute("hidden")) {
            applySearchToExplore(exploreSelect, field);
        }
    }, false);

    forwardEvent("ready");
});

/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYTJhNDM5MWNlMzhkMzA1ODYyYzg/M2M5NyIsIndlYnBhY2s6Ly8vLi9zcmMvY29udGVudC9maWx0ZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbnRlbnQvbDEwbi5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvY29udGVudC90YWJiZWQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbnRlbnQvc2hhcmVkLmNzcyIsIndlYnBhY2s6Ly8vLi9zcmMvbGl2ZS1zdGF0ZS5qcz80Njk4Iiwid2VicGFjazovLy8uL3NyYy9saXN0L2xpc3QuY3NzIiwid2VicGFjazovLy8uL34vb3Blbi1pY29uaWMvc3ByaXRlL29wZW4taWNvbmljLm1pbi5zdmciLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvbnRlbnQvdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2xpc3QvaW5kZXguanMiXSwibmFtZXMiOlsiY2hlY2tDbGFzc2VzIiwibm9kZSIsInF1ZXJ5IiwiY2xhc3NlcyIsImNsYXNzTmFtZSIsInRvTG93ZXJDYXNlIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJyZXBsYWNlIiwidHJpbSIsImluY2x1ZGVzIiwibWF0Y2hlcyIsInJ1bGVzIiwidGFyZ2V0IiwicXVlcmllcyIsInNwbGl0IiwiZXZlcnkiLCJxIiwic29tZSIsInJ1bGUiLCJhdHRyaWJ1dGUiLCJzdWJ0YXJnZXQiLCJxdWVyeVNlbGVjdG9yIiwiZmlsdGVyIiwicm9vdCIsIm5vZGVzIiwiY2hpbGRyZW4iLCJpIiwibGVuZ3RoIiwic2hvdyIsImhpZGUiLCJ0cmFuc2xhdGVFbGVtZW50QXR0cmlidXRlcyIsImVsZW1lbnQiLCJhdHRyTGlzdCIsImFyaWFBdHRyTWFwIiwiYXR0clNlcGFyYXRvciIsImRhdGEiLCJicm93c2VyIiwiaTE4biIsImdldE1lc3NhZ2UiLCJkYXRhc2V0IiwibDEwbklkIiwic2V0QXR0cmlidXRlIiwiYXR0ckFsaWFzIiwidHJhbnNsYXRlRWxlbWVudCIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvckFsbCIsImNoaWxkIiwidGV4dENvbnRlbnQiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2FwdHVyaW5nIiwicGFzc2l2ZSIsIlNFTEVDVEVEX0NMQVNTIiwiVGFiYmVkIiwiZWwiLCJ0YWJDb250ZW50cyIsInRhYnMiLCJjbGlja0xpc3RlbmVyIiwiZXZ0IiwicHJldmVudERlZmF1bHQiLCJzZWxlY3QiLCJwYXJzZUludCIsImN1cnJlbnRUYXJnZXQiLCJ0YWIiLCJrZXlMaXN0ZW5lciIsImtleSIsImN1cnJlbnQiLCJqIiwicHJvdG90eXBlIiwiaW5kZXgiLCJwcmV2VGFiIiwiZ2V0VGFiQnlJbmRleCIsImV2T2JqIiwiQ3VzdG9tRXZlbnQiLCJkZXRhaWwiLCJyZW1vdmVBdHRyaWJ1dGUiLCJyZW1vdmUiLCJnZXRDb250ZW50QnlJbmRleCIsImZvY3VzIiwiYWRkIiwiZGlzcGF0Y2hFdmVudCIsInVuZGVmaW5lZCIsImNvbnRlbnRzIiwicm9vdHMiLCJfdGFiYmVkIiwiT0ZGTElORSIsIkxJVkUiLCJSRURJUkVDVCIsIlJFQlJPQURDQVNUIiwiVE9XQVJEX0xJVkUiLCJUT1dBUkRfT0ZGTElORSIsInNlbGVjdGVkIiwidG9nZ2xlIiwiY29uZGl0aW9uIiwibGl2ZSIsInNlY29uZGFyeUxpdmUiLCJvZmZsaW5lIiwiZGlzdGluY3QiLCJleHBsb3JlIiwiY3VycmVudE1lbnVUYXJnZXQiLCJjdXJyZW50U3R5bGUiLCJwcm92aWRlcnMiLCJub25MaXZlRGlzcGxheSIsInBvcnQiLCJydW50aW1lIiwiY29ubmVjdCIsIm5hbWUiLCJDSEFOTkVMX0lEX1BSRUZJWCIsIkVYUExPUkVfSURfUFJFRklYIiwiQ09OVEVYVE1FTlVfSUQiLCJFWFBMT1JFX0NPTlRFWFRNRU5VX0lEIiwiZmlsdGVycyIsImNoYW5uZWxJc0xpdmUiLCJjaGFubmVsIiwic3RhdGUiLCJMaXZlU3RhdGUiLCJnZXRDaGFubmVsSWRGcm9tSWQiLCJpZCIsInN1YnN0cmluZyIsImNvbnRleHRNZW51Q29tbWFuZCIsImV2ZW50IiwicG9zdE1lc3NhZ2UiLCJjaGFubmVsSWQiLCJjbG9zZSIsIm9wZW5DaGFubmVsIiwiZSIsIm9wZW5VcmwiLCJ1cmwiLCJkaXNwbGF5Tm9PbmxpbmUiLCJnZXRFbGVtZW50QnlJZCIsImhpZGVOb09ubGluZSIsImhpZGVOb0NoYW5uZWxzIiwiZGlzcGxheU5vQ2hhbm5lbHMiLCJkaXNwbGF5TG9hZGluZyIsInBhcmVudE5vZGUiLCJoaWRlTG9hZGluZyIsInNldFN0eWxlIiwic3R5bGUiLCJuZXdDbGFzcyIsIm1haW4iLCJzZXRFeHRyYXNWaXNpYmlsaXR5IiwidmlzaWJsZSIsImZpbmRJbnNlcnRpb25Ob2RlSW4iLCJsaXN0IiwiZmlyc3RFbGVtZW50Q2hpbGQiLCJsb2NhbGVDb21wYXJlIiwibmV4dFNpYmxpbmciLCJpbnNlcnRCZWZvcmUiLCJwYXJlbnQiLCJ1bmFtZSIsImluc2VydENoYW5uZWwiLCJpc05vbkxpdmUiLCJjb250ZXh0TWVudUxpc3RlbmVyIiwiaXNPZmZsaW5lIiwiZGlzYWJsZWQiLCJlbmFibGVkIiwiYnVpbGRDaGFubmVsIiwidW5zcGVjaWZpYyIsImNoYW5uZWxOb2RlIiwiY3JlYXRlRWxlbWVudCIsImluc2VydEFkamFjZW50SFRNTCIsIk9iamVjdCIsImtleXMiLCJpbWFnZSIsIm1hcCIsInMiLCJqb2luIiwidGh1bWJuYWlsIiwidGl0bGUiLCJhbHRlcm5hdGVVc2VybmFtZSIsInZpZXdlcnMiLCJjYXRlZ29yeSIsInR5cGUiLCJiaW5kIiwibG9naW4iLCJhcmNoaXZlVXJsIiwiY291bnRMaXZlQ2hhbm5lbHMiLCJjaGlsZEVsZW1lbnRDb3VudCIsImFkZENoYW5uZWwiLCJ2YWx1ZSIsInJlbW92ZUNoYW5uZWwiLCJ1cGRhdGVOb2RlQ29udGVudCIsIm5hbWVOb2RlIiwidGl0bGVOb2RlIiwibmF2aWdhdG9yIiwib25MaW5lIiwiRGF0ZSIsIm5vdyIsInNyY3NldCIsIm1ha2VDaGFubmVsTGl2ZSIsIm1ha2VDaGFubmVsT2ZmbGluZSIsIm1ha2VDaGFubmVsRGlzdGluY3QiLCJnZXRGZWF0dXJlZENoYW5uZWxzIiwicHJvdmlkZXJTZWFyY2giLCJleHRlcm5hbENvbnRleHRNZW51Q29tbWFuZCIsImNvbW1hbmQiLCJmb3J3YXJkRXZlbnQiLCJhcHBseVNlYXJjaFRvRXhwbG9yZSIsImV4cGxvcmVTZWxlY3QiLCJmaWVsZCIsImhhc0F0dHJpYnV0ZSIsImhhc09wdGlvbiIsInByb3ZpZGVyIiwicHJvdmlkZXJEcm9wZG93biIsIm8iLCJvcHRpb25zIiwiYWRkRXhwbG9yZVByb3ZpZGVycyIsImV4cGxvcmVQcm92aWRlcnMiLCJmb3JFYWNoIiwicCIsIk9wdGlvbiIsInRvZ2dsZVF1ZXVlQ29udGV4dEl0ZW1zIiwicXVldWVQYXVzZWQiLCJzZXROb25MaXZlRGlzcGxheSIsImRpc3BsYXkiLCJub25MaXZlVGFiIiwidGFiYmVkIiwiY2hhbm5lbHNUb01vdmUiLCJBcnJheSIsImZyb20iLCJzZXRUaGVtZSIsInRoZW1lIiwiYm9keSIsIm9uTWVzc2FnZSIsImFkZExpc3RlbmVyIiwiYnV0dG9uIiwic3VwcG9ydHMiLCJmZWF0dXJlZCIsImNoYW5uZWxzIiwiaGFzQ2hpbGROb2RlcyIsImZpcnN0Q2hpbGQiLCJhcHBlbmQiLCJhcHBseSIsImJsdXIiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUEr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LEtBUEQsRUFPRyxLQVBIOztBQVNBSCxpQkFBYSxPQUFiO0FBQ0gsQ0EvREQsRSIsImZpbGUiOiJsaXN0L2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gNTYpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGEyYTQzOTFjZTM4ZDMwNTg2MmM4IiwiLyoqXG4gKiBOb2RlIGZpbHRlcmluZyBzY3JpcHRcbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwtMi4wXG4gKi9cbmltcG9ydCB7IHNob3csIGhpZGUgfSBmcm9tICcuL3V0aWxzJztcblxuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBSdWxlXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2F0dHJpYnV0ZT1cInRleHRDb250ZW50XCJdIC0gVGhlIGF0dHJpYnV0ZSB0aGlzIHJ1bGUgY2hlY2tzLFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiBpdCdzIFwiY2xhc3NcIiwgaW5kaXZpZHVhbFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzIG9uIHRoZSBOb2RlIGFyZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2VkIGluc3RlYWQgb2YgbWF0Y2hpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHdob2xlIGF0dHJpYnV0ZSBhZ2FpbnN0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBxdWVyeS5cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbc3VidGFyZ2V0XSAtIEEgc2VsZWN0b3IgZm9yIGEgbm9kZSBjb250YWluZWQgd2l0aGluIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tlZCBub2RlIGFzIGEgaG9sZGVyIG9mIHRoZSBwb3RlbnRpYWxseVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hpbmcgYXR0cmlidXRlLlxuICovXG4vKipcbiAqIEFuIGFycmF5IG9mIHJ1bGVzLCBvZiB3aGljaCBhdCBsZWFzdCBvbmUgaGFzIHRvIG1hdGNoIGluIG9yZGVyIGZvciB0aGUgd2hvbGVcbiAqIHRhcmdldCB0byBiZSBtYXRjaGluZyB0aGUgcXVlcnkuXG4gKlxuICogQHR5cGVkZWYge0FycmF5LjxSdWxlPn0gUnVsZVNldFxuICovXG5cbi8qKlxuICogQ2hlY2sgdGhlIGNsYXNzZXMgb2YgYSBub2RlIGZvciB0aGUgcXVlcnkuIElnbm9yZXMgdGhlIFwiaGlkZGVuXCIgY2xhc3MuXG4gKlxuICogQHBhcmFtIHtET01Ob2RlfSBub2RlIC0gTm9kZSB0byBjaGVjayB0aGUgY2xhc3NlcyBvbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBxdWVyeSAtIFRoZSBzdHJpbmcgdG8gbG9vayBmb3IuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gSW5kaWNhdGVzIGlmIHRoZSBjbGFzcyBoYXMgYmVlbiBmb3VuZC5cbiAqL1xuZnVuY3Rpb24gY2hlY2tDbGFzc2VzKG5vZGUsIHF1ZXJ5KSB7XG4gICAgbGV0IGNsYXNzZXMgPSBub2RlLmNsYXNzTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIC8vIHJlbW92ZSBoaWRkZW4gZnJvbSB0aGUgbGlzdCBvZiBjbGFzc2VzXG4gICAgaWYobm9kZS5jbGFzc0xpc3QuY29udGFpbnMoXCJoaWRkZW5cIikpIHtcbiAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMucmVwbGFjZShcImhpZGRlblwiLCBcIlwiKS50cmltKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuaW5jbHVkZXMocXVlcnkpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgbm9kZSBtYXRjaGVzIHRoZSBnaXZlbiBxdWVyeSBiYXNlZCBvbiB0aGUgcnVsZXMuIE1hdGNoZXMgYXJlXG4gKiBjYXNlIGluc2Vuc2l0aXZlLlxuICpcbiAqIEBwYXJhbSB7RE9NTm9kZX0gbm9kZSAtIE5vZGUgdG8gc2VhcmNoLlxuICogQHBhcmFtIHtzdHJpbmd9IHF1ZXJ5IC0gQ2FuIGJlIG11dGxpcGxlIHF1ZXJpZXMgdGhhdCBhbGwgbXVzdCBtYXRjaCxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIHNlcGFyYXRlZCBieSBhIHNwYWNlLlxuICogQHBhcmFtIHtSdWxlU2V0fSBydWxlcyAtIFJ1bGVzIHRvIGFwcGx5IHRoZSBxdWVyeSB0by5cbiAqIEByZXR1cm5zIHtib29sZWFufSBJbmRpY2F0ZXMgaWYgdGhlIG5vZGUgbWF0Y2hlcyB0aGUgcXVlcnkgb3Igbm90LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hlcyhub2RlLCBxdWVyeSwgcnVsZXMpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XG4gICAgbGV0IHRhcmdldCA9IG5vZGU7XG4gICAgY29uc3QgcXVlcmllcyA9IHF1ZXJ5LnNwbGl0KFwiIFwiKTtcbiAgICByZXR1cm4gcXVlcmllcy5ldmVyeSgocSkgPT4ge1xuICAgICAgICByZXR1cm4gcnVsZXMuc29tZSgocnVsZSkgPT4ge1xuICAgICAgICAgICAgcnVsZS5hdHRyaWJ1dGUgPSBydWxlLmF0dHJpYnV0ZSB8fCBcInRleHRDb250ZW50XCI7XG4gICAgICAgICAgICBpZihydWxlLnN1YnRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IG5vZGUucXVlcnlTZWxlY3RvcihydWxlLnN1YnRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSBub2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihydWxlLmF0dHJpYnV0ZSA9PSBcImNsYXNzXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tDbGFzc2VzKHRhcmdldCwgcSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3J1bGUuYXR0cmlidXRlXS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBGaWx0ZXIgbm9kZXMgaW5zaWRlIGEgcm9vdCBieSBhIHF1ZXJ5IGJhc2VkIG9uIHJ1bGVzIG9mIHdoaWNoIGNvbnRlbnQgc3RyaW5nc1xuICogdG8gY2hlY2sgKHRleHRDb250ZW50LCBjbGFzc2VzLCBpZCBldGMuKS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcXVlcnkgLSBTdHJpbmcgdG8gbG9vayBmb3IuXG4gKiBAcGFyYW0ge0RPTU5vZGV9IHJvb3QgLSBOb2RlIHRvIHN0YXJ0IHNlYXJjaCBvbi5cbiAqIEBwYXJhbSB7UnVsZVNldH0gcnVsZXMgLSBSdWxlcyB0byBhcHBseSB0byB0aGUgcXVlcnkuXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyKHF1ZXJ5LCByb290LCBydWxlcykge1xuICAgIGNvbnN0IG5vZGVzID0gcm9vdC5jaGlsZHJlbjtcblxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZihxdWVyeSkge1xuICAgICAgICAgICAgaWYobWF0Y2hlcyhub2Rlc1tpXSwgcXVlcnksIHJ1bGVzKSkge1xuICAgICAgICAgICAgICAgIHNob3cobm9kZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaGlkZShub2Rlc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzaG93KG5vZGVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9jb250ZW50L2ZpbHRlci5qcyIsIi8qKlxuICogVHJhbnNsYXRlcyBhIEhUTWwgcGFnZSBpbiB0aGUgd2ViIGwxMG4gc3R5bGUgZnJvbSB0aGUgQWRkLW9uIFNESyB3aXRoXG4gKiBXZWJFeHRlbnNpb25zIHN0cmluZ3MuXG4gKiBMYXJnZSBwYXJ0cyBvZiB0aGUgbG9naWMgYXJlIHZlcnkgc2ltaWxhciB0byB0aGUgU0RLIGltcGxtZW50YXRpb24uXG4gKiBBbGwgeW91IGhhdmUgdG8gZG8gdG8gdXNlIHRoaXMgaW4gYSBkb2N1bWVudCBpcyBsb2FkIGl0LlxuICpcbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwtMi4wXG4gKi9cblxuZnVuY3Rpb24gdHJhbnNsYXRlRWxlbWVudEF0dHJpYnV0ZXMoZWxlbWVudCkge1xuICAgIGNvbnN0IGF0dHJMaXN0ID0gWyAndGl0bGUnLCAnYWNjZXNza2V5JywgJ2FsdCcsICdsYWJlbCcsICdwbGFjZWhvbGRlcicgXSxcbiAgICAgICAgYXJpYUF0dHJNYXAgPSB7XG4gICAgICAgICAgICBcImFyaWFMYWJlbFwiOiAnYXJpYS1sYWJlbCcsXG4gICAgICAgICAgICBcImFyaWFWYWx1ZVRleHRcIjogJ2FyaWEtdmFsdWV0ZXh0JyxcbiAgICAgICAgICAgIFwiYXJpYU1vekhpbnRcIjogJ2FyaWEtbW96LWhpbnQnXG4gICAgICAgIH0sXG4gICAgICAgIGF0dHJTZXBhcmF0b3IgPSAnLic7XG5cbiAgICAvLyBUcmFuc2xhdGUgYWxsb3dlZCBhdHRyaWJ1dGVzLlxuICAgIGZvcihjb25zdCBhdHRyaWJ1dGUgb2YgYXR0ckxpc3QpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGJyb3dzZXIuaTE4bi5nZXRNZXNzYWdlKGVsZW1lbnQuZGF0YXNldC5sMTBuSWQgKyBhdHRyU2VwYXJhdG9yICsgYXR0cmlidXRlKTtcbiAgICAgICAgaWYoZGF0YSAmJiBkYXRhICE9IFwiPz9cIikge1xuICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0cmlidXRlLCBkYXRhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyYW5zbGF0ZSBhcmlhIGF0dHJpYnV0ZXMuXG4gICAgZm9yKGNvbnN0IGF0dHJBbGlhcyBpbiBhcmlhQXR0ck1hcCkge1xuICAgICAgICBjb25zdCBkYXRhID0gYnJvd3Nlci5pMThuLmdldE1lc3NhZ2UoZWxlbWVudC5kYXRhc2V0LmwxMG5JZCArIGF0dHJTZXBhcmF0b3IgKyBhdHRyQWxpYXMpO1xuICAgICAgICBpZihkYXRhICYmIGRhdGEgIT0gXCI/P1wiKSB7XG4gICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShhcmlhQXR0ck1hcFthdHRyQWxpYXNdLCBkYXRhKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlRWxlbWVudChlbGVtZW50ID0gZG9jdW1lbnQpIHtcblxuICAgIC8vIEdldCBhbGwgY2hpbGRyZW4gdGhhdCBhcmUgbWFya2VkIGFzIGJlaW5nIHRyYW5zbGF0ZWFibGUuXG4gICAgY29uc3QgY2hpbGRyZW4gPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJypbZGF0YS1sMTBuLWlkXScpO1xuICAgIGZvcihjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICBjb25zdCBkYXRhID0gYnJvd3Nlci5pMThuLmdldE1lc3NhZ2UoY2hpbGQuZGF0YXNldC5sMTBuSWQpO1xuICAgICAgICBpZihkYXRhICYmIGRhdGEgIT0gXCI/P1wiKSB7XG4gICAgICAgICAgICBjaGlsZC50ZXh0Q29udGVudCA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgdHJhbnNsYXRlRWxlbWVudEF0dHJpYnV0ZXMoY2hpbGQpO1xuICAgIH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHRyYW5zbGF0ZUVsZW1lbnQoKSwge1xuICAgIGNhcHR1cmluZzogZmFsc2UsXG4gICAgcGFzc2l2ZTogdHJ1ZVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvY29udGVudC9sMTBuLmpzIiwiLyoqXG4gKiBAYXV0aG9yIE1hcnRpbiBHaWdlclxuICogQGxpY2Vuc2UgTVBMLTIuMFxuICovXG5cbmltcG9ydCB7IHNob3csIGhpZGUgfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgU0VMRUNURURfQ0xBU1MgPSBcImN1cnJlbnRcIjtcblxuZnVuY3Rpb24gVGFiYmVkKGVsKSB7XG4gICAgdGhpcy5yb290ID0gZWw7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvckFsbChcIi50YWJzdHJpcCBhXCIpLmxlbmd0aDtcblxuICAgIGNvbnN0IHRhYkNvbnRlbnRzID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGFiY29udGVudFwiKSxcbiAgICAgICAgdGFicyA9IHRoaXMucm9vdC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRhYnN0cmlwIGFcIiksXG4gICAgICAgIGNsaWNrTGlzdGVuZXIgPSAoZXZ0KSA9PiB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0KHBhcnNlSW50KGV2dC5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudGFiLCAxMCkpO1xuICAgICAgICB9LFxuICAgICAgICBrZXlMaXN0ZW5lciA9IChldnQpID0+IHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYoZXZ0LmtleSA9PSBcIkFycm93TGVmdFwiICYmIHRoaXMuY3VycmVudCAhPSAxKSB7IC8vIGxlZnQgYXJyb3cga2V5XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QodGhpcy5jdXJyZW50IC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmKGV2dC5rZXkgPT0gXCJBcnJvd1JpZ2h0XCIgJiYgdGhpcy5jdXJyZW50IDwgdGhpcy5sZW5ndGgpIHsgLy8gcmlnaHQgYXJyb3cga2V5XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QodGhpcy5jdXJyZW50ICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGFiQ29udGVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaGlkZSh0YWJDb250ZW50c1tpXSk7XG4gICAgfVxuXG4gICAgZm9yKGxldCBqID0gMDsgaiA8IHRhYnMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgdGFic1tqXS5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCAtMSk7XG4gICAgICAgIHRhYnNbal0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNsaWNrTGlzdGVuZXIpO1xuICAgICAgICB0YWJzW2pdLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBrZXlMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgaWYodGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGFic3RyaXAgYS5cIiArIFNFTEVDVEVEX0NMQVNTKS5sZW5ndGggPT09IDAgJiYgdGhpcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0KDEpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZWxlY3QocGFyc2VJbnQodGhpcy5yb290LnF1ZXJ5U2VsZWN0b3IoXCIudGFic3RyaXAgYS5cIiArIFNFTEVDVEVEX0NMQVNTKS5kYXRhc2V0LnRhYiwgMTApKTtcbiAgICB9XG59XG5cblRhYmJlZC5wcm90b3R5cGUucm9vdCA9IG51bGw7XG5UYWJiZWQucHJvdG90eXBlLmxlbmd0aCA9IDA7XG5UYWJiZWQucHJvdG90eXBlLmN1cnJlbnQgPSAwO1xuXG5UYWJiZWQucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYoaW5kZXggPD0gdGhpcy5sZW5ndGggJiYgaW5kZXggPiAwKSB7XG4gICAgICAgIGNvbnN0IHByZXZUYWIgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcihcIi50YWJzdHJpcCBhLlwiICsgU0VMRUNURURfQ0xBU1MpLFxuICAgICAgICAgICAgdGFiID0gdGhpcy5nZXRUYWJCeUluZGV4KGluZGV4KSxcbiAgICAgICAgICAgIGV2T2JqID0gbmV3IEN1c3RvbUV2ZW50KFwidGFiY2hhbmdlZFwiLCB7IGRldGFpbDogaW5kZXggfSk7XG4gICAgICAgIGlmKHByZXZUYWIpIHtcbiAgICAgICAgICAgIHByZXZUYWIucmVtb3ZlQXR0cmlidXRlKFwiYXJpYS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgIHByZXZUYWIuY2xhc3NMaXN0LnJlbW92ZShTRUxFQ1RFRF9DTEFTUyk7XG4gICAgICAgICAgICBwcmV2VGFiLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIC0xKTtcbiAgICAgICAgICAgIGhpZGUodGhpcy5nZXRDb250ZW50QnlJbmRleChwYXJzZUludChwcmV2VGFiLmRhdGFzZXQudGFiLCAxMCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3VycmVudCA9IGluZGV4O1xuICAgICAgICB0YWIuZm9jdXMoKTtcbiAgICAgICAgdGFiLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgXCJ0cnVlXCIpO1xuICAgICAgICB0YWIuY2xhc3NMaXN0LmFkZChTRUxFQ1RFRF9DTEFTUyk7XG4gICAgICAgIHRhYi5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCAwKTtcbiAgICAgICAgc2hvdyh0aGlzLmdldENvbnRlbnRCeUluZGV4KGluZGV4KSk7XG4gICAgICAgIHRoaXMucm9vdC5kaXNwYXRjaEV2ZW50KGV2T2JqKTtcbiAgICB9XG59O1xuXG5UYWJiZWQucHJvdG90eXBlLmdldFRhYkJ5SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGNvbnN0IHRhYnMgPSB0aGlzLnJvb3QucXVlcnlTZWxlY3RvckFsbChcIi50YWJzdHJpcCBhXCIpO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0YWJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmKHBhcnNlSW50KHRhYnNbaV0uZGF0YXNldC50YWIsIDEwKSA9PSBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhYnNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cblRhYmJlZC5wcm90b3R5cGUuZ2V0Q29udGVudEJ5SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGNvbnN0IGNvbnRlbnRzID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoXCIudGFiY29udGVudFwiKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgY29udGVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYocGFyc2VJbnQoY29udGVudHNbaV0uZGF0YXNldC50YWIsIDEwKSA9PSBpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XG4gICAgY29uc3Qgcm9vdHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRhYmJlZFwiKTtcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcm9vdHNbaV0uX3RhYmJlZCA9IG5ldyBUYWJiZWQocm9vdHNbaV0pO1xuICAgIH1cbn0pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvY29udGVudC90YWJiZWQuanMiLCIvLyByZW1vdmVkIGJ5IGV4dHJhY3QtdGV4dC13ZWJwYWNrLXBsdWdpblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2NvbnRlbnQvc2hhcmVkLmNzc1xuLy8gbW9kdWxlIGlkID0gMTRcbi8vIG1vZHVsZSBjaHVua3MgPSAxIDIiLCIvKipcbiAqIExpdmUgc3RhdGUgY29uc3RhbnRzXG4gKlxuICogQGF1dGhvciBNYXJ0aW4gR2lnZXJcbiAqIEBsaWNlbnNlIE1QTC0yLjBcbiAqL1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgT0ZGTElORTogLTEsXG4gICAgTElWRTogMCxcbiAgICBSRURJUkVDVDogMSxcbiAgICBSRUJST0FEQ0FTVDogMixcbiAgICBUT1dBUkRfTElWRTogMCxcbiAgICBUT1dBUkRfT0ZGTElORTogMVxufTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9saXZlLXN0YXRlLmpzIiwiLy8gcmVtb3ZlZCBieSBleHRyYWN0LXRleHQtd2VicGFjay1wbHVnaW5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9saXN0L2xpc3QuY3NzXG4vLyBtb2R1bGUgaWQgPSAyN1xuLy8gbW9kdWxlIGNodW5rcyA9IDEiLCJtb2R1bGUuZXhwb3J0cyA9IF9fd2VicGFja19wdWJsaWNfcGF0aF9fICsgXCJhc3NldHMvaW1hZ2VzL29wZW4taWNvbmljLm1pbi5zdmdcIjtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vb3Blbi1pY29uaWMvc3ByaXRlL29wZW4taWNvbmljLm1pbi5zdmdcbi8vIG1vZHVsZSBpZCA9IDI5XG4vLyBtb2R1bGUgY2h1bmtzID0gMSIsIi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHNjcmlwdC5cbiAqIEBhdXRob3IgTWFydGluIEdpZ2VyXG4gKiBAbGljZW5zZSBNUEwtMi4wXG4gKi9cblxuLyoqXG4gKiBIaWRlIGFuIGVsZW1lbnQuIFVuc2VsZWN0cyB0aGUgZWxlbWVudCBpZiBpdCB3YXMgcHJldmlvdXNseSBzZWxlY3RlZC5cbiAqXG4gKiBAcGFyYW0ge0RPTU5vZGV9IGVsIC0gTm9kZSB0byBoaWRlLlxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhpZGUoZWwpIHtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJoaWRkZW5cIiwgdHJ1ZSk7XG4gICAgaWYoZWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgZWwuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICB9XG59XG5cbi8qKlxuICogU2hvd3MgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge0RPTU5vZGV9IGVsIC0gTm9kZSB0byBzaG93LlxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3coZWwpIHtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJoaWRkZW5cIik7XG59XG5cbi8qKlxuICogU2hvd3Mgb3IgaGlkZXMgYW4gZWxlbWVudCwgZGVwZW5kZW50IG9uIHRoZSBjb25kaXRpb24uIElmIHRoZSBjb25kaXRpb24gaXNcbiAqIHRydXRoeSB0aGUgZWxlbWVudCB3aWxsIGJlIHNob3duLlxuICpcbiAqIEBwYXJhbSB7RE9NTm9kZX0gbm9kZSAtIE5vZGUgdG8gdG9nZ2xlLlxuICogQHBhcmFtIHtib29sZWFufSBjb25kaXRpb24gLSBDb25kaXRpb24gd2hldGhlciB0aGUgbm9kZSBzaG91bGQgYmUgc2hvd24uXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9nZ2xlKG5vZGUsIGNvbmRpdGlvbikge1xuICAgIGlmKGNvbmRpdGlvbikge1xuICAgICAgICBzaG93KG5vZGUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaGlkZShub2RlKTtcbiAgICB9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvY29udGVudC91dGlscy5qcyIsIi8qKlxuICogQGF1dGhvciBNYXJ0aW4gR2lnZXJcbiAqIEBsaWNlbnNlIE1QTC0yLjBcbiAqIEB0b2RvIEN0cmwrRiBzaG91bGQgdG9nZ2xlIGZpbHRlclxuICovXG5pbXBvcnQgeyBoaWRlLCBzaG93LCB0b2dnbGUgfSBmcm9tICcuLi9jb250ZW50L3V0aWxzJztcbmltcG9ydCB7IGZpbHRlciwgbWF0Y2hlcyB9IGZyb20gJy4uL2NvbnRlbnQvZmlsdGVyJztcbmltcG9ydCAnLi4vY29udGVudC90YWJiZWQnO1xuaW1wb3J0ICcuLi9jb250ZW50L2wxMG4nO1xuaW1wb3J0ICcuL2xpc3QuY3NzJztcbmltcG9ydCAnLi4vY29udGVudC9zaGFyZWQuY3NzJztcbmltcG9ydCAnb3Blbi1pY29uaWMvc3ByaXRlL29wZW4taWNvbmljLm1pbi5zdmcnO1xuaW1wb3J0IExpdmVTdGF0ZSBmcm9tICcuLi9saXZlLXN0YXRlJztcblxubGV0IGxpdmUsXG4gICAgc2Vjb25kYXJ5TGl2ZSxcbiAgICBvZmZsaW5lLFxuICAgIGRpc3RpbmN0LFxuICAgIGV4cGxvcmUsXG4gICAgY3VycmVudE1lbnVUYXJnZXQsXG4gICAgY3VycmVudFN0eWxlLFxuICAgIHByb3ZpZGVycyxcbiAgICBub25MaXZlRGlzcGxheTtcbmNvbnN0IHBvcnQgPSBicm93c2VyLnJ1bnRpbWUuY29ubmVjdCh7IG5hbWU6IFwibGlzdFwiIH0pLFxuICAgIENIQU5ORUxfSURfUFJFRklYID0gXCJjaGFubmVsXCIsXG4gICAgRVhQTE9SRV9JRF9QUkVGSVggPSBcImV4cGxvcmVjaGFuXCIsXG4gICAgQ09OVEVYVE1FTlVfSUQgPSBcImNvbnRleHRcIixcbiAgICBFWFBMT1JFX0NPTlRFWFRNRU5VX0lEID0gXCJleHBsb3JlLWNvbnRleHRcIixcbiAgICBmaWx0ZXJzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBzdWJ0YXJnZXQ6IFwiLnByb3ZpZGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgc3VidGFyZ2V0OiBcIi5uYW1lXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgc3VidGFyZ2V0OiBcIi5hbHRlcm5hdGUtbmFtZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHN1YnRhcmdldDogXCIudGl0bGVcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBzdWJ0YXJnZXQ6IFwiLnZpZXdlcnNcIlxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBzdWJ0YXJnZXQ6IFwiLmNhdGVnb3J5XCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgY2hhbm5lbElzTGl2ZSA9IChjaGFubmVsKSA9PiBjaGFubmVsLmxpdmUuc3RhdGUgPT0gTGl2ZVN0YXRlLkxJVkUgfHwgKG5vbkxpdmVEaXNwbGF5IDwgMyAmJiBjaGFubmVsLmxpdmUuc3RhdGUgPiBMaXZlU3RhdGUuTElWRSksXG4gICAgZ2V0Q2hhbm5lbElkRnJvbUlkID0gKGlkKSA9PiBwYXJzZUludChpZC5zdWJzdHJpbmcoQ0hBTk5FTF9JRF9QUkVGSVgubGVuZ3RoKSwgMTApLFxuICAgIGNvbnRleHRNZW51Q29tbWFuZCA9IChldmVudCkgPT4ge1xuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHRhcmdldDogZXZlbnQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IGdldENoYW5uZWxJZEZyb21JZChjdXJyZW50TWVudVRhcmdldC5pZClcbiAgICAgICAgfSk7XG4gICAgICAgIGlmKGV2ZW50ID09IFwib3BlbkFyY2hpdmVcIiB8fCBldmVudCA9PSBcIm9wZW5DaGF0XCIpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnRNZW51VGFyZ2V0ID0gbnVsbDtcbiAgICB9LFxuICAgIG9wZW5DaGFubmVsID0gKGNoYW5uZWxJZCwgZSkgPT4ge1xuICAgICAgICBpZihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFwib3BlblwiLFxuICAgICAgICAgICAgY2hhbm5lbElkXG4gICAgICAgIH0pO1xuICAgICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICB9LFxuICAgIG9wZW5VcmwgPSAodXJsLCBlKSA9PiB7XG4gICAgICAgIGlmKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHRhcmdldDogXCJvcGVuVXJsXCIsXG4gICAgICAgICAgICB1cmxcbiAgICAgICAgfSk7XG4gICAgICAgIHdpbmRvdy5jbG9zZSgpO1xuICAgIH0sXG4gICAgZGlzcGxheU5vT25saW5lID0gKCkgPT4ge1xuICAgICAgICBzaG93KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibm9vbmxpbmVcIikpO1xuICAgIH0sXG4gICAgaGlkZU5vT25saW5lID0gKCkgPT4ge1xuICAgICAgICBoaWRlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibm9vbmxpbmVcIikpO1xuICAgIH0sXG4gICAgaGlkZU5vQ2hhbm5lbHMgPSAoKSA9PiB7XG4gICAgICAgIGhpZGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJub2NoYW5uZWxzXCIpKTtcbiAgICB9LFxuICAgIGRpc3BsYXlOb0NoYW5uZWxzID0gKCkgPT4ge1xuICAgICAgICBkaXNwbGF5Tm9PbmxpbmUoKTtcbiAgICAgICAgc2hvdyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5vY2hhbm5lbHNcIikpO1xuICAgIH0sXG4gICAgZGlzcGxheUxvYWRpbmcgPSAoKSA9PiB7XG4gICAgICAgIHNob3coZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2FkaW5nZXhwbG9yZVwiKSk7XG4gICAgICAgIGV4cGxvcmUucGFyZW50Tm9kZS5jbGFzc0xpc3QuYWRkKFwibG9hZGluZ1wiKTtcbiAgICB9LFxuICAgIGhpZGVMb2FkaW5nID0gKCkgPT4ge1xuICAgICAgICBoaWRlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9hZGluZ2V4cGxvcmVcIikpO1xuICAgICAgICBleHBsb3JlLnBhcmVudE5vZGUuY2xhc3NMaXN0LnJlbW92ZShcImxvYWRpbmdcIik7XG4gICAgfSxcbiAgICBzZXRTdHlsZSA9IChzdHlsZSkgPT4ge1xuICAgICAgICBsZXQgbmV3Q2xhc3M7XG4gICAgICAgIHN3aXRjaChzdHlsZSkge1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBuZXdDbGFzcyA9IFwidGh1bWJuYWlsXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgbmV3Q2xhc3MgPSBcImNvbXBhY3RcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgbmV3Q2xhc3MgPSBcImRlZmF1bHRcIjtcbiAgICAgICAgfVxuICAgICAgICBpZihuZXdDbGFzcyAhPSBjdXJyZW50U3R5bGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnRhYmJlZFwiKTtcbiAgICAgICAgICAgIGlmKGN1cnJlbnRTdHlsZSkge1xuICAgICAgICAgICAgICAgIG1haW4uY2xhc3NMaXN0LnJlcGxhY2UoY3VycmVudFN0eWxlLCBuZXdDbGFzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYWluLmNsYXNzTGlzdC5hZGQobmV3Q2xhc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3VycmVudFN0eWxlID0gbmV3Q2xhc3M7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldEV4dHJhc1Zpc2liaWxpdHkgPSAodmlzaWJsZSkgPT4ge1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnRhYmJlZFwiKS5jbGFzc0xpc3QudG9nZ2xlKFwiZXh0cmFzXCIsIHZpc2libGUpO1xuICAgIH0sXG4gICAgZmluZEluc2VydGlvbk5vZGVJbiA9IChsaXN0LCBuYW1lKSA9PiB7XG4gICAgICAgIC8vIEZpbmQgdGhlIG5vZGUgdG8gaW5zZXJ0IGJlZm9yZSBpbiBvcmRlciB0byBrZWVwIHRoZSBsaXN0IHNvcnRlZFxuICAgICAgICBsZXQgbm9kZSA9IGxpc3QuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cbiAgICAgICAgd2hpbGUobm9kZSAmJiBuYW1lLmxvY2FsZUNvbXBhcmUobm9kZS5xdWVyeVNlbGVjdG9yKFwiLm5hbWVcIikudGV4dENvbnRlbnQpID49IDApIHtcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgaW5zZXJ0QmVmb3JlID0gKHBhcmVudCwgbm9kZSwgdW5hbWUpID0+IHtcbiAgICAgICAgaWYoIXBhcmVudC5xdWVyeVNlbGVjdG9yKFwiI1wiICsgbm9kZS5pZCkpIHtcbiAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUobm9kZSwgZmluZEluc2VydGlvbk5vZGVJbihwYXJlbnQsIHVuYW1lKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGluc2VydENoYW5uZWwgPSAoY2hhbm5lbCwgbm9kZSkgPT4ge1xuICAgICAgICBjb25zdCBpc05vbkxpdmUgPSBjaGFubmVsLmxpdmUuc3RhdGUgPj0gTGl2ZVN0YXRlLlJFRElSRUNUO1xuICAgICAgICBpZihjaGFubmVsLmxpdmUuc3RhdGUgPT0gTGl2ZVN0YXRlLkxJVkUgfHwgKG5vbkxpdmVEaXNwbGF5ID09PSAwICYmIGlzTm9uTGl2ZSkpIHtcbiAgICAgICAgICAgIGluc2VydEJlZm9yZShsaXZlLCBub2RlLCBjaGFubmVsLnVuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGlzTm9uTGl2ZSAmJiBub25MaXZlRGlzcGxheSA9PSAxKSB7XG4gICAgICAgICAgICBpbnNlcnRCZWZvcmUoc2Vjb25kYXJ5TGl2ZSwgbm9kZSwgY2hhbm5lbC51bmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihpc05vbkxpdmUgJiYgbm9uTGl2ZURpc3BsYXkgPT0gMikge1xuICAgICAgICAgICAgaW5zZXJ0QmVmb3JlKGRpc3RpbmN0LCBub2RlLCBjaGFubmVsLnVuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGluc2VydEJlZm9yZShvZmZsaW5lLCBub2RlLCBjaGFubmVsLnVuYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgY29udGV4dE1lbnVMaXN0ZW5lciA9IChlKSA9PiB7XG4gICAgICAgIGN1cnJlbnRNZW51VGFyZ2V0ID0gZS5jdXJyZW50VGFyZ2V0O1xuICAgICAgICBjb25zdCBpc09mZmxpbmUgPSBlLmN1cnJlbnRUYXJnZXQucGFyZW50Tm9kZS5pZCA9PSBcIm9mZmxpbmVcIjtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZXh0T3BlblwiKS5kaXNhYmxlZCA9IGlzT2ZmbGluZTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZXh0UmVmcmVzaFwiKS5kaXNhYmxlZCA9ICFwcm92aWRlcnNbZS5jdXJyZW50VGFyZ2V0LmNsYXNzTmFtZV0uZW5hYmxlZDtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZXh0QWRkXCIpLmRpc2FibGVkID0gIXByb3ZpZGVyc1tlLmN1cnJlbnRUYXJnZXQuY2xhc3NOYW1lXS5lbmFibGVkO1xuICAgIH0sXG4gICAgYnVpbGRDaGFubmVsID0gKGNoYW5uZWwsIHVuc3BlY2lmaWMgPSBmYWxzZSkgPT4ge1xuICAgICAgICBjb25zdCBjaGFubmVsTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKTtcbiAgICAgICAgY2hhbm5lbE5vZGUuaW5zZXJ0QWRqYWNlbnRIVE1MKFwiYmVmb3JlZW5kXCIsXG5gPGEgaHJlZj1cIlwiIGNvbnRleHRtZW51PVwiJHt1bnNwZWNpZmljID8gRVhQTE9SRV9DT05URVhUTUVOVV9JRCA6IENPTlRFWFRNRU5VX0lEfVwiPlxuICAgIDxpbWcgc3JjPVwiXCI+XG4gICAgPGRpdj5cbiAgICAgICAgPGltZyBzcmNzZXQ9XCJcIiBzaXplcz1cIjMwd1wiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInJlYnJvYWRjYXN0IGhpZGUtb2ZmbGluZVwiIGhpZGRlbj48c3ZnIGNsYXNzPVwiaWNvblwiIHZpZXdCb3g9XCIwIDAgOCA4XCI+XG4gICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9XCIuLi9hc3NldHMvaW1hZ2VzL29wZW4taWNvbmljLm1pbi5zdmcjbG9vcFwiPjwvdXNlPlxuICAgICAgICA8L3N2Zz4gPC9zcGFuPjxzcGFuIGNsYXNzPVwibmFtZVwiPjwvc3Bhbj48c3BhbiBjbGFzcz1cIm5vbmxpdmVuYW1lIGhpZGUtb2ZmbGluZVwiIGhpZGRlbj4g4oaSIDxzcGFuIGNsYXNzPVwiYWx0ZXJuYXRlLW5hbWVcIj48L3NwYW4+PC9zcGFuPjxicj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJ0aXRsZSBoaWRlLW9mZmxpbmVcIj48L3NwYW4+XG4gICAgICAgIDxhc2lkZT5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidmlld2Vyc1dyYXBwZXIgaGlkZS1vZmZsaW5lXCI+XG4gICAgICAgICAgICAgICAgPHN2ZyBjbGFzcz1cImljb25cIiB2aWV3Qm94PVwiMCAwIDggOFwiPlxuICAgICAgICAgICAgICAgICAgICA8dXNlIHhsaW5rOmhyZWY9XCIuLi9hc3NldHMvaW1hZ2VzL29wZW4taWNvbmljLm1pbi5zdmcjZXllXCI+PC91c2U+XG4gICAgICAgICAgICAgICAgPC9zdmc+Jm5ic3A7PHNwYW4gY2xhc3M9XCJ2aWV3ZXJzXCI+MDwvc3Bhbj4mI3gyMDtcbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY2F0ZWdvcnlXcmFwcGVyIGhpZGUtb2ZmbGluZVwiPlxuICAgICAgICAgICAgICAgIDxzdmcgY2xhc3M9XCJpY29uXCIgdmlld0JveD1cIjAgMCA4IDhcIj5cbiAgICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPVwiLi4vYXNzZXRzL2ltYWdlcy9vcGVuLWljb25pYy5taW4uc3ZnI3RhZ1wiPjwvdXNlPlxuICAgICAgICAgICAgICAgIDwvc3ZnPiZuYnNwOzxzcGFuIGNsYXNzPVwiY2F0ZWdvcnlcIj48L3NwYW4+JiN4MjA7XG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cInByb3ZpZGVyV3JhcHBlclwiPlxuICAgICAgICAgICAgICAgIDxzdmcgY2xhc3M9XCJpY29uXCIgdmlld0JveD1cIjAgMCA4IDhcIj5cbiAgICAgICAgICAgICAgICAgICAgPHVzZSB4bGluazpocmVmPVwiLi4vYXNzZXRzL2ltYWdlcy9vcGVuLWljb25pYy5taW4uc3ZnI2hhcmQtZHJpdmVcIj48L3VzZT5cbiAgICAgICAgICAgICAgICA8L3N2Zz4mbmJzcDs8c3BhbiBjbGFzcz1cInByb3ZpZGVyXCI+PC9zcGFuPlxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2FzaWRlPlxuICAgIDwvZGl2PlxuPC9hPmApO1xuICAgICAgICBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiZGl2IGltZ1wiKS5zZXRBdHRyaWJ1dGUoXCJzcmNzZXRcIiwgT2JqZWN0LmtleXMoY2hhbm5lbC5pbWFnZSkubWFwKChzKSA9PiBjaGFubmVsLmltYWdlW3NdICsgXCIgXCIgKyBzICsgXCJ3XCIpLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcImEgPiBpbWdcIikuc2V0QXR0cmlidXRlKFwic3JjXCIsIGNoYW5uZWwudGh1bWJuYWlsKTtcbiAgICAgICAgY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcIi5uYW1lXCIpLnRleHRDb250ZW50ID0gY2hhbm5lbC51bmFtZTtcbiAgICAgICAgY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcIi50aXRsZVwiKS50ZXh0Q29udGVudCA9IGNoYW5uZWwudGl0bGU7XG4gICAgICAgIGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCIuYWx0ZXJuYXRlLW5hbWVcIikudGV4dENvbnRlbnQgPSBjaGFubmVsLmxpdmUuYWx0ZXJuYXRlVXNlcm5hbWU7XG4gICAgICAgIHRvZ2dsZShjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLm5vbmxpdmVuYW1lXCIpLCBjaGFubmVsLmxpdmUuYWx0ZXJuYXRlVXNlcm5hbWUgIT09IFwiXCIpO1xuICAgICAgICB0b2dnbGUoY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcIi5yZWJyb2FkY2FzdFwiKSwgY2hhbm5lbC5saXZlLnN0YXRlID09IExpdmVTdGF0ZS5SRUJST0FEQ0FTVCk7XG4gICAgICAgIGlmKCEoXCJ2aWV3ZXJzXCIgaW4gY2hhbm5lbCkgfHwgY2hhbm5lbC52aWV3ZXJzIDwgMCkge1xuICAgICAgICAgICAgaGlkZShjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLnZpZXdlcnNXcmFwcGVyXCIpKTtcbiAgICAgICAgfVxuICAgICAgICBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLnZpZXdlcnNcIikudGV4dENvbnRlbnQgPSBjaGFubmVsLnZpZXdlcnM7XG4gICAgICAgIGlmKCFjaGFubmVsLmNhdGVnb3J5KSB7XG4gICAgICAgICAgICBoaWRlKGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCIuY2F0ZWdvcnlXcmFwcGVyXCIpKTtcbiAgICAgICAgfVxuICAgICAgICBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLmNhdGVnb3J5XCIpLnRleHRDb250ZW50ID0gY2hhbm5lbC5jYXRlZ29yeTtcbiAgICAgICAgY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcIi5wcm92aWRlclwiKS50ZXh0Q29udGVudCA9IHByb3ZpZGVyc1tjaGFubmVsLnR5cGVdLm5hbWU7XG4gICAgICAgIGNoYW5uZWxOb2RlLmNsYXNzTGlzdC5hZGQoY2hhbm5lbC50eXBlKTtcbiAgICAgICAgaWYoIXVuc3BlY2lmaWMpIHtcbiAgICAgICAgICAgIGNoYW5uZWxOb2RlLmlkID0gQ0hBTk5FTF9JRF9QUkVGSVggKyBjaGFubmVsLmlkO1xuICAgICAgICAgICAgY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcImFcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG9wZW5DaGFubmVsLmJpbmQobnVsbCwgY2hhbm5lbC5pZCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2hhbm5lbE5vZGUuaWQgPSBFWFBMT1JFX0lEX1BSRUZJWCArIGNoYW5uZWwubG9naW47XG4gICAgICAgICAgICBjaGFubmVsTm9kZS5kYXRhc2V0LnVybCA9IGNoYW5uZWwudXJsWzBdO1xuICAgICAgICAgICAgY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcImFcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG9wZW5VcmwuYmluZChudWxsLCBjaGFubmVsSXNMaXZlKGNoYW5uZWwpID8gY2hhbm5lbC51cmxbMF0gOiBjaGFubmVsLmFyY2hpdmVVcmwpKTtcbiAgICAgICAgfVxuICAgICAgICBjaGFubmVsTm9kZS5hZGRFdmVudExpc3RlbmVyKFwiY29udGV4dG1lbnVcIiwgY29udGV4dE1lbnVMaXN0ZW5lcik7XG5cbiAgICAgICAgaWYoY2hhbm5lbC5saXZlLnN0YXRlID4gMCkge1xuICAgICAgICAgICAgY2hhbm5lbE5vZGUuY2xhc3NMaXN0LmFkZChcIm5vbmxpdmVcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbm5lbE5vZGU7XG4gICAgfSxcbiAgICBjb3VudExpdmVDaGFubmVscyA9ICgpID0+IGxpdmUuY2hpbGRFbGVtZW50Q291bnQgKyBzZWNvbmRhcnlMaXZlLmNoaWxkRWxlbWVudENvdW50LFxuICAgIGFkZENoYW5uZWwgPSAoY2hhbm5lbCkgPT4ge1xuICAgICAgICBjb25zdCBjaGFubmVsTm9kZSA9IGJ1aWxkQ2hhbm5lbChjaGFubmVsKTtcbiAgICAgICAgLy8gaGlkZSB0aGUgY2hhbm5lbCBieSBpZiBpdCdzIGZpbHRlcmVkIG91dCBhdG1cbiAgICAgICAgaWYoIW1hdGNoZXMoY2hhbm5lbE5vZGUsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2VhcmNoRmllbGRcIikudmFsdWUsIGZpbHRlcnMpKSB7XG4gICAgICAgICAgICBoaWRlKGNoYW5uZWxOb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydENoYW5uZWwoY2hhbm5lbCwgY2hhbm5lbE5vZGUpO1xuICAgICAgICBoaWRlTm9DaGFubmVscygpO1xuICAgICAgICBpZihjaGFubmVsSXNMaXZlKGNoYW5uZWwpKSB7XG4gICAgICAgICAgICBoaWRlTm9PbmxpbmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVtb3ZlQ2hhbm5lbCA9IChjaGFubmVsSWQpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbm5lbE5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDSEFOTkVMX0lEX1BSRUZJWCArIGNoYW5uZWxJZCk7XG4gICAgICAgIGlmKGNoYW5uZWxOb2RlLnBhcmVudE5vZGUuaWQgPT09IFwibGl2ZVwiKSB7XG4gICAgICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IFwicmVtb3ZlZExpdmVcIixcbiAgICAgICAgICAgICAgICBjaGFubmVsSWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gU21hbGxlciB0d28sIHNpbmNlIHdlIHJlbW92ZSB0aGUgY2hhbm5lbCBub2RlIGFmdGVyIHRoaXMsIGFzIHdlIHN0aWxsXG4gICAgICAgICAgICAvLyBuZWVkZWQgaXRzIHBhcmVudCdzIGlkIGJlZm9yZS5cbiAgICAgICAgICAgIGlmKGNvdW50TGl2ZUNoYW5uZWxzKCkgPCAyKSB7XG4gICAgICAgICAgICAgICAgZGlzcGxheU5vT25saW5lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjaGFubmVsTm9kZS5yZW1vdmUoKTtcblxuICAgICAgICBpZihjb3VudExpdmVDaGFubmVscygpID09PSAwICYmIG9mZmxpbmUuY2hpbGRFbGVtZW50Q291bnQgPT09IDAgJiYgZGlzdGluY3QuY2hpbGRFbGVtZW50Q291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGRpc3BsYXlOb0NoYW5uZWxzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHVwZGF0ZU5vZGVDb250ZW50ID0gKGNoYW5uZWwpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbm5lbE5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDSEFOTkVMX0lEX1BSRUZJWCArIGNoYW5uZWwuaWQpLFxuICAgICAgICAgICAgbmFtZU5vZGUgPSBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLm5hbWVcIiksXG4gICAgICAgICAgICB0aXRsZU5vZGUgPSBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLnRpdGxlXCIpLFxuICAgICAgICAgICAgdmlld2VycyA9IGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCIudmlld2Vyc1wiKSxcbiAgICAgICAgICAgIGNhdGVnb3J5ID0gY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcIi5jYXRlZ29yeVwiKTtcblxuICAgICAgICB0aXRsZU5vZGUudGV4dENvbnRlbnQgPSBjaGFubmVsLnRpdGxlO1xuICAgICAgICBuYW1lTm9kZS50ZXh0Q29udGVudCA9IGNoYW5uZWwudW5hbWU7XG4gICAgICAgIGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCIuYWx0ZXJuYXRlLW5hbWVcIikudGV4dENvbnRlbnQgPSBjaGFubmVsLmxpdmUuYWx0ZXJuYXRlVXNlcm5hbWU7XG4gICAgICAgIHRvZ2dsZShjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLm5vbmxpdmVuYW1lXCIpLCBjaGFubmVsLmxpdmUuYWx0ZXJuYXRlVXNlcm5hbWUgIT09IFwiXCIpO1xuICAgICAgICB0b2dnbGUoY2hhbm5lbE5vZGUucXVlcnlTZWxlY3RvcihcIi5yZWJyb2FkY2FzdFwiKSwgY2hhbm5lbC5saXZlLnN0YXRlID09IExpdmVTdGF0ZS5SRUJST0FEQ0FTVCk7XG5cbiAgICAgICAgdmlld2Vycy50ZXh0Q29udGVudCA9IGNoYW5uZWwudmlld2VycztcbiAgICAgICAgdG9nZ2xlKGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCIudmlld2Vyc1dyYXBwZXJcIiksIChcInZpZXdlcnNcIiBpbiBjaGFubmVsKSAmJiBjaGFubmVsLnZpZXdlcnMgPiAwKTtcblxuICAgICAgICBjYXRlZ29yeS50ZXh0Q29udGVudCA9IGNoYW5uZWwuY2F0ZWdvcnk7XG4gICAgICAgIHRvZ2dsZShjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiLmNhdGVnb3J5V3JhcHBlclwiKSwgISFjaGFubmVsLmNhdGVnb3J5KTtcblxuICAgICAgICBjaGFubmVsTm9kZS5jbGFzc0xpc3QudG9nZ2xlKFwibm9ubGl2ZVwiLCBjaGFubmVsLmxpdmUuc3RhdGUgPiBMaXZlU3RhdGUuTElWRSk7XG5cbiAgICAgICAgLy8gb25seSB1cGRhdGUgaW1hZ2VzIGlmIHRoZSB1c2VyIGlzIG9ubGluZSB0byBhdm9pZCBicm9rZW4gaW1hZ2VzXG4gICAgICAgIGlmKG5hdmlnYXRvci5vbkxpbmUpIHtcbiAgICAgICAgICAgIGlmKGNoYW5uZWxJc0xpdmUoY2hhbm5lbCkpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsTm9kZS5xdWVyeVNlbGVjdG9yKFwiYT5pbWdcIikuc2V0QXR0cmlidXRlKFwic3JjXCIsIGNoYW5uZWwudGh1bWJuYWlsICsgXCI/dGltZXN0YW1wPVwiICsgRGF0ZS5ub3coKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNoYW5uZWxOb2RlLnF1ZXJ5U2VsZWN0b3IoXCJhIGRpdiBpbWdcIikuc3Jjc2V0ID0gT2JqZWN0LmtleXMoY2hhbm5lbC5pbWFnZSlcbiAgICAgICAgICAgICAgICAubWFwKChzKSA9PiBjaGFubmVsLmltYWdlW3NdICsgXCIgXCIgKyBzICsgXCJ3XCIpLmpvaW4oXCIsXCIpO1xuICAgICAgICB9XG4gICAgfSxcbi8vVE9ETyBwbGFjaW5nIHN0dWZmIChsaXZlIGNoYW5uZWwgZ29lcyBob3N0ZWQgLT4gbWlnaHQgbmVlZCByZW9yZGVyaW5nKVxuICAgIG1ha2VDaGFubmVsTGl2ZSA9IChjaGFubmVsKSA9PiB7XG4gICAgICAgIGhpZGVOb09ubGluZSgpO1xuICAgICAgICB1cGRhdGVOb2RlQ29udGVudChjaGFubmVsKTtcbiAgICAgICAgaW5zZXJ0Q2hhbm5lbChjaGFubmVsLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDSEFOTkVMX0lEX1BSRUZJWCArIGNoYW5uZWwuaWQpKTtcbiAgICB9LFxuICAgIG1ha2VDaGFubmVsT2ZmbGluZSA9IChjaGFubmVsKSA9PiB7XG4gICAgICAgIGluc2VydENoYW5uZWwoY2hhbm5lbCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoQ0hBTk5FTF9JRF9QUkVGSVggKyBjaGFubmVsLmlkKSk7XG4gICAgICAgIHVwZGF0ZU5vZGVDb250ZW50KGNoYW5uZWwpO1xuICAgICAgICBpZihjb3VudExpdmVDaGFubmVscygpID09PSAwKSB7XG4gICAgICAgICAgICBkaXNwbGF5Tm9PbmxpbmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgbWFrZUNoYW5uZWxEaXN0aW5jdCA9IChjaGFubmVsKSA9PiB7XG4gICAgICAgIGluc2VydENoYW5uZWwoY2hhbm5lbCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoQ0hBTk5FTF9JRF9QUkVGSVggKyBjaGFubmVsLmlkKSk7XG4gICAgICAgIHVwZGF0ZU5vZGVDb250ZW50KGNoYW5uZWwpO1xuICAgICAgICBpZihjb3VudExpdmVDaGFubmVscygpID09PSAwKSB7XG4gICAgICAgICAgICBkaXNwbGF5Tm9PbmxpbmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0RmVhdHVyZWRDaGFubmVscyA9ICh0eXBlKSA9PiB7XG4gICAgICAgIGRpc3BsYXlMb2FkaW5nKCk7XG4gICAgICAgIHBvcnQucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdGFyZ2V0OiBcImV4cGxvcmVcIixcbiAgICAgICAgICAgIHR5cGVcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBwcm92aWRlclNlYXJjaCA9ICh0eXBlLCBxdWVyeSkgPT4ge1xuICAgICAgICBkaXNwbGF5TG9hZGluZygpO1xuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHRhcmdldDogXCJzZWFyY2hcIixcbiAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICBxdWVyeVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGV4dGVybmFsQ29udGV4dE1lbnVDb21tYW5kID0gKGNvbW1hbmQpID0+IHtcbiAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IGNvbW1hbmQsXG4gICAgICAgICAgICB0eXBlOiBjdXJyZW50TWVudVRhcmdldC5jbGFzc05hbWUsXG4gICAgICAgICAgICBsb2dpbjogY3VycmVudE1lbnVUYXJnZXQuaWQuc3Vic3RyaW5nKEVYUExPUkVfSURfUFJFRklYLmxlbmd0aClcbiAgICAgICAgfSk7XG4gICAgICAgIGN1cnJlbnRNZW51VGFyZ2V0ID0gbnVsbDtcbiAgICB9LFxuICAgIGZvcndhcmRFdmVudCA9IChuYW1lLCBldmVudCkgPT4ge1xuICAgICAgICBpZihldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHRhcmdldDogbmFtZVxuICAgICAgICB9KTtcbiAgICAgICAgaWYobmFtZSA9PSBcImNvbmZpZ3VyZVwiKSB7XG4gICAgICAgICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYXBwbHlTZWFyY2hUb0V4cGxvcmUgPSAoZXhwbG9yZVNlbGVjdCwgZmllbGQpID0+IHtcbiAgICAgICAgaWYoZmllbGQuaGFzQXR0cmlidXRlKFwiaGlkZGVuXCIpIHx8IGZpZWxkLnZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgICAgICBnZXRGZWF0dXJlZENoYW5uZWxzKGV4cGxvcmVTZWxlY3QudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcHJvdmlkZXJTZWFyY2goZXhwbG9yZVNlbGVjdC52YWx1ZSwgZmllbGQudmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBoYXNPcHRpb24gPSAocHJvdmlkZXIpID0+IHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJEcm9wZG93biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhwbG9yZXByb3ZpZGVyXCIpO1xuICAgICAgICBmb3IoY29uc3QgbyBvZiBwcm92aWRlckRyb3Bkb3duLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmKG8udmFsdWUgPT0gcHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBhZGRFeHBsb3JlUHJvdmlkZXJzID0gKGV4cGxvcmVQcm92aWRlcnMpID0+IHtcbiAgICAgICAgaWYoZXhwbG9yZVByb3ZpZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzaG93KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhwbG9yZVRhYlwiKSk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlckRyb3Bkb3duID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBsb3JlcHJvdmlkZXJcIik7XG4gICAgICAgICAgICBleHBsb3JlUHJvdmlkZXJzLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICAgICAgICBpZighaGFzT3B0aW9uKHApKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyRHJvcGRvd24uYWRkKG5ldyBPcHRpb24ocHJvdmlkZXJzW3BdLm5hbWUsIHApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRpc3BsYXlMb2FkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRvZ2dsZVF1ZXVlQ29udGV4dEl0ZW1zID0gKHF1ZXVlUGF1c2VkKSA9PiB7XG4gICAgICAgIHRvZ2dsZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBhdXNlQXV0b3JlZnJlc2hcIiksICFxdWV1ZVBhdXNlZCk7XG4gICAgICAgIHRvZ2dsZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3VtZUF1dG9yZWZyZXNoXCIpLCBxdWV1ZVBhdXNlZCk7XG4gICAgfSxcbiAgICBzZXROb25MaXZlRGlzcGxheSA9IChkaXNwbGF5KSA9PiB7XG4gICAgICAgIGNvbnN0IG5vbkxpdmVUYWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5vbmxpdmVUYWJcIiksXG4gICAgICAgICAgICB0YWJiZWQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnRhYmJlZFwiKSxcbiAgICAgICAgICAgIGNoYW5uZWxzVG9Nb3ZlID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5vbmxpdmVcIikpO1xuXG4gICAgICAgIHRvZ2dsZShub25MaXZlVGFiLCBkaXNwbGF5ID09IDIpO1xuICAgICAgICB0b2dnbGUoc2Vjb25kYXJ5TGl2ZSwgZGlzcGxheSA9PSAxKTtcblxuICAgICAgICBpZihub25MaXZlRGlzcGxheSA9PSAyICYmIGRpc3BsYXkgIT0gMiAmJiB0YWJiZWQuX3RhYmJlZC5jdXJyZW50ID09IDQpIHtcbiAgICAgICAgICAgIHRhYmJlZC5fdGFiYmVkLnNlbGVjdCgxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vbkxpdmVEaXNwbGF5ID0gZGlzcGxheTtcblxuICAgICAgICAvLyBSZXBvc2l0aW9uIGFsbCBleGlzdGluZyBub24tbGl2ZSBjaGFubmVsc1xuICAgICAgICBsZXQgcGFyZW50ID0gbGl2ZTtcbiAgICAgICAgaWYoZGlzcGxheSA9PSAxKSB7XG4gICAgICAgICAgICBwYXJlbnQgPSBzZWNvbmRhcnlMaXZlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoZGlzcGxheSA9PSAyKSB7XG4gICAgICAgICAgICBwYXJlbnQgPSBkaXN0aW5jdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGRpc3BsYXkgPT0gMykge1xuICAgICAgICAgICAgcGFyZW50ID0gb2ZmbGluZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGNoYW5uZWxzVG9Nb3ZlLmxlbmd0aCAmJiBkaXNwbGF5IDw9IDEpIHtcbiAgICAgICAgICAgIGhpZGVOb09ubGluZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yKGNvbnN0IG5vZGUgb2YgY2hhbm5lbHNUb01vdmUpIHtcbiAgICAgICAgICAgIGluc2VydEJlZm9yZShwYXJlbnQsIG5vZGUsIG5vZGUucXVlcnlTZWxlY3RvcihcIi5uYW1lXCIpLnRleHRDb250ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGNvdW50TGl2ZUNoYW5uZWxzKCkgPT09IDAgJiYgZGlzcGxheSA+PSAyKSB7XG4gICAgICAgICAgICBkaXNwbGF5Tm9PbmxpbmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0VGhlbWUgPSAodGhlbWUpID0+IHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKFwiZGFya1wiLCB0aGVtZSA9PT0gMSk7XG4gICAgfTtcblxuLy8gU2V0IHVwIHBvcnQgY29tbW11bmljYXRpb24gbGlzdGVuZXJzXG5wb3J0Lm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigoZXZlbnQpID0+IHtcbiAgICBpZihldmVudC50YXJnZXQgPT0gXCJzZXRTdHlsZVwiKSB7XG4gICAgICAgIHNldFN0eWxlKGV2ZW50LmRhdGEpO1xuICAgIH1cbiAgICBlbHNlIGlmKGV2ZW50LnRhcmdldCA9PSBcInNldEV4dHJhc1wiKSB7XG4gICAgICAgIHNldEV4dHJhc1Zpc2liaWxpdHkoZXZlbnQuZGF0YSk7XG4gICAgfVxuICAgIGVsc2UgaWYoZXZlbnQudGFyZ2V0ID09IFwiYWRkQ2hhbm5lbHNcIikge1xuICAgICAgICBldmVudC5kYXRhLmZvckVhY2goYWRkQ2hhbm5lbCk7XG4gICAgfVxuICAgIGVsc2UgaWYoZXZlbnQudGFyZ2V0ID09IFwicmVtb3ZlQ2hhbm5lbFwiKSB7XG4gICAgICAgIHJlbW92ZUNoYW5uZWwoZXZlbnQuZGF0YSk7XG4gICAgfVxuICAgIGVsc2UgaWYoZXZlbnQudGFyZ2V0ID09IFwic2V0T25saW5lXCIpIHtcbiAgICAgICAgbWFrZUNoYW5uZWxMaXZlKGV2ZW50LmRhdGEpO1xuICAgIH1cbiAgICBlbHNlIGlmKGV2ZW50LnRhcmdldCA9PSBcInNldE9mZmxpbmVcIikge1xuICAgICAgICBtYWtlQ2hhbm5lbE9mZmxpbmUoZXZlbnQuZGF0YSk7XG4gICAgfVxuICAgIGVsc2UgaWYoZXZlbnQudGFyZ2V0ID09IFwic2V0RGlzdGluY3RcIikge1xuICAgICAgICBtYWtlQ2hhbm5lbERpc3RpbmN0KGV2ZW50LmRhdGEpO1xuICAgIH1cbiAgICBlbHNlIGlmKGV2ZW50LnRhcmdldCA9PSBcInNldE5vbkxpdmVEaXNwbGF5XCIpIHtcbiAgICAgICAgc2V0Tm9uTGl2ZURpc3BsYXkoZXZlbnQuZGF0YSk7XG4gICAgfVxuICAgIGVsc2UgaWYoZXZlbnQudGFyZ2V0ID09IFwicXVldWVQYXVzZWRcIikge1xuICAgICAgICB0b2dnbGVRdWV1ZUNvbnRleHRJdGVtcyhldmVudC5kYXRhKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWZyZXNoQnV0dG9uXCIpLmNsYXNzTGlzdC50b2dnbGUoXCJydW5uaW5nXCIsICFldmVudC5kYXRhKTtcbiAgICB9XG4gICAgLy8gUXVldWUgYXV0b3JlZnJlc2ggaXMgZW5hYmxlZC9kaXNhYmxlZCBpbiB0aGUgc2V0dGluZ3NcbiAgICBlbHNlIGlmKGV2ZW50LnRhcmdldCA9PSBcInF1ZXVlU3RhdHVzXCIpIHtcbiAgICAgICAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWZyZXNoQnV0dG9uXCIpO1xuICAgICAgICBpZihldmVudC5kYXRhKSB7XG4gICAgICAgICAgICBidXR0b24uc2V0QXR0cmlidXRlKFwiY29udGV4dG1lbnVcIiwgXCJxdWV1ZS1jb250ZXh0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYnV0dG9uLnJlbW92ZUF0dHJpYnV0ZShcImNvbnRleHRtZW51XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJydW5uaW5nXCIsIGV2ZW50LmRhdGEpO1xuICAgIH1cbiAgICBlbHNlIGlmKGV2ZW50LnRhcmdldCA9PSBcInNldFByb3ZpZGVyc1wiKSB7XG4gICAgICAgIHByb3ZpZGVycyA9IGV2ZW50LmRhdGE7XG4gICAgICAgIGFkZEV4cGxvcmVQcm92aWRlcnMoXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhwcm92aWRlcnMpXG4gICAgICAgICAgICAuZmlsdGVyKChwKSA9PiBwcm92aWRlcnNbcF0uc3VwcG9ydHMuZmVhdHVyZWQpXG4gICAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYoZXZlbnQudGFyZ2V0ID09IFwic2V0RmVhdHVyZWRcIikge1xuICAgICAgICBjb25zdCB7IGNoYW5uZWxzLCB0eXBlLCBxIH0gPSBldmVudC5kYXRhO1xuICAgICAgICBpZih0eXBlICE9PSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImV4cGxvcmVwcm92aWRlclwiKS52YWx1ZSB8fFxuICAgICAgICAgICAocSAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZWFyY2hGaWVsZFwiKS52YWx1ZSAhPSBxKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlKGV4cGxvcmUuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICBleHBsb3JlLmZpcnN0Q2hpbGQucmVtb3ZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihjaGFubmVscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHNob3coZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJub3Jlc3VsdHNcIikpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaGlkZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5vcmVzdWx0c1wiKSk7XG4gICAgICAgICAgICBleHBsb3JlLmFwcGVuZC5hcHBseShleHBsb3JlLCBjaGFubmVscy5tYXAoKGNoYW5uZWwpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVpbGRDaGFubmVsKGNoYW5uZWwsIHRydWUpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaGlkZUxvYWRpbmcoKTtcbiAgICB9XG4gICAgZWxzZSBpZihldmVudC50YXJnZXQgPT0gXCJ0aGVtZVwiKSB7XG4gICAgICAgIHNldFRoZW1lKGV2ZW50LmRhdGEpO1xuICAgIH1cbn0pO1xuXG4vLyBTZXQgdXAgRE9NIGxpc3RlbmVycyBhbmQgYWxsIHRoYXQuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xuICAgIGxpdmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxpdmVcIik7XG4gICAgb2ZmbGluZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib2ZmbGluZVwiKTtcbiAgICBkaXN0aW5jdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibm9ubGl2ZVwiKTtcbiAgICBleHBsb3JlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmZWF0dXJlZFwiKTtcbiAgICBzZWNvbmRhcnlMaXZlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZWNvbmRhcnlsaXZlXCIpO1xuICAgIGNvbnN0IGV4cGxvcmVTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImV4cGxvcmVwcm92aWRlclwiKSxcbiAgICAgICAgZmllbGQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3NlYXJjaEZpZWxkXCIpO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb25maWd1cmVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZvcndhcmRFdmVudC5iaW5kKG51bGwsIFwiY29uZmlndXJlXCIpKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlZnJlc2hCdXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgICAgIGZvcndhcmRFdmVudChcInJlZnJlc2hcIiwgZSk7XG4gICAgICAgIGlmKCFleHBsb3JlLnBhcmVudE5vZGUuaGFzQXR0cmlidXRlKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgICAgICBnZXRGZWF0dXJlZENoYW5uZWxzKGV4cGxvcmVTZWxlY3QudmFsdWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZXh0UmVmcmVzaFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY29udGV4dE1lbnVDb21tYW5kLmJpbmQobnVsbCwgXCJyZWZyZXNoXCIpLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZXh0T3BlblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY29udGV4dE1lbnVDb21tYW5kLmJpbmQobnVsbCwgXCJvcGVuQXJjaGl2ZVwiKSwgZmFsc2UpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29udGV4dENoYXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbnRleHRNZW51Q29tbWFuZC5iaW5kKG51bGwsIFwib3BlbkNoYXRcIiksIGZhbHNlKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRleHRDb3B5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjb250ZXh0TWVudUNvbW1hbmQuYmluZChudWxsLCBcImNvcHlcIiksIGZhbHNlKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRleHRBZGRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGV4dGVybmFsQ29udGV4dE1lbnVDb21tYW5kLmJpbmQobnVsbCwgXCJhZGRcIiksIGZhbHNlKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRleHRFeHBsb3JlQ29weVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXh0ZXJuYWxDb250ZXh0TWVudUNvbW1hbmQuYmluZChudWxsLCBcImNvcHlleHRlcm5hbFwiKSwgZmFsc2UpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGF1c2VBdXRvcmVmcmVzaFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gZm9yd2FyZEV2ZW50LmJpbmQobnVsbCwgXCJwYXVzZVwiLCBudWxsKSwgZmFsc2UpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzdW1lQXV0b3JlZnJlc2hcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGZvcndhcmRFdmVudC5iaW5kKG51bGwsIFwicmVzdW1lXCIsIG51bGwpLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi50YWJiZWRcIikuYWRkRXZlbnRMaXN0ZW5lcihcInRhYmNoYW5nZWRcIiwgKGUpID0+IHtcbiAgICAgICAgaWYoZS5kZXRhaWwgPT09IDMpIHtcbiAgICAgICAgICAgIGFwcGx5U2VhcmNoVG9FeHBsb3JlKGV4cGxvcmVTZWxlY3QsIGZpZWxkKTtcbiAgICAgICAgfVxuICAgIH0sIGZhbHNlKTtcbiAgICBleHBsb3JlU2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuICAgICAgICBhcHBseVNlYXJjaFRvRXhwbG9yZShleHBsb3JlU2VsZWN0LCBmaWVsZCk7XG4gICAgfSwgZmFsc2UpO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2VhcmNoQnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlmKGZpZWxkLmhhc0F0dHJpYnV0ZShcImhpZGRlblwiKSkge1xuICAgICAgICAgICAgc2hvdyhmaWVsZCk7XG4gICAgICAgICAgICBmaWVsZC5mb2N1cygpO1xuICAgICAgICAgICAgZS5jdXJyZW50VGFyZ2V0LnNldEF0dHJpYnV0ZShcImFyaWEtcHJlc3NlZFwiLCBcInRydWVcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBoaWRlKGZpZWxkKTtcbiAgICAgICAgICAgIGZpZWxkLnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIGZpbHRlcihmaWVsZC52YWx1ZSwgbGl2ZSwgZmlsdGVycyk7XG4gICAgICAgICAgICBmaWx0ZXIoZmllbGQudmFsdWUsIG9mZmxpbmUsIGZpbHRlcnMpO1xuICAgICAgICAgICAgZmlsdGVyKGZpZWxkLnZhbHVlLCBzZWNvbmRhcnlMaXZlLCBmaWx0ZXJzKTtcbiAgICAgICAgICAgIGUuY3VycmVudFRhcmdldC5zZXRBdHRyaWJ1dGUoXCJhcmlhLXByZXNzZWRcIiwgXCJmYWxzZVwiKTtcbiAgICAgICAgICAgIGZpZWxkLmJsdXIoKTtcblxuICAgICAgICAgICAgaWYoIWV4cGxvcmUucGFyZW50Tm9kZS5oYXNBdHRyaWJ1dGUoXCJoaWRkZW5cIikpIHtcbiAgICAgICAgICAgICAgICBhcHBseVNlYXJjaFRvRXhwbG9yZShleHBsb3JlU2VsZWN0LCBmaWVsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LCBmYWxzZSk7XG4gICAgZmllbGQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsICgpID0+IHtcbiAgICAgICAgZmlsdGVyKGZpZWxkLnZhbHVlLCBsaXZlLCBmaWx0ZXJzKTtcbiAgICAgICAgZmlsdGVyKGZpZWxkLnZhbHVlLCBvZmZsaW5lLCBmaWx0ZXJzKTtcbiAgICAgICAgZmlsdGVyKGZpZWxkLnZhbHVlLCBzZWNvbmRhcnlMaXZlLCBmaWx0ZXJzKTtcbiAgICAgICAgaWYoIWV4cGxvcmUucGFyZW50Tm9kZS5oYXNBdHRyaWJ1dGUoXCJoaWRkZW5cIikpIHtcbiAgICAgICAgICAgIGFwcGx5U2VhcmNoVG9FeHBsb3JlKGV4cGxvcmVTZWxlY3QsIGZpZWxkKTtcbiAgICAgICAgfVxuICAgIH0sIGZhbHNlKTtcblxuICAgIGZvcndhcmRFdmVudChcInJlYWR5XCIpO1xufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbGlzdC9pbmRleC5qcyJdLCJzb3VyY2VSb290IjoiIn0=