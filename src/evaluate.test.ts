import { emptyEnvironment, Environment, evaluate } from "./evaluate";
import { Token, Tokens } from "./lex";
import {
  getAggregator,
  getOperator,
  makeAssignment,
  makeReadVariable,
} from "./operator";
import { parse, RPN } from "./parse";
import { isUnit, Unit, unitless, units } from "./unit";
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
  rpn: RPN,
  output: Value,
  env: Environment = emptyEnvironment(),
) {
  test(name, () => {
    expect(evaluate(rpn, env)).toEqual(output);
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
