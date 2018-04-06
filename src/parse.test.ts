import { Environment } from "./evaluate";
import { Token, Tokens } from "./lex";
import { List } from "./list";
import {
  getAggregator,
  getOperator,
  makeAssignment,
  makePercent,
  makeReadVariable,
} from "./operator";
import { parse, ParserResult, RPNItem } from "./parse";
import { isUnit, makeUnit, Unit, unitless, units } from "./unit";
import {
  errorValue,
  isNumericValue,
  noValue,
  NumericValue,
  numericValue,
  Value,
} from "./value";

function dummyOperation(env: Environment): Value {
  return noValue();
}

function withoutOperations(result: ParserResult): ParserResult {
  for (const item of result.rpn.items()) {
    if (item.type === "ValueGenerator") {
      item.operation = dummyOperation;
    }
  }
  return result;
}

function runTest(name: string, tokens: Token[], output: ParserResult) {
  test(name, () => {
    const received = parse(new List(tokens));
    expect(withoutOperations(received)).toEqual(withoutOperations(output));
  });
}

runTest("", [], {
  type: "success",
  rpn: new List([]),
});

runTest(
  "1 + 2",
  [
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      getOperator("+"),
    ]),
  },
);

runTest(
  "(1 + 2) * 3",
  [
    { name: "(", value: "(" },
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: ")", value: ")" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      getOperator("+"),
      numericValue("3", unitless()),
      getOperator("*"),
    ]),
  },
);

runTest(
  "(1 + 2 * 3",
  [
    { name: "(", value: "(" },
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ],
  {
    type: "error",
    rpn: new List([
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      numericValue("3", unitless()),
      getOperator("*"),
      getOperator("+"),
    ]),
    description: "Unbalanced parens in final loop.",
  },
);

runTest(
  "1 + 2) * 3",
  [
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: ")", value: ")" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ],
  {
    type: "error",
    rpn: new List([
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      getOperator("+"),
    ]),
    description: 'Unbalanced parens in ")" loop.',
  },
);

runTest(
  "1 + 2 * 3",
  [
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      numericValue("3", unitless()),
      getOperator("*"),
      getOperator("+"),
    ]),
  },
);

runTest(
  "a: 5/7",
  [
    { name: "identifier", value: "a" },
    { name: "assignment", value: ":" },
    { name: "number", value: "5" },
    { name: "operator", value: "/" },
    { name: "number", value: "7" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("5", unitless()),
      numericValue("7", unitless()),
      getOperator("/"),
      makeAssignment("a"),
    ]),
  },
);

runTest(
  "d = y + x / 40",
  [
    { name: "identifier", value: "d" },
    { name: "assignment", value: "=" },
    { name: "identifier", value: "y" },
    { name: "operator", value: "+" },
    { name: "identifier", value: "x" },
    { name: "operator", value: "/" },
    { name: "number", value: "40" },
  ],
  {
    type: "success",
    rpn: new List([
      makeReadVariable("y"),
      makeReadVariable("x"),
      numericValue("40", unitless()),
      getOperator("/"),
      getOperator("+"),
      makeAssignment("d"),
    ]),
  },
);

runTest(
  "5/7+10*75",
  [
    { name: "number", value: "5" },
    { name: "operator", value: "/" },
    { name: "number", value: "7" },
    { name: "operator", value: "+" },
    { name: "number", value: "10" },
    { name: "operator", value: "*" },
    { name: "number", value: "75" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("5", unitless()),
      numericValue("7", unitless()),
      getOperator("/"),
      numericValue("10", unitless()),
      numericValue("75", unitless()),
      getOperator("*"),
      getOperator("+"),
    ]),
  },
);

runTest("sum", [{ name: "aggregator", value: "sum" }], {
  type: "success",
  rpn: new List([getAggregator("sum")]),
});

runTest("average", [{ name: "aggregator", value: "average" }], {
  type: "success",
  rpn: new List([getAggregator("average")]),
});

runTest(
  "0 = 1",
  [
    { name: "number", value: "0" },
    { name: "assignment", value: "=" },
    { name: "number", value: "1" },
  ],
  {
    type: "error",
    description: "Assignment operators are only allowed after identifiers.",
    rpn: new List([numericValue("0", unitless())]),
  },
);

runTest(
  "10 %",
  [{ name: "number", value: "10" }, { name: "percent", value: "%" }],
  {
    type: "success",
    rpn: new List([numericValue("10", unitless()), makePercent()]),
  },
);

runTest(
  "50.5 cm",
  [{ name: "number", value: "50.5" }, { name: "unit", value: "cm" }],
  {
    type: "success",
    rpn: new List([numericValue("50.5", unitless()), makeUnit("cm")]),
  },
);

runTest(
  "50.5 cm + 4 in",
  [
    { name: "number", value: "50.5" },
    { name: "unit", value: "cm" },
    { name: "operator", value: "+" },
    { name: "number", value: "4" },
    { name: "unit", value: "in" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("50.5", unitless()),
      makeUnit("cm"),
      numericValue("4", unitless()),
      makeUnit("in"),
      getOperator("+"),
    ]),
  },
);

runTest(
  "a: 5 in  + 10 cm",
  [
    { name: "identifier", value: "a" },
    { name: "assignment", value: ":" },
    { name: "number", value: "5" },
    { name: "unit", value: "in" },
    { name: "operator", value: "+" },
    { name: "number", value: "10" },
    { name: "unit", value: "cm" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("5", unitless()),
      makeUnit("in"),
      numericValue("10", unitless()),
      makeUnit("cm"),
      getOperator("+"),
      makeAssignment("a"),
    ]),
  },
);

runTest(
  "120 - 10 %",
  [
    { name: "number", value: "120" },
    { name: "operator", value: "-" },
    { name: "number", value: "10" },
    { name: "percent", value: "%" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("120", unitless()),
      numericValue("10", unitless()),
      makePercent(),
      getOperator("-"),
    ]),
  },
);

runTest(
  "100 - (5 + 1) %",
  [
    { name: "number", value: "100" },
    { name: "operator", value: "-" },
    { name: "(", value: "(" },
    { name: "number", value: "5" },
    { name: "operator", value: "+" },
    { name: "number", value: "1" },
    { name: ")", value: ")" },
    { name: "percent", value: "%" },
  ],
  {
    type: "success",
    rpn: new List([
      numericValue("100", unitless()),
      numericValue("5", unitless()),
      numericValue("1", unitless()),
      getOperator("+"),
      makePercent(),
      getOperator("-"),
    ]),
  },
);
