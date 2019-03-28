import { BigNumber } from "bignumber.js";
import { advanceTo } from "jest-date-mock";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { Func } from "./function";
import { List } from "./list";
import { Operator } from "./operator";
import { RPNItem } from "./parser";
import { testConfig } from "./testConfig";
import { Unit, unitless } from "./unit";
import { DateTimeValue, EmptyValue, ErrorValue, NumericValue, Value } from "./value";
import { ValueGenerator, VariableReader } from "./valueGenerator";

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

runTest("", [], new EmptyValue());

runTest(
  "1 + 2",
  [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("3", unitless),
);

runTest(
  "a: 10 + 2",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "assignment", variableName: "a" },
  ],
  new NumericValue("5", unitless),
);

runTest(
  "b: 11 * a",
  [
    { type: "number", value: new BigNumber("11") },
    { type: "valueGenerator", generator: new VariableReader("a") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "assignment", variableName: "b" },
  ],
  new NumericValue("110", unitless),
  (() => {
    const env = new Environment();
    env.variables.a = new NumericValue("10", unitless);
    return env;
  })(),
);

const aggregatorEnv = () => {
  const env = new Environment();
  env.lines.push(new NumericValue("10", unitless));
  env.lines.push(new NumericValue("118", unitless));
  return env;
};

runTest(
  "sum",
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new NumericValue("128", unitless),
  aggregatorEnv(),
);

runTest(
  "sum",
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new NumericValue("129", unitless),
  (() => {
    const env = new Environment();
    env.lines.push(new NumericValue("10", unitless));
    env.lines.push(new EmptyValue());
    env.lines.push(new NumericValue("10", unitless));
    env.lines.push(new NumericValue("119", unitless));
    return env;
  })(),
);

runTest(
  "average",
  [
    {
      type: "valueGenerator",
      generator: valueGenerators.getAggregator("average") as ValueGenerator,
    },
  ],
  new NumericValue("64", unitless),
  aggregatorEnv(),
);

runTest(
  "10 %",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
  ],
  new NumericValue("10", units.getUnit("%") as Unit),
);

runTest(
  "120 - 10 %",
  [
    { type: "number", value: new BigNumber("120") },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ],
  new NumericValue("108", unitless),
);

runTest(
  "50.5 cm",
  [
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
  ],
  new NumericValue("50.5", units.getUnit("cm") as Unit),
);

runTest(
  "50.5 cm + 4 in",
  [
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("60.66", units.getUnit("cm") as Unit),
);

runTest(
  "a: 5 in  + 10 cm",
  [
    { type: "number", value: new BigNumber("5") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "assignment", variableName: "a" },
  ],
  new NumericValue("8.9370078740157480315", units.getUnit("in") as Unit),
);

runTest(
  "Fee: 4 GBP to Euro",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("EUR") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
    { type: "assignment", variableName: "Fee" },
  ],
  new NumericValue("4", units.getUnit("EUR") as Unit),
);

runTest(
  "Discount: -4 GBP to Euro",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "unit", unit: units.getUnit("EUR") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
    { type: "assignment", variableName: "Discount" },
  ],
  new NumericValue("-4", units.getUnit("EUR") as Unit),
);

runTest(
  "3+-5*-(7*4)",
  [
    { type: "number", value: new BigNumber("3") },
    { type: "number", value: new BigNumber("5") },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "number", value: new BigNumber("7") },
    { type: "number", value: new BigNumber("4") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("143", unitless),
);

runTest(
  "4 GBP as mm",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
  ],
  new NumericValue("4", units.getUnit("mm") as Unit),
);

runTest(
  "333 $ flug * 3 personen",
  [
    { type: "number", value: new BigNumber("333") },
    { type: "unit", unit: units.getUnit("$") as Unit },
    { type: "valueGenerator", generator: new VariableReader("flug") },
    { type: "number", value: new BigNumber("3") },
    { type: "valueGenerator", generator: new VariableReader("personen") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ],
  new NumericValue("999", units.getUnit("$") as Unit),
);

runTest(
  "30 € for the train ticket",
  [
    { type: "number", value: new BigNumber("30") },
    { type: "unit", unit: units.getUnit("€") as Unit },
    { type: "valueGenerator", generator: new VariableReader("for") },
    { type: "valueGenerator", generator: new VariableReader("the") },
    { type: "valueGenerator", generator: new VariableReader("train") },
    { type: "valueGenerator", generator: new VariableReader("ticket") },
  ],
  new NumericValue("30", units.getUnit("€") as Unit),
);

runTest(
  "round(123.456789; 0)",
  [
    { type: "number", value: new BigNumber("123.456789") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("round") as Func },
  ],
  new NumericValue("123", unitless),
);

runTest(
  "round(1.1 * 4.4; 2 * (1 - 0.5))",
  [
    { type: "number", value: new BigNumber("1.1") },
    { type: "number", value: new BigNumber("4.4") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "number", value: new BigNumber("2") },
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("0.5") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "function", function: functions.getFunction("round") as Func },
  ],
  new NumericValue("4.8", unitless),
);

runTest(
  "round(123.4 - 12; -2)",
  [
    { type: "number", value: new BigNumber("123.4") },
    { type: "number", value: new BigNumber("12") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "function", function: functions.getFunction("round") as Func },
  ],
  new NumericValue("100", unitless),
);

runTest(
  "round((123.4 - 12) * 3; -1)",
  [
    { type: "number", value: new BigNumber("123.4") },
    { type: "number", value: new BigNumber("12") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "function", function: functions.getFunction("round") as Func },
  ],
  new NumericValue("330", unitless),
);

runTest(
  "ceil(1.4; 0)",
  [
    { type: "number", value: new BigNumber("1.4") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("ceil") as Func },
  ],
  new NumericValue("2", unitless),
);

runTest(
  "floor(1.5; 0)",
  [
    { type: "number", value: new BigNumber("1.5") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("floor") as Func },
  ],
  new NumericValue("1", unitless),
);

runTest(
  "floor(123.65; 0) + 2      125",
  [
    { type: "number", value: new BigNumber("123.65") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("floor") as Func },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("125", unitless),
);

runTest(
  "now",
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator }],
  new DateTimeValue(new Date(2018, 5, 27, 0, 0, 0), true),
);

runTest(
  "today",
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("today") as ValueGenerator }],
  new DateTimeValue(new Date(2018, 5, 27, 0, 0, 0), false),
);

runTest(
  "10 days + now",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("day") as Unit },
    { type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator },
    { type: "operator", operator: operators.getOperator("from") as Operator },
  ],
  new DateTimeValue(new Date(2018, 6, 7, 0, 0, 0), true),
);

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

const testDate = "1985-05-17";
runTest(
  testDate,
  [{ type: "date", date: new Date(testDate) }],
  new DateTimeValue(new Date(testDate), false),
);

runTest(
  "x = round(12.34; 1) m",
  [
    { type: "number", value: new BigNumber("12.34") },
    { type: "number", value: new BigNumber("1") },
    { type: "function", function: functions.getFunction("round") as Func },
    { type: "unit", unit: units.getUnit("m") as Unit },
    { type: "assignment", variableName: "x" },
  ],
  new NumericValue("12.3", units.getUnit("m") as Unit),
);
