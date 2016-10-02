/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ({

/***/ 0:
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(43);

	var _filter = __webpack_require__(44);

	__webpack_require__(45);

	__webpack_require__(46);

	__webpack_require__(47);

	__webpack_require__(51);

	__webpack_require__(53);

	const port = browser.runtime.connect({ name: "list" }); /**
	                                                         * @author Martin Giger
	                                                         * @license MPL-2.0
	                                                         */


	let live, secondaryLive, offline, distinct, explore, currentMenuTarget, currentStyle, providers, nonLiveDisplay;
	const CHANNEL_ID_PREFIX = "channel",
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
	      toggle = (node, condition) => {
	    if (condition) {
	        (0, _utils.show)(node);
	    } else {
	        (0, _utils.hide)(node);
	    }
	},
	      getChannelIdFromId = id => parseInt(id.substring(CHANNEL_ID_PREFIX.length), 10),
	      contextMenuCommand = event => {
	    port.postMessage({
	        target: event,
	        channelId: getChannelIdFromId(currentMenuTarget.id)
	    });
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
	},
	      openUrl = (url, e) => {
	    if (e) {
	        e.preventDefault();
	    }
	    port.postMessage({
	        target: "openUrl",
	        url
	    });
	},
	      displayNoOnline = () => {
	    (0, _utils.show)(document.getElementById("noonline"));
	},
	      hideNoOnline = () => {
	    (0, _utils.hide)(document.getElementById("noonline"));
	},
	      hideNoChannels = () => {
	    (0, _utils.hide)(document.getElementById("nochannels"));
	},
	      displayNoChannels = () => {
	    displayNoOnline();
	    (0, _utils.show)(document.getElementById("nochannels"));
	},
	      displayLoading = () => {
	    (0, _utils.show)(document.getElementById("loadingexplore"));
	    explore.parentNode.classList.add("loading");
	},
	      hideLoading = () => {
	    (0, _utils.hide)(document.getElementById("loadingexplore"));
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
	    if (channel.live.isLive && (channel.live.state <= 0 || nonLiveDisplay === 0)) {
	        insertBefore(live, node, channel.uname);
	    } else if (channel.live.isLive && nonLiveDisplay == 1) {
	        insertBefore(secondaryLive, node, channel.uname);
	    } else if (channel.live.isLive && nonLiveDisplay == 2) {
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
	    //TODO some visual indicator for rebroadcasts
	    const channelNode = document.createElement("li");
	    channelNode.insertAdjacentHTML("beforeend", `<a href="" contextmenu="${ unspecific ? EXPLORE_CONTEXTMENU_ID : CONTEXTMENU_ID }">
	    <img src="">
	    <div>
	        <img srcset="" sizes="30w">
	        <span class="rebroadcast hide-offline" hidden><svg class="icon" viewBox="0 0 8 8">
	            <use xlink:href="sprite/open-iconic.min.svg#loop"></use>
	        </svg> </span><span class="name"></span><span class="nonlivename hide-offline" hidden> → <span class="alternate-name"></span></span><br>
	        <span class="title hide-offline"></span>
	        <aside>
	            <span class="viewersWrapper hide-offline">
	                <svg class="icon" viewBox="0 0 8 8">
	                    <use xlink:href="sprite/open-iconic.min.svg#eye"></use>
	                </svg>&nbsp;<span class="viewers">0</span>&#x20;
	            </span>
	            <span class="categoryWrapper hide-offline">
	                <svg class="icon" viewBox="0 0 8 8">
	                    <use xlink:href="sprite/open-iconic.min.svg#tag"></use>
	                </svg>&nbsp;<span class="category"></span>&#x20;
	            </span>
	            <span class="providerWrapper">
	                <svg class="icon" viewBox="0 0 8 8">
	                    <use xlink:href="sprite/open-iconic.min.svg#hard-drive"></use>
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
	    toggle(channelNode.querySelector(".nonlivename"), channel.live.alternateUsername !== "");
	    toggle(channelNode.querySelector(".rebroadcast"), channel.live.state == 2);
	    if (!("viewers" in channel) || channel.viewers < 0) {
	        (0, _utils.hide)(channelNode.querySelector(".viewersWrapper"));
	    }
	    channelNode.querySelector(".viewers").textContent = channel.viewers;
	    if (!channel.category) {
	        (0, _utils.hide)(channelNode.querySelector(".categoryWrapper"));
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
	        channelNode.querySelector("a").addEventListener("click", openUrl.bind(null, channel.live.isLive ? channel.url[0] : channel.archiveUrl));
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
	    if (!(0, _filter.matches)(channelNode, document.querySelector("#searchField").value, filters)) {
	        (0, _utils.hide)(channelNode);
	    }

	    insertChannel(channel, channelNode);
	    hideNoChannels();
	    if (channel.live.isLive) {
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
	    toggle(channelNode.querySelector(".nonlivename"), channel.live.alternateUsername !== "");
	    toggle(channelNode.querySelector(".rebroadcast"), channel.live.state == 2);

	    viewers.textContent = channel.viewers;
	    toggle(channelNode.querySelector(".viewersWrapper"), "viewers" in channel && channel.viewers > 0);

	    category.textContent = channel.category;
	    toggle(channelNode.querySelector(".categoryWrapper"), !!channel.category);

	    channelNode.classList.toggle("nonlive", channel.live.state > 0);

	    // only update images if the user is online to avoid broken images
	    if (navigator.onLine) {
	        if (channel.live.isLive) {
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
	    event.preventDefault();
	    port.postMessage({
	        target: name
	    });
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
	    for (let o of providerDropdown.options) {
	        if (o.value == provider) {
	            return true;
	        }
	    }
	    return false;
	},
	      addExploreProviders = exploreProviders => {
	    if (exploreProviders.length > 0) {
	        (0, _utils.show)(document.getElementById("exploreTab"));
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
	    toggle(document.getElementById("pauseAutorefresh"), !queuePaused);
	    toggle(document.getElementById("resumeAutorefresh"), queuePaused);
	},
	      setNonLiveDisplay = display => {
	    const nonLiveTab = document.getElementById("nonliveTab"),
	          tabbed = document.querySelector(".tabbed"),
	          channelsToMove = Array.from(document.querySelectorAll(".nonlive"));

	    toggle(nonLiveTab, display == 2);
	    toggle(secondaryLive, display == 1);

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

	    for (let node of channelsToMove) {
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
	                (0, _utils.show)(document.getElementById("noresults"));
	            } else {
	                (0, _utils.hide)(document.getElementById("noresults"));
	                channels.forEach(channel => {
	                    explore.appendChild(buildChannel(channel, true));
	                });
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
	    document.getElementById("pauseAutorefresh").addEventListener("click", () => port.postMessage({ target: "pause" }), false);
	    document.getElementById("resumeAutorefresh").addEventListener("click", () => port.postMessage({ target: "resume" }), false);
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
	            (0, _utils.show)(field);
	            field.focus();
	            e.currentTarget.setAttribute("aria-pressed", "true");
	        } else {
	            (0, _utils.hide)(field);
	            field.value = "";
	            (0, _filter.filter)(field.value, live, filters);
	            (0, _filter.filter)(field.value, offline, filters);
	            (0, _filter.filter)(field.value, secondaryLive, filters);
	            e.currentTarget.setAttribute("aria-pressed", "false");
	            field.blur();

	            if (!explore.parentNode.hasAttribute("hidden")) {
	                applySearchToExplore(exploreSelect, field);
	            }
	        }
	    }, false);
	    field.addEventListener("keyup", () => {
	        (0, _filter.filter)(field.value, live, filters);
	        (0, _filter.filter)(field.value, offline, filters);
	        (0, _filter.filter)(field.value, secondaryLive, filters);
	        if (!explore.parentNode.hasAttribute("hidden")) {
	            applySearchToExplore(exploreSelect, field);
	        }
	    }, false);

	    port.postMessage({
	        target: "ready"
	    });
	});

/***/ },

/***/ 43:
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.hide = hide;
	exports.show = show;
	/**
	 * Helper function script.
	 * @author Martin Giger
	 * @license MPL-2.0
	 */

	/**
	 * Hide an element. Unselects the element if it was previously selected.
	 *
	 * @param {DOMNode} el - Node to hide.
	 */
	function hide(el) {
	  el.setAttribute("hidden", true);
	  if (el.selected) {
	    el.selected = false;
	  }
	};

	/**
	 * Shows an element.
	 *
	 * @param {DOMNode} el - Node to show.
	 */
	function show(el) {
	  el.removeAttribute("hidden");
	};

/***/ },

/***/ 44:
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.matches = matches;
	exports.filter = filter;

	var _utils = __webpack_require__(43);

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
	/**
	 * Node filtering script
	 * @author Martin Giger
	 * @license MPL-2.0
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
	 */
	function filter(query, root, rules) {
	    const nodes = root.children;

	    for (let i = 0; i < nodes.length; ++i) {
	        if (query) {
	            if (matches(nodes[i], query, rules)) {
	                (0, _utils.show)(nodes[i]);
	            } else {
	                (0, _utils.hide)(nodes[i]);
	            }
	        } else {
	            (0, _utils.show)(nodes[i]);
	        }
	    }
	};

/***/ },

/***/ 45:
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _utils = __webpack_require__(43);

	const SELECTED_CLASS = "current"; /**
	                                   * @author Martin Giger
	                                   * @license MPL-2.0
	                                   */

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
	        (0, _utils.hide)(tabContents[i]);
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
	            (0, _utils.hide)(this.getContentByIndex(parseInt(prevTab.dataset.tab, 10)));
	        }

	        this.current = index;
	        tab.focus();
	        tab.setAttribute("aria-selected", "true");
	        tab.classList.add(SELECTED_CLASS);
	        tab.setAttribute("tabindex", 0);
	        (0, _utils.show)(this.getContentByIndex(index));
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

/***/ },

/***/ 46:
/***/ function(module, exports) {

	'use strict';

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
	    const attrList = ['title', 'accesskey', 'alt', 'label', 'placeholder'];
	    const ariaAttrMap = {
	        ariaLabel: 'aria-label',
	        ariaValueText: 'aria-valuetext',
	        ariaMozHint: 'aria-moz-hint'
	    };
	    const attrSeparator = '.';

	    // Translate allowed attributes.
	    for (let attribute of attrList) {
	        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attribute);
	        if (data) {
	            element.setAttribute(attribute, data);
	        }
	    }

	    // Translate aria attributes.
	    for (let attrAlias in ariaAttrMap) {
	        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attrAlias);
	        if (data) {
	            element.setAttribute(ariaAttrMap[attrAlias], data);
	        }
	    }
	}

	function translateElement(element = document) {

	    // Get all children that are marked as being translateable.
	    const children = element.querySelectorAll('*[data-l10n-id]');
	    for (let child of children) {
	        const data = browser.i18n.getMessage(child.dataset.l10nId);
	        if (data) {
	            child.textContent = data;
	        }
	        translateElementAttributes(child);
	    }
	}

	window.addEventListener("load", () => translateElement(), {
	    capturing: false,
	    passive: true
	});

/***/ },

/***/ 47:
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ },

/***/ 51:
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ },

/***/ 53:
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__.p + "assets/images/open-iconic.min.svg";

/***/ }

/******/ });