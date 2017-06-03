/**
 * @author Martin Giger
 * @license MPL-2.0
 */

import { show, hide } from './utils';

const SELECTED_CLASS = "current";

class Tabbed {
    constructor(el) {
        this.root = el;

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

        this.length = tabs.length;

        for(const content of tabContents) {
            hide(content);
        }

        for(const tab of tabs) {
            tab.setAttribute("tabindex", -1);
            tab.addEventListener("click", clickListener);
            tab.addEventListener("keypress", keyListener);
        }

        if(this.root.querySelectorAll(`.tabstrip a.${SELECTED_CLASS}`).length === 0 && this.length > 0) {
            this.select(1);
        }
        else {
            this.select(parseInt(this.root.querySelector(`.tabstrip a.${SELECTED_CLASS}`).dataset.tab, 10));
        }
    }

    select(index) {
        if(index <= this.length && index > 0) {
            const prevTab = this.root.querySelector(`.tabstrip a.${SELECTED_CLASS}`),
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
    }

    getTabByIndex(index) {
        const tab = this.root.querySelector(`.tabstrip a[data-tab="${index}"]`);
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
