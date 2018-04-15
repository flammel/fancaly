import { BigNumber } from "bignumber.js";

import { emptyEnvironment, evaluate, Environment, stringifyValue } from "./evaluate";
import { lex } from "./lex";
import { parse } from "./parse";

import "./index.scss";

const inputEl = document.getElementById("input") as HTMLInputElement;
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

function getLines(inputEl: HTMLTextAreaElement) {
  return inputEl.value.split("\n").map((line) => line.trim());
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
      return ""
    }
    return stringifyValue(evaluated);
}

function handleChange() {
  resultsEl.innerHTML = "";
  const env = emptyEnvironment();
  getLines(inputEl).map(evaluateLine.bind(null, env)).forEach(addResult)
}

inputEl.addEventListener("keyup", handleChange);
inputEl.focus();
