import { Environment } from "./evaluate";
import { Token, Tokens } from "./lex";
import { List } from "./list";
import {
  getAggregator,
  getOperator,
  makeAssignment,
  makeReadVariable,
} from "./operator";
import { parse, ParserResult } from "./parse";
import { isUnit, Unit, unitless, units } from "./unit";
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
  for (const item of result.rpn) {
    if (item.type === "ValueGenerator") {
      item.operation = dummyOperation;
    }
  }
  return result;
}

function runTest(name: string, tokens: Tokens, output: ParserResult) {
  test(name, () => {
    const received = parse(tokens);
    expect(withoutOperations(received)).toEqual(withoutOperations(output));
  });
}

runTest("", new List<Token>([]), {
  type: "success",
  rpn: [],
});

runTest(
  "1 + 2",
  new List<Token>([
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
  ]),
  {
    type: "success",
    rpn: [
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      getOperator("+"),
    ],
  },
);

runTest(
  "(1 + 2) * 3",
  new List<Token>([
    { name: "(", value: "(" },
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: ")", value: ")" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ]),
  {
    type: "success",
    rpn: [
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      getOperator("+"),
      numericValue("3", unitless()),
      getOperator("*"),
    ],
  },
);

runTest(
  "(1 + 2 * 3",
  new List<Token>([
    { name: "(", value: "(" },
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ]),
  {
    type: "error",
    rpn: [
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      numericValue("3", unitless()),
      getOperator("*"),
      getOperator("+"),
    ],
    description: "Unbalanced parens in final loop.",
  },
);

runTest(
  "1 + 2) * 3",
  new List<Token>([
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: ")", value: ")" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ]),
  {
    type: "error",
    rpn: [
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      getOperator("+"),
    ],
    description: 'Unbalanced parens in ")" loop.',
  },
);

runTest(
  "1 + 2 * 3",
  new List<Token>([
    { name: "number", value: "1" },
    { name: "operator", value: "+" },
    { name: "number", value: "2" },
    { name: "operator", value: "*" },
    { name: "number", value: "3" },
  ]),
  {
    type: "success",
    rpn: [
      numericValue("1", unitless()),
      numericValue("2", unitless()),
      numericValue("3", unitless()),
      getOperator("*"),
      getOperator("+"),
    ],
  },
);

runTest(
  "a: 5/7",
  new List<Token>([
    { name: "identifier", value: "a" },
    { name: "assignment", value: ":" },
    { name: "number", value: "5" },
    { name: "operator", value: "/" },
    { name: "number", value: "7" },
  ]),
  {
    type: "success",
    rpn: [
      numericValue("5", unitless()),
      numericValue("7", unitless()),
      getOperator("/"),
      makeAssignment("a"),
    ],
  },
);

runTest(
  "d = y + x / 40",
  new List<Token>([
    { name: "identifier", value: "d" },
    { name: "assignment", value: "=" },
    { name: "identifier", value: "y" },
    { name: "operator", value: "+" },
    { name: "identifier", value: "x" },
    { name: "operator", value: "/" },
    { name: "number", value: "40" },
  ]),
  {
    type: "success",
    rpn: [
      makeReadVariable("y"),
      makeReadVariable("x"),
      numericValue("40", unitless()),
      getOperator("/"),
      getOperator("+"),
      makeAssignment("d"),
    ],
  },
);

runTest(
  "5/7+10*75",
  new List<Token>([
    { name: "number", value: "5" },
    { name: "operator", value: "/" },
    { name: "number", value: "7" },
    { name: "operator", value: "+" },
    { name: "number", value: "10" },
    { name: "operator", value: "*" },
    { name: "number", value: "75" },
  ]),
  {
    type: "success",
    rpn: [
      numericValue("5", unitless()),
      numericValue("7", unitless()),
      getOperator("/"),
      numericValue("10", unitless()),
      numericValue("75", unitless()),
      getOperator("*"),
      getOperator("+"),
    ],
  },
);

runTest("sum", new List<Token>([{ name: "aggregator", value: "sum" }]), {
  type: "success",
  rpn: [getAggregator("sum")],
});

runTest(
  "average",
  new List<Token>([{ name: "aggregator", value: "average" }]),
  {
    type: "success",
    rpn: [getAggregator("average")],
  },
);

runTest(
  "0 = 1",
  new List<Token>([
    { name: "number", value: "0" },
    { name: "assignment", value: "=" },
    { name: "number", value: "1" },
  ]),
  {type: "error", description: "Assignment operators are only allowed after identifiers.", rpn: [
        numericValue("0", unitless())
      ]
  },
);
