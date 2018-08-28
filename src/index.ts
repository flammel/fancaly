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

function loadSavedList() {
  const loaded = storage.load();
  savedListEl.innerHTML = "";
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
      handleChange();
    });
    const removeLink = document.createElement("a");
    removeLink.innerHTML = "del";
    removeLink.addEventListener("click", () => {
      storage.remove(key);
      loadSavedList();
    });
    item.appendChild(loadLink);
    item.appendChild(document.createTextNode(" ("));
    item.appendChild(removeLink);
    item.appendChild(document.createTextNode(")"));
    savedListEl.appendChild(item);
  });
}
loadSavedList();
