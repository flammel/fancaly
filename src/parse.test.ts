import { BigNumber } from "bignumber.js";
import { Environment, Value } from "./evaluate";
import { Token, Tokens } from "./lex";
import { List } from "./list";
import { getOperator } from "./operator";
import { parse, ParserResult, RPNItem } from "./parse";
import { getUnit, Unit, unitless, units } from "./unit";
import { getAggregator, makeReadVariable } from "./valueGenerator";

function dummyOperation(env: Environment): Value {
  return { type: "empty" };
}

function withoutOperations(result: ParserResult): ParserResult {
  for (const item of result.rpn.items()) {
    if (item.type === "valueGenerator") {
      item.generator.operation = dummyOperation;
    }
  }
  return result;
}

function runTest(type: string, tokens: Token[], output: ParserResult) {
  test(name, () => {
    const received = parse(new List(tokens));
    expect(withoutOperations(received)).toEqual(withoutOperations(output));
  });
}

runTest("", [], {
  type: "success",
  rpn: new List<RPNItem>([]),
});

runTest(
  "1 + 2",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "operator", operator: getOperator("+") },
    ]),
  },
);

runTest(
  "(1 + 2) * 3",
  [
    { type: "(", value: "(" },
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
    { type: ")", value: ")" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "operator", operator: getOperator("+") },
      { type: "number", value: new BigNumber("3") },
      { type: "operator", operator: getOperator("*") },
    ]),
  },
);

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
  {
    type: "error",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "number", value: new BigNumber("3") },
      { type: "operator", operator: getOperator("*") },
      { type: "operator", operator: getOperator("+") },
    ]),
    description: "Unbalanced parens in final loop.",
  },
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
  {
    type: "error",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "operator", operator: getOperator("+") },
    ]),
    description: 'Unbalanced parens in ")" loop.',
  },
);

runTest(
  "1 + 2 * 3",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "number", value: new BigNumber("3") },
      { type: "operator", operator: getOperator("*") },
      { type: "operator", operator: getOperator("+") },
    ]),
  },
);

runTest(
  "a: 5/7",
  [
    { type: "identifier", value: "a" },
    { type: "assignment", value: ":" },
    { type: "number", value: "5" },
    { type: "operator", value: "/" },
    { type: "number", value: "7" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("5") },
      { type: "number", value: new BigNumber("7") },
      { type: "operator", operator: getOperator("/") },
      { type: "assignment", variableName: "a" },
    ]),
  },
);

runTest(
  "d = y + x / 40",
  [
    { type: "identifier", value: "d" },
    { type: "assignment", value: "=" },
    { type: "identifier", value: "y" },
    { type: "operator", value: "+" },
    { type: "identifier", value: "x" },
    { type: "operator", value: "/" },
    { type: "number", value: "40" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "valueGenerator", generator: makeReadVariable("y") },
      { type: "valueGenerator", generator: makeReadVariable("x") },
      { type: "number", value: new BigNumber("40") },
      { type: "operator", operator: getOperator("/") },
      { type: "operator", operator: getOperator("+") },
      { type: "assignment", variableName: "d" },
    ]),
  },
);

runTest(
  "5/7+10*75",
  [
    { type: "number", value: "5" },
    { type: "operator", value: "/" },
    { type: "number", value: "7" },
    { type: "operator", value: "+" },
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "number", value: "75" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("5") },
      { type: "number", value: new BigNumber("7") },
      { type: "operator", operator: getOperator("/") },
      { type: "number", value: new BigNumber("10") },
      { type: "number", value: new BigNumber("75") },
      { type: "operator", operator: getOperator("*") },
      { type: "operator", operator: getOperator("+") },
    ]),
  },
);

runTest("sum", [{ type: "aggregator", value: "sum" }], {
  type: "success",
  rpn: new List<RPNItem>([{ type: "valueGenerator", generator: getAggregator("sum") }]),
});

runTest("average", [{ type: "aggregator", value: "average" }], {
  type: "success",
  rpn: new List<RPNItem>([{ type: "valueGenerator", generator: getAggregator("average") }]),
});

