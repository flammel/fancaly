import { defaultConfig } from "./defaultConfig";
import { Environment } from "./environment";
import { helpText } from "./help";
import { Interpreter } from "./interpreter";
import { Storage } from "./storage";

import "./index.scss";

const inputEl = document.getElementById("input") as HTMLTextAreaElement;
const decSepEl = document.getElementById("decSep") as HTMLSelectElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;
const saveButtonEl = document.getElementById("saveButton") as HTMLButtonElement;
const clearButtonEl = document.getElementById("clearButton") as HTMLButtonElement;
const openButtonEl = document.getElementById("openButton") as HTMLButtonElement;
const savedListEl = document.getElementById("savedList") as HTMLUListElement;
const calculatorEl = document.getElementById("calculator") as HTMLDivElement;
const containerEl = document.getElementById("container") as HTMLDivElement;

let interpreter = new Interpreter(defaultConfig(decSepEl.value));

decSepEl.addEventListener("change", () => {
  interpreter = new Interpreter(defaultConfig(decSepEl.value));
  handleChange();
});

inputEl.addEventListener("keyup", handleChange);
inputEl.focus();

const storage = new Storage();
let isSaved = true;

function loadHelp() {
  inputEl.value = helpText();
  handleChange();
}

if (window.location.hash === "#help") {
  loadHelp();
}

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#help") {
    loadHelp();
  }
});

function makeHtml(str: string): HTMLElement {
  const resultDiv = document.createElement("div");
  resultDiv.classList.add("result");
  resultDiv.innerHTML = str ? str : "&nbsp;";
  return resultDiv;
}

function addResult(str: string) {
  const child = makeHtml(str);
  resultsEl.appendChild(child);
}

function getLines(textarea: HTMLTextAreaElement) {
  return textarea.value.split("\n").map((line) => line.trim());
}

function handleChange() {
  savedListEl.classList.remove("visible");
  resultsEl.innerHTML = "";
  const env = new Environment();
  getLines(inputEl)
    .map((line) => interpreter.evaluateLine(env, line))
    .forEach(addResult);
  isSaved = false;
}

saveButtonEl.addEventListener("click", () => {
  storage.save(inputEl.value);
  loadSavedList();
  isSaved = true;
});

clearButtonEl.addEventListener("click", () => {
  if (!isSaved) {
    const answer = confirm(
      "You have unsaved changes that will be lost if you clear the calculation.",
    );
    if (!answer) {
      return;
    }
  }
  inputEl.value = "";
  inputEl.focus();
  handleChange();
  isSaved = true;
});

openButtonEl.addEventListener("click", () => {
  savedListEl.classList.toggle("visible");
});

function loadSavedList() {
  const loaded = storage.load();
  savedListEl.innerHTML = "";

  if (Object.keys(loaded).length === 0) {
    const item = document.createElement("li");
    item.innerHTML = "You have no saved calculations.";
    item.classList.add("text");
    savedListEl.appendChild(item);
  }

  Object.keys(loaded).forEach((key) => {
    const item = document.createElement("li");
    const loadLink = document.createElement("a");
    loadLink.innerHTML = key;
    loadLink.addEventListener("click", () => {
      if (!isSaved) {
        const answer = confirm(
          "You have unsaved changes that will be lost if you load a new calculation.",
        );
        if (!answer) {
          return;
        }
      }
      inputEl.value = storage.loadSingle(key);
      window.scrollTo(0, 0);
      handleChange();
    });
    const removeButton = document.createElement("button");
    removeButton.innerHTML = "Delete";
    removeButton.addEventListener("click", () => {
      storage.remove(key);
      loadSavedList();
    });
    item.appendChild(loadLink);
    item.appendChild(removeButton);
    savedListEl.appendChild(item);
  });
}
loadSavedList();

//
// Banners
//

interface BannerAction {
  label: string;
  action?: () => any;
}

function showBanner(text: string, actions: BannerAction[]) {
  const bannerEl = document.createElement("div");
  bannerEl.classList.add("banner");

  const bannerTextEl = document.createElement("div");
  bannerTextEl.classList.add("banner__text");
  bannerTextEl.innerHTML = text;
  bannerEl.appendChild(bannerTextEl);

  const bannerActionsEl = document.createElement("div");
  bannerActionsEl.classList.add("banner__actions");

  for (const action of actions) {
    const bannerActionEl = document.createElement("button");
    bannerActionEl.classList.add("banner__action");
    bannerActionEl.innerHTML = action.label;
    bannerActionEl.addEventListener("click", () => {
      const actionHandler = action.action;
      if (actionHandler) {
        actionHandler();
      }
      bannerEl.classList.remove("banner--visible");
    });
    bannerActionsEl.appendChild(bannerActionEl);
  }

  bannerEl.appendChild(bannerActionsEl);

  const inserted = containerEl.insertBefore(bannerEl, calculatorEl);
  // Trigger a reflow, see https://stackoverflow.com/a/24195559.
  // Without this, adding the --visible class will not trigger the CSS animation.
  // tslint:disable-next-line
  inserted.offsetWidth;
  // Show the banner with animation
  bannerEl.classList.add("banner--visible");
}

//
// Add to home screen banner
//

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./serviceWorker.ts").then();
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  const deferredPrompt: any = e;
  // Update UI notify the user they can add to home screen
  const localStorageKey = "addToHomeScreenDismissed";
  const localStorageValue = "1";
  if (localStorage.getItem(localStorageKey) !== localStorageValue) {
    showBanner("Do you want to add Fancaly to your home screen?", [
      {
        label: "Yes please!",
        action: () => {
          localStorage.setItem(localStorageKey, localStorageValue);
          deferredPrompt.prompt();
        },
      },
      {
        label: "No thanks",
        action: () => {
          localStorage.setItem(localStorageKey, localStorageValue);
        },
      },
    ]);
  }
});
