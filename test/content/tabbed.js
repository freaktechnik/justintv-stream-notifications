import test from 'ava';
import Tabbed from '../../src/content/tabbed.js';

const getTab = (index, id) => {
    const tab = document.createElement("li");
    tab.setAttribute("role", "representation");
    const link = document.createElement("a");
    link.setAttribute("role", "tab");
    link.setAttribute("data-tab", index);
    link.dataset.tab = index;
    link.href = `#${id}`;
    link.setAttribute("aria-controls", id);
    tab.appendChild(link);
    return tab;
};

const getPanel = (index, id) => {
    const panel = document.createElement("section");
    panel.id = id;
    panel.setAttribute("data-tab", index);
    panel.dataset.tab = index;
    panel.classList.add("tabcontent");
    panel.setAttribute("role", "tabpanel");
    return panel;
};

const TAB_IDS = [
    "channels",
    "users",
    "explore",
    "nonlive",
    "search",
    "options"
];

const getTabbed = (count) => {
    if(count > TAB_IDS.length) {
        console.warn("Not all tabs will have IDs");
    }
    const tabbed = document.createElement("div");
    tabbed.classList.add("tabbed");
    const tabbar = document.createElement("ul");
    tabbar.classList.add("tabstrip");
    tabbar.setAttribute("role", "tablist");
    tabbed.appendChild(tabbar);

    for(let i = 1; i <= count; ++i) {
        tabbar.appendChild(getTab(i, TAB_IDS[i - 1]));
        tabbed.appendChild(getPanel(i, TAB_IDS[i - 1]));
    }
    return tabbed;
};

test("constructor", (t) => {
    const tabbed = getTabbed(3);
    const instance = new Tabbed(tabbed);

    t.is(instance.root, tabbed);
    t.is(instance.length, 3);
    t.is(instance.current, 1);
    const tab = tabbed.querySelector('a[data-tab="1"]');
    t.true(tab.classList.contains("current"));
    t.is(tab.getAttribute("aria-selected"), "true");

    const tabcontent = tabbed.querySelector('section[data-tab="1"]');
    t.false(tabcontent.hidden);

    const hiddenTc = tabbed.querySelector('section[data-tab="2"]');
    t.true(hiddenTc.hidden);
});

test("constructor with preselected tab", (t) => {
    const tabbed = getTabbed(3);

    tabbed.querySelector('a[data-tab="2"]').classList.add("current");

    const instance = new Tabbed(tabbed);

    t.is(instance.current, 2);
    const tab = tabbed.querySelector('a[data-tab="2"]');
    t.true(tab.classList.contains("current"));
    t.is(tab.getAttribute("aria-selected"), "true");

    const tabcontent = tabbed.querySelector('section[data-tab="2"]');
    t.false(tabcontent.hidden);
});

test("select", (t) => {
    const tabbed = getTabbed(3);
    const instance = new Tabbed(tabbed);

    instance.select(2);

    t.is(instance.current, 2);

    const tab = tabbed.querySelector('a[data-tab="2"]');
    t.true(tab.classList.contains("current"));
    t.is(tab.getAttribute("aria-selected"), "true");
    t.is(tab.tabIndex, 0);

    const tabcontent = tabbed.querySelector('section[data-tab="2"]');
    t.false(tabcontent.hidden);

    const oldTab = tabbed.querySelector('a[data-tab="1"]');
    t.false(oldTab.classList.contains("current"));
    t.false(oldTab.hasAttribute("aria-selected"));
    t.is(oldTab.tabIndex, -1);

    const oldContent = tabbed.querySelector('section[data-tab="1"]');
    t.true(oldContent.hidden);
});

test("tabchange event", async (t) => {
    const tabbed = getTabbed(3);
    const instance = new Tabbed(tabbed);

    const p = new Promise((resolve) => {
        tabbed.addEventListener("tabchanged", resolve, {
            once: true,
            passive: true,
            capture: false
        });
    });

    instance.select(2);
    const { detail: index } = await p;

    t.is(index, 2);
});

{
    const testTabIndex = (t, instance, index) => {
        const tab = instance.getTabByIndex(index);

        t.is(parseInt(tab.getAttribute("data-tab"), 10), index);
    };
    testTabIndex.title = (title, index) => `${title} for index ${index}`;
    const tabbed = getTabbed(4);
    const instance = new Tabbed(tabbed);

    for(let i = 1; i <= 4; ++i) {
        test("getTabByIndex", testTabIndex, instance, i);
    }
}

test("getTabByIndex throws with invalid index", (t) => {
    const tabbed = getTabbed(2);
    const instance = new Tabbed(tabbed);

    t.throws(() => instance.getTabByIndex(3));
});

{
    const testContentIndex = (t, instance, index) => {
        const content = instance.getContentByIndex(index);

        t.is(parseInt(content.getAttribute("data-tab"), 10), index);
    };
    testContentIndex.title = (title, index) => `${title} for index ${index}`;
    const tabbed = getTabbed(4);
    const instance = new Tabbed(tabbed);

    for(let i = 1; i <= 4; ++i) {
        test("getContentByIndex", testContentIndex, instance, i);
    }
}

test("getContentByIndex throws with invalid index", (t) => {
    const tabbed = getTabbed(2);
    const instance = new Tabbed(tabbed);

    t.throws(() => instance.getContentByIndex(3));
});


test.todo("keyboard events");
test.todo("click events");
