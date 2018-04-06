import { emptyEnvironment, Environment, evaluate } from "./evaluate";
import { Token, Tokens } from "./lex";
import { List } from "./list";
import {
  getAggregator,
  getOperator,
  makeAssignment,
  makePercent,
  makeReadVariable,
} from "./operator";
import { parse, RPNItem } from "./parse";
import { isUnit, makeUnit, Unit, unitless, units } from "./unit";
import {
  errorValue,
  isNumericValue,
  noValue,
  NumericValue,
  numericValue,
  Value,
} from "./value";

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

runTest("", [], noValue());

runTest(
  "1 + 2",
  [
    numericValue("1", unitless()),
    numericValue("2", unitless()),
    getOperator("+"),
  ],
  numericValue("3", unitless()),
);

runTest(
  "a: 10 + 2",
  [
    numericValue("10", unitless()),
    numericValue("2", unitless()),
    getOperator("/"),
    makeAssignment("a"),
  ],
  numericValue("5", unitless()),
);

runTest(
  "b: 11 * a",
  [
    numericValue("11", unitless()),
    makeReadVariable("a"),
    getOperator("*"),
    makeAssignment("b"),
  ],
  numericValue("110", unitless()),
  (() => {
    const env = emptyEnvironment();
    env.variables.a = numericValue("10", unitless());
    return env;
  })(),
);

runTest(
  "sum",
  [getAggregator("sum")],
  numericValue("129", unitless()),
  (() => {
    const env = emptyEnvironment();
    env.lines.push(numericValue("10", unitless()));
    env.lines.push(numericValue("119", unitless()));
    return env;
  })(),
);

runTest(
  "sum",
  [getAggregator("sum")],
  numericValue("129", unitless()),
  (() => {
    const env = emptyEnvironment();
    env.lines.push(numericValue("10", unitless()));
    env.lines.push(noValue());
    env.lines.push(numericValue("10", unitless()));
    env.lines.push(numericValue("119", unitless()));
    return env;
  })(),
);

runTest(
  "average",
  [getAggregator("average")],
  numericValue("75", unitless()),
  (() => {
    const env = emptyEnvironment();
    env.lines.push(numericValue("50", unitless()));
    env.lines.push(numericValue("100", unitless()));
    return env;
  })(),
);

runTest(
  "10 %",
  [numericValue("10", unitless()), makePercent()],
  numericValue("10", makeUnit("%")),
);

runTest(
  "120 - 10 %",
  [
    numericValue("120", unitless()),
    numericValue("10", unitless()),
    makePercent(),
    getOperator("-"),
  ],
  numericValue("108", unitless()),
);

runTest(
  "50.5 cm",
  [numericValue("50.5", unitless()), makeUnit("cm")],
  numericValue("50.5", makeUnit("cm")),
);

runTest(
  "50.5 cm + 4 in",
  [
    numericValue("50.5", unitless()),
    makeUnit("cm"),
    numericValue("4", unitless()),
    makeUnit("in"),
    getOperator("+"),
  ],
  numericValue("60.66", makeUnit("cm")),
);

runTest(
  "a: 5 in  + 10 cm",
  [
    numericValue("5", unitless()),
    makeUnit("in"),
    numericValue("10", unitless()),
    makeUnit("cm"),
    getOperator("+"),
    makeAssignment("a"),
  ],
  numericValue("8.9370078740157480315", makeUnit("in")),
);
