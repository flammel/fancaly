import { emptyEnvironment, Environment, evaluate } from "./evaluate";
import { Token, Tokens } from "./lex";
import { getOperator, makeAssignment, makeReadVariable } from "./operator";
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
