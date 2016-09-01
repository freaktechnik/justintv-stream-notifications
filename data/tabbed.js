/**
 * @author Martin Giger
 * @license MPL-2.0
 */

/* global show */
/* global hide */

const SELECTED_CLASS = "current";

function Tabbed(el) {
    this.root = el;
    this.length = this.root.querySelectorAll(".tabstrip a").length;

    const tabContents = this.root.querySelectorAll(".tabcontent"),
        tabs = this.root.querySelectorAll(".tabstrip a"),
        clickListener = (evt) => {
            evt.preventDefault();
            this.select(parseInt(evt.currentTarget.dataset.tab, 10));
        },
        keyListener = (evt) => {
            evt.preventDefault();
            if(evt.key == "ArrowLeft" && this.current != 1) { // left arrow key
                this.select(this.current - 1);
            }
            else if(evt.key == "ArrowRight" && this.current < this.length) { // right arrow key
                this.select(this.current + 1);
            }
        };

    for(let i = 0; i < tabContents.length; ++i) {
        hide(tabContents[i]);
    }

    for(let j = 0; j < tabs.length; ++j) {
        tabs[j].setAttribute("tabindex", -1);
        tabs[j].addEventListener("click", clickListener);
        tabs[j].addEventListener("keypress", keyListener);
    }

    if(this.root.querySelectorAll(".tabstrip a." + SELECTED_CLASS).length === 0 && this.length > 0) {
        this.select(1);
    }
    else {
        this.select(parseInt(this.root.querySelector(".tabstrip a." + SELECTED_CLASS).dataset.tab, 10));
    }
}

Tabbed.prototype.root = null;
Tabbed.prototype.length = 0;
Tabbed.prototype.current = 0;

Tabbed.prototype.select = function(index) {
    if(index <= this.length && index > 0) {
        const prevTab = this.root.querySelector(".tabstrip a." + SELECTED_CLASS),
            tab = this.getTabByIndex(index),
            evObj = new CustomEvent("tabchanged", { detail: index });
        if(prevTab) {
            prevTab.removeAttribute("aria-selected");
            prevTab.classList.remove(SELECTED_CLASS);
            prevTab.setAttribute("tabindex", -1);
            hide(this.getContentByIndex(parseInt(prevTab.dataset.tab, 10)));
        }

        this.current = index;
        tab.focus();
        tab.setAttribute("aria-selected", "true");
        tab.classList.add(SELECTED_CLASS);
        tab.setAttribute("tabindex", 0);
        show(this.getContentByIndex(index));
        this.root.dispatchEvent(evObj);
    }
};

Tabbed.prototype.getTabByIndex = function(index) {
    const tabs = this.root.querySelectorAll(".tabstrip a");
    for(let i = 0; i < tabs.length; ++i) {
        if(parseInt(tabs[i].dataset.tab, 10) == index) {
            return tabs[i];
        }
    }
    return undefined;
};

Tabbed.prototype.getContentByIndex = function(index) {
    const contents = this.root.querySelectorAll(".tabcontent");
    for(let i = 0; i < contents.length; ++i) {
        if(parseInt(contents[i].dataset.tab, 10) == index) {
            return contents[i];
        }
    }
    return undefined;
};


window.addEventListener("load", () => {
    const roots = document.querySelectorAll(".tabbed");
    for(let i = 0; i < roots.length; ++i) {
        roots[i]._tabbed = new Tabbed(roots[i]);
    }
});