runTest(
  "0 = 1",
  [
    { type: "number", value: "0" },
    { type: "assignment", value: "=" },
    { type: "number", value: "1" },
  ],
  {
    type: "error",
    description: "Assignment operators are only allowed after identifiers.",
    rpn: new List<RPNItem>([{ type: "number", value: new BigNumber("0") }]),
  },
);

runTest("10 %", [{ type: "number", value: "10" }, { type: "percent", value: "%" }], {
  type: "success",
  rpn: new List<RPNItem>([{ type: "number", value: new BigNumber("10") }, { type: "percent" }]),
});

runTest("50.5 cm", [{ type: "number", value: "50.5" }, { type: "unit", value: "cm" }], {
  type: "success",
  rpn: new List<RPNItem>([
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: getUnit("cm") },
  ]),
});

runTest(
  "50.5 cm + 4 in",
  [
    { type: "number", value: "50.5" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "+" },
    { type: "number", value: "4" },
    { type: "unit", value: "in" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("50.5") },
      { type: "unit", unit: getUnit("cm") },
      { type: "number", value: new BigNumber("4") },
      { type: "unit", unit: getUnit("in") },
      { type: "operator", operator: getOperator("+") },
    ]),
  },
);

runTest(
  "a: 5 in  + 10 cm",
  [
    { type: "identifier", value: "a" },
    { type: "assignment", value: ":" },
    { type: "number", value: "5" },
    { type: "unit", value: "in" },
    { type: "operator", value: "+" },
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("5") },
      { type: "unit", unit: getUnit("in") },
      { type: "number", value: new BigNumber("10") },
      { type: "unit", unit: getUnit("cm") },
      { type: "operator", operator: getOperator("+") },
      { type: "assignment", variableName: "a" },
    ]),
  },
);

runTest(
  "120 - 10 %",
  [
    { type: "number", value: "120" },
    { type: "operator", value: "-" },
    { type: "number", value: "10" },
    { type: "percent", value: "%" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("120") },
      { type: "number", value: new BigNumber("10") },
      { type: "percent" },
      { type: "operator", operator: getOperator("-") },
    ]),
  },
);

runTest(
  "100 - (5 + 1) %",
  [
    { type: "number", value: "100" },
    { type: "operator", value: "-" },
    { type: "(", value: "(" },
    { type: "number", value: "5" },
    { type: "operator", value: "+" },
    { type: "number", value: "1" },
    { type: ")", value: ")" },
    { type: "percent", value: "%" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("100") },
      { type: "number", value: new BigNumber("5") },
      { type: "number", value: new BigNumber("1") },
      { type: "operator", operator: getOperator("+") },
      { type: "percent" },
      { type: "operator", operator: getOperator("-") },
    ]),
  },
);

// runTest(
//   "10 in to cm",
//   [
//     { type: "number", value: "10" },
//     { type: "unit", value: "in" },
//     { type: "conversion", value: "to" },
//     { type: "unit", value: "cm" },
//   ],
//   {
//     type: "success",
//     rpn: new List<RPNItem>([
//       { type: "number", value: new BigNumber("10") },
//       { type: "unit", unit: getUnit("in") },
//       { type: "number", value: new BigNumber("1") },
//       { type: "operator", operator: getOperator("+") },
//       { type: "percent" },
//       { type: "operator", operator: getOperator("-") },
//     ]),
//   },
// );

// runTest(
//   "10 cm as in",
//   [
//     { type: "number", value: "10" },
//     { type: "unit", value: "cm" },
//     { type: "conversion", value: "as" },
//     { type: "unit", value: "in" },
//   ],
//   {
//     type: "success",
//     rpn: new List<RPNItem>([
//       { type: "number", value: new BigNumber("100") },
//       { type: "number", value: new BigNumber("5") },
//       { type: "number", value: new BigNumber("1") },
//       { type: "operator", operator: getOperator("+") },
//       { type: "percent" },
//       { type: "operator", operator: getOperator("-") },
//     ]),
//   },
// );
