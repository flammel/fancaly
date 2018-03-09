import { interpret } from "./parser";
import { Value, stringifyValue } from "./value";
import { BigNumber } from "bignumber.js";

import "./main.scss";

BigNumber.config({
  FORMAT: {
    decimalSeparator: ".",
    groupSeparator: "",
    groupSize: 0,
    secondaryGroupSize: 0,
    fractionGroupSeparator: "",
    fractionGroupSize: 0,
  },
});

const inputEl = document.getElementById("input") as HTMLInputElement;
const resultsEl = document.getElementById("results") as HTMLDivElement;

function makeHtml(value: Value): HTMLElement {
  const resultDiv = document.createElement("div");
  resultDiv.classList.add("result");
  resultDiv.innerHTML = stringifyValue(value);
  return resultDiv;
}

function parse(input: NodeList) {
  resultsEl.innerHTML = "";
  const outputs = interpret([...input].map(node => node.textContent.trim()));
  for (let idx = 0; idx < input.length; idx++) {
    const child = makeHtml(outputs[idx]);
    child.style.height = input[idx].clientHeight + "px";
    resultsEl.appendChild(child);
  }
}

inputEl.addEventListener("keyup", () => parse(inputEl.childNodes));
inputEl.focus();
