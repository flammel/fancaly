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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./serviceWorker.ts").then();
  });
}

const addToHomeScreenEl = document.getElementById("addToHomeScreen") as HTMLElement;
let deferredPrompt: Event | null;
window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can add to home screen
  addToHomeScreenEl.classList.add("visible");
});

addToHomeScreenEl.addEventListener("click", (e) => {
  // hide our user interface that shows our A2HS button
  addToHomeScreenEl.style.display = "none";
  // Show the prompt
  // @ts-ignore
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  // @ts-ignore
  deferredPrompt.userChoice.then((choiceResult) => {
    deferredPrompt = null;
  });
});
