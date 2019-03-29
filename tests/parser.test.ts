import { BigNumber } from "bignumber.js";
import { Token } from "../lib/lexer";
import { List } from "../lib/list";
import { Operator } from "../lib/operator";
import { Parser, parserError, ParserResult } from "../lib/parser";
import { testConfig } from "./testConfig";

const config = testConfig();
const operators = config.getOperators();
const functions = config.getFunctions();
const units = config.getUnits();
const valueGenerators = config.getValueGenerators();
const parser = new Parser(operators, functions, units, valueGenerators, config.getFormatter());

function runTest(name: string, tokens: Token[], output: ParserResult) {
  test(name, () => {
    const received = parser.parse(new List(tokens));
    expect(received).toEqual(output);
  });
}

runTest(
  "(1 + 2 * 3",
  [
    { type: "(", value: "(" },
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
  ],
  parserError("Unbalanced parens in final loop.", [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
);

runTest(
  "1 + 2) * 3",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
    { type: ")", value: ")" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
  ],
  parserError('Unbalanced parens in ")" loop.', [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
);

runTest(
  "0 = 1",
  [
    { type: "number", value: "0" },
    { type: "assignment", value: "=" },
    { type: "number", value: "1" },
  ],
  parserError("Assignment operators are only allowed after identifiers.", [
    { type: "number", value: new BigNumber("0") },
  ]),
);

runTest(
  "unknown unit",
  [{ type: "number", value: "10" }, { type: "unit", value: "megameter" }],
  parserError('Unknown unit "megameter".', [{ type: "number", value: new BigNumber("10") }]),
);

runTest(
  "unknown aggregator",
  [{ type: "aggregator", value: "awerage" }],
  parserError('Unknown aggregator "awerage".', []),
);

runTest(
  "1 ! 2",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "!" },
    { type: "number", value: "2" },
  ],
  parserError('Unknown operator "!".', [{ type: "number", value: new BigNumber("1") }]),
);

runTest(
  "round ;",
  [{ type: "function", value: "round" }, { type: ";", value: ";" }],
  parserError('Unbalanced parens in ";" loop.', []),
);
