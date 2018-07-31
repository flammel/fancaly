import { BigNumber } from "bignumber.js";
import { getUnit, Unit, unitless } from "./conversion";
import {
  emptyEnvironment,
  Environment,
  errorValue,
  evaluate,
  isNumericValue,
  NumericValue,
  numericValue,
  Value,
} from "./evaluate";
import { Token, Tokens } from "./lex";
import { List } from "./list";
import { getOperator } from "./operator";
import { parse, RPNItem } from "./parse";
import { getAggregator, makeReadVariable } from "./valueGenerator";

function runTest(
  name: string,
  rpn: RPNItem[],
  output: Value,
  env: Environment = emptyEnvironment(),
) {
  test(name, () => {
    expect(evaluate(new List(rpn), env)).toEqual(output);
  });
}

runTest("", [], { type: "empty" });

runTest(
  "1 + 2",
  [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: getOperator("+") },
  ],
  numericValue("3", unitless),
);

runTest(
  "a: 10 + 2",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: getOperator("/") },
    { type: "assignment", variableName: "a" },
  ],
  numericValue("5", unitless),
);

runTest(
  "b: 11 * a",
  [
    { type: "number", value: new BigNumber("11") },
    { type: "valueGenerator", generator: makeReadVariable("a") },
    { type: "operator", operator: getOperator("*") },
    { type: "assignment", variableName: "b" },
  ],
  numericValue("110", unitless),
  (() => {
    const env = emptyEnvironment();
    env.variables.a = numericValue("10", unitless);
    return env;
  })(),
);

const aggregatorEnv = () => {
  const env = emptyEnvironment();
  env.lines.push(numericValue("10", unitless));
  env.lines.push(numericValue("118", unitless));
  return env;
};

runTest(
  "sum",
  [{ type: "valueGenerator", generator: getAggregator("sum") }],
  numericValue("128", unitless),
  aggregatorEnv(),
);

runTest(
  "sum",
  [{ type: "valueGenerator", generator: getAggregator("sum") }],
  numericValue("129", unitless),
  (() => {
    const env = emptyEnvironment();
    env.lines.push(numericValue("10", unitless));
    env.lines.push({ type: "empty" });
    env.lines.push(numericValue("10", unitless));
    env.lines.push(numericValue("119", unitless));
    return env;
  })(),
);

runTest(
  "average",
  [{ type: "valueGenerator", generator: getAggregator("average") }],
  numericValue("64", unitless),
  aggregatorEnv(),
);

runTest(
  "10 %",
  [{ type: "number", value: new BigNumber("10") }, { type: "unit", unit: getUnit("%") as Unit }],
  numericValue("10", getUnit("%") as Unit),
);

runTest(
  "120 - 10 %",
  [
    { type: "number", value: new BigNumber("120") },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: getUnit("%") as Unit },
    { type: "operator", operator: getOperator("-") },
  ],
  numericValue("108", unitless),
);

runTest(
  "50.5 cm",
  [{ type: "number", value: new BigNumber("50.5") }, { type: "unit", unit: getUnit("cm") as Unit }],
  numericValue("50.5", getUnit("cm") as Unit),
);

runTest(
  "50.5 cm + 4 in",
  [
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: getUnit("cm") as Unit },
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: getUnit("in") as Unit },
    { type: "operator", operator: getOperator("+") },
  ],
  numericValue("60.66", getUnit("cm") as Unit),
);

runTest(
  "a: 5 in  + 10 cm",
  [
    { type: "number", value: new BigNumber("5") },
    { type: "unit", unit: getUnit("in") as Unit },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: getUnit("cm") as Unit },
    { type: "operator", operator: getOperator("+") },
    { type: "assignment", variableName: "a" },
  ],
  numericValue("8.9370078740157480315", getUnit("in") as Unit),
);

runTest(
  "Fee: 4 GBP to Euro",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: getUnit("GBP") as Unit },
    { type: "unit", unit: getUnit("EUR") as Unit },
    { type: "operator", operator: getOperator("to") },
    { type: "assignment", variableName: "Fee" },
  ],
  numericValue("4", getUnit("EUR") as Unit),
);

runTest(
  "Discount: -4 GBP to Euro",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: getUnit("GBP") as Unit },
    { type: "operator", operator: getOperator("-u") },
    { type: "unit", unit: getUnit("EUR") as Unit },
    { type: "operator", operator: getOperator("to") },
    { type: "assignment", variableName: "Discount" },
  ],
  numericValue("-4", getUnit("EUR") as Unit),
);

runTest(
  "3+-5*-(7*4)",
  [
    { type: "number", value: new BigNumber("3") },
    { type: "number", value: new BigNumber("5") },
    { type: "operator", operator: getOperator("-u") },
    { type: "number", value: new BigNumber("7") },
    { type: "number", value: new BigNumber("4") },
    { type: "operator", operator: getOperator("*") },
    { type: "operator", operator: getOperator("-u") },
    { type: "operator", operator: getOperator("*") },
    { type: "operator", operator: getOperator("+") },
  ],
  numericValue("143", unitless),
);

runTest(
  "4 GBP as mm",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: getUnit("GBP") as Unit },
    { type: "unit", unit: getUnit("mm") as Unit },
    { type: "operator", operator: getOperator("to") },
  ],
  errorValue("Cannot convert unit GBP to mm."),
);
