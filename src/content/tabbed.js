/**
 * @author Martin Giger
 * @license MPL-2.0
 */

import {
    show, hide
} from './utils';

const SELECTED_CLASS = "current",
    TABINDEX = {
        FOCUSABLE: 0,
        DEFAULT: -1
    },
    FIRST_TAB = 1;

class Tabbed {
    static get FIRST_TAB() {
        return FIRST_TAB;
    }

    constructor(el, elType = 'a') {
        this.root = el;
        this.tabType = elType;

        const tabContents = this.root.querySelectorAll(".tabcontent"),
            tabs = this.root.querySelectorAll(`.tabstrip ${this.tabType}`),
            clickListener = (evt) => {
                evt.preventDefault();
                this.select(parseInt(evt.currentTarget.dataset.tab, 10));
            },
            keyListener = (evt) => {
                evt.preventDefault();
                if(evt.key == "ArrowLeft" && this.current != Tabbed.FIRST_TAB) { // left arrow key
                    this.select(--this.current);
                }
                else if(evt.key == "ArrowRight" && this.current < this.length) { // right arrow key
                    this.select(++this.current);
                }
            };

        this.length = tabs.length;

        for(const content of tabContents) {
            hide(content);
        }

        for(const tab of tabs) {
            tab.setAttribute("tabindex", TABINDEX.DEFAULT);
            tab.addEventListener("click", clickListener);
            tab.addEventListener("keypress", keyListener);
        }

        if(!this.root.querySelectorAll(`.tabstrip ${this.tabType}.${SELECTED_CLASS}`).length && this.length) {
            this.select(Tabbed.FIRST_TAB);
        }
        else {
            this.select(parseInt(this.root.querySelector(`.tabstrip ${this.tabType}.${SELECTED_CLASS}`).dataset.tab, 10));
        }
    }

    select(index) {
        if(index <= this.length && index >= Tabbed.FIRST_TAB) {
            const prevTab = this.root.querySelector(`.tabstrip ${this.tabType}.${SELECTED_CLASS}`),
                tab = this.getTabByIndex(index),
                evObj = new CustomEvent("tabchanged", { detail: index });
            if(prevTab) {
                prevTab.removeAttribute("aria-selected");
                prevTab.classList.remove(SELECTED_CLASS);
                prevTab.setAttribute("tabindex", TABINDEX.DEFAULT);
                hide(this.getContentByIndex(parseInt(prevTab.dataset.tab, 10)));
            }

            this.current = index;
            tab.focus();
            tab.setAttribute("aria-selected", "true");
            tab.classList.add(SELECTED_CLASS);
            tab.setAttribute("tabindex", TABINDEX.FOCUSABLE);
            show(this.getContentByIndex(index));
            this.root.dispatchEvent(evObj);
        }
    }

    getTabByIndex(index) {
        const tab = this.root.querySelector(`.tabstrip ${this.tabType}[data-tab="${index}"]`);
        if(tab) {
            return tab;
        }
        throw new Error(`No tab with index ${index}`);
    }

    getContentByIndex(index) {
        const content = this.root.querySelector(`.tabcontent[data-tab="${index}"]`);
        if(content) {
            return content;
        }
        throw new Error(`No tab content with index ${index}`);
    }
}

export default Tabbed;
