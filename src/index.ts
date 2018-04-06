import { BigNumber } from "bignumber.js";

import { emptyEnvironment, evaluate } from "./evaluate";
import { lex } from "./lex";
import { parse } from "./parse";
import { stringifyValue, Value } from "./value";

import "./main.scss";

BigNumber.config({
  FORMAT: {
    decimalSeparator: ".",
    fractionGroupSeparator: "",
    fractionGroupSize: 0,
    groupSeparator: "",
    groupSize: 0,
    secondaryGroupSize: 0,
  },
});

const inputEl = document.getElementById("input") as HTMLInputElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;

function makeHtml(str: string): HTMLElement {
  const resultDiv = document.createElement("div");
  resultDiv.classList.add("result");
  resultDiv.innerHTML = str;
  return resultDiv;
}

function addResult(str: string) {
  const child = makeHtml(str);
  resultsEl.appendChild(child);
}

function update(input: NodeList) {
  resultsEl.innerHTML = "";
  const env = emptyEnvironment();
  for (const line of input) {
    const text = line.textContent;
    if (!text) {
      continue;
    }
    const lexed = lex(text.trim());
    if (lexed.type === "error") {
      addResult("");
      continue;
    }
    const parsed = parse(lexed.tokens);
    if (parsed.type === "error") {
      addResult("");
      continue;
    }
    const evaluated = evaluate(parsed.rpn, env);
    if (evaluated.type === "ErrorValue") {
      addResult("error");
      continue;
    }
    addResult(stringifyValue(evaluated));
  }
}

inputEl.addEventListener("keyup", () => update(inputEl.childNodes));
inputEl.focus();
