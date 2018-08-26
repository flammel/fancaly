import { BigNumber } from "bignumber.js";
import { defaultConfig } from "./defaultConfig";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { List } from "./list";
import { Operator } from "./operator";
import { RPNItem } from "./parser";
import { Unit } from "./unit";
import { EmptyValue, ErrorValue, UnitfulNumericValue, UnitlessNumericValue, Value } from "./value";
import { ValueGenerator, VariableReader } from "./valueGenerator";

const config = defaultConfig();
const operators = config.getOperators();
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

runTest("", [], new EmptyValue());

runTest(
  "1 + 2",
  [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new UnitlessNumericValue("3"),
);

runTest(
  "a: 10 + 2",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "assignment", variableName: "a" },
  ],
  new UnitlessNumericValue("5"),
);

runTest(
  "b: 11 * a",
  [
    { type: "number", value: new BigNumber("11") },
    { type: "valueGenerator", generator: new VariableReader("a") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "assignment", variableName: "b" },
  ],
  new UnitlessNumericValue("110"),
  (() => {
    const env = new Environment();
    env.variables.a = new UnitlessNumericValue("10");
    return env;
  })(),
);

const aggregatorEnv = () => {
  const env = new Environment();
  env.lines.push(new UnitlessNumericValue("10"));
  env.lines.push(new UnitlessNumericValue("118"));
  return env;
};

runTest(
  "sum",
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new UnitlessNumericValue("128"),
  aggregatorEnv(),
);

runTest(
  "sum",
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new UnitlessNumericValue("129"),
  (() => {
    const env = new Environment();
    env.lines.push(new UnitlessNumericValue("10"));
    env.lines.push(new EmptyValue());
    env.lines.push(new UnitlessNumericValue("10"));
    env.lines.push(new UnitlessNumericValue("119"));
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
  new UnitlessNumericValue("64"),
  aggregatorEnv(),
);

runTest(
  "10 %",
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
  ],
  new UnitfulNumericValue("10", units.getUnit("%") as Unit),
);

runTest(
  "120 - 10 %",
  [
    { type: "number", value: new BigNumber("120") },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ],
  new UnitlessNumericValue("108"),
);

runTest(
  "50.5 cm",
  [
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
  ],
  new UnitfulNumericValue("50.5", units.getUnit("cm") as Unit),
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
  new UnitfulNumericValue("60.66", units.getUnit("cm") as Unit),
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
  new UnitfulNumericValue("8.9370078740157480315", units.getUnit("in") as Unit),
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
  new UnitfulNumericValue("4", units.getUnit("EUR") as Unit),
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
  new UnitfulNumericValue("-4", units.getUnit("EUR") as Unit),
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
  new UnitlessNumericValue("143"),
);

runTest(
  "4 GBP as mm",
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
  ],
  new ErrorValue("Cannot convert unit GBP to mm."),
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
  new UnitfulNumericValue("999", units.getUnit("$") as Unit),
);

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
    error ? new ErrorValue(expected) : new UnitfulNumericValue(expected, units.getUnit(to) as Unit),
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
runConvertTest("1", "mm", "g", "Cannot convert unit mm to g.", true);
runConvertTest("1", "mile", "m", "1609.34");
runConvertTest("1", "fl oz", "ml", "29.5735");
