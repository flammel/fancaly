import { BigNumber } from "bignumber.js";
import { advanceTo } from "jest-date-mock";
import { Environment } from "../lib/environment";
import { Evaluator } from "../lib/evaluator";
import { Func } from "../lib/function";
import { List } from "../lib/list";
import { Operator } from "../lib/operator";
import { RPNItem } from "../lib/parser";
import { Unit } from "../lib/unit";
import { ErrorValue, NumericValue, Value } from "../lib/value";
import { ValueGenerator } from "../lib/valueGenerator";
import { testConfig } from "./testConfig";

advanceTo(new Date(2018, 5, 27, 0, 0, 0));

const config = testConfig();
const operators = config.getOperators();
const functions = config.getFunctions();
const units = config.getUnits();
const valueGenerators = config.getValueGenerators();

function runTest(
  name: string,
  rpn: RPNItem[],
  output: Value,
  env: Environment = new Environment(),
) {
  const evaluator = new Evaluator();
  test(name, () => {
    expect(evaluator.evaluate(new List(rpn), env)).toEqual(output);
  });
}

function runConvertTest(
  value: string,
  from: string,
  to: string,
  expected: string,
  error: boolean = false,
) {
  runTest(
    value + " " + from + " to " + to,
    [
      { type: "number", value: new BigNumber(value) },
      { type: "unit", unit: units.getUnit(from) as Unit },
      { type: "unit", unit: units.getUnit(to) as Unit },
      { type: "operator", operator: operators.getOperator("to") as Operator },
    ],
    error ? new ErrorValue(expected) : new NumericValue(expected, units.getUnit(to) as Unit),
  );
}

runConvertTest("1", "mm", "m", "0.001");
runConvertTest("1", "cm", "m", "0.01");
runConvertTest("1", "m", "mm", "1000");
runConvertTest("1", "m", "cm", "100");
runConvertTest("1", "in", "cm", "2.54");
runConvertTest("1", "inch", "mm", "25.4");
runConvertTest("1", "foot", "mm", "304.8");
runConvertTest("2", "feet", "mm", "609.6");
runConvertTest("1000", "ft", "mm", "304800");
runConvertTest("1", "mm", "g", "1");
runConvertTest("1", "mile", "m", "1609.34");
runConvertTest("1", "fl oz", "ml", "29.5735");

runTest(
  "today + 10",
  [
    { type: "valueGenerator", generator: valueGenerators.getAggregator("today") as ValueGenerator },
    { type: "number", value: new BigNumber("10") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new ErrorValue(
    'Operation "+" cannot be applied to operands ' +
      "DateTimeValue(2018-06-27T00:00:00.000Z, false) and NumericValue(10, ).",
  ),
);

runTest(
  "round(today; 0)",
  [
    { type: "valueGenerator", generator: valueGenerators.getAggregator("today") as ValueGenerator },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("round") as Func },
  ],
  new ErrorValue('The function "round" must be applied to two numeric values'),
);

runTest(
  "-now",
  [
    { type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
  ],
  new ErrorValue(
    'Operand of "-u" must be a numeric value but is DateTimeValue(2018-06-27T00:00:00.000Z, true).',
  ),
);

runTest(
  "12 to 10",
  [
    { type: "number", value: new BigNumber("12") },
    { type: "number", value: new BigNumber("10") },
    { type: "operator", operator: operators.getOperator("to") as Operator },
  ],
  new ErrorValue(
    'Operation "to" cannot be applied to operands NumericValue(12, ) and NumericValue(10, ).',
  ),
);

runTest(
  "10 % as a % off 100",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "number", value: new BigNumber("100") },
    { type: "operator", operator: operators.getOperator("as a % off") as Operator },
  ],
  new ErrorValue(
    'Operation "as a % off" cannot be applied to operands NumericValue(10, %) and NumericValue(100, ).',
  ),
);

runTest(
  "10 minutes from 10",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("minutes") as Unit },
    { type: "number", value: new BigNumber("10") },
    { type: "operator", operator: operators.getOperator("from") as Operator },
  ],
  new ErrorValue(
    'Operation "from" cannot be applied to operands NumericValue(10, minute) and NumericValue(10, ).',
  ),
);
