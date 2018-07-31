import { BigNumber } from "bignumber.js";

import { emptyEnvironment, Environment, evaluate, stringifyValue } from "./evaluate";
import { lex } from "./lex";
import { parse } from "./parse";
import { Storage } from "./storage";

import "./index.scss";

const inputEl = document.getElementById("input") as HTMLTextAreaElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;

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

function evaluateLine(env: Environment, line: string) {
  const lexed = lex(line);
  if (lexed.type === "error") {
    return "";
  }
  const parsed = parse(lexed.tokens);
  if (parsed.type === "error") {
    return "";
  }
  const evaluated = evaluate(parsed.rpn, env);
  if (evaluated.type === "error") {
    return "";
  }
  return stringifyValue(evaluated);
}

function handleChange() {
  resultsEl.innerHTML = "";
  const env = emptyEnvironment();
  getLines(inputEl)
    .map((line) => evaluateLine(env, line))
    .forEach(addResult);
}

inputEl.addEventListener("keyup", handleChange);
inputEl.focus();

const storage = new Storage();

const saveButtonEl = document.getElementById("saveButton") as HTMLButtonElement;
saveButtonEl.addEventListener("click", () => {
  storage.save(inputEl.value);
  loadSavedList();
});

const clearButtonEl = document.getElementById("clearButton") as HTMLButtonElement;
clearButtonEl.addEventListener("click", () => {
  inputEl.value = "";
  inputEl.focus();
  handleChange();
});

const savedListEl = document.getElementById("savedList") as HTMLUListElement;
function loadSavedList() {
  const loaded = storage.load();
  savedListEl.innerHTML = "";
  Object.keys(loaded).forEach((key) => {
    const item = document.createElement("li");
    const loadLink = document.createElement("a");
    loadLink.innerHTML = key;
    loadLink.addEventListener("click", () => {
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
