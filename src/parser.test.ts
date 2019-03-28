import { BigNumber } from "bignumber.js";
import { Environment } from "./environment";
import { Func } from "./function";
import { Token } from "./lexer";
import { List } from "./list";
import { Operator } from "./operator";
import { Parser, parserError, ParserResult, parserSuccess } from "./parser";
import { testConfig } from "./testConfig";
import { Unit } from "./unit";
import { EmptyValue, Value } from "./value";
import { ValueGenerator, VariableReader } from "./valueGenerator";

function dummyOperation(env: Environment): Value {
  return new EmptyValue();
}

function withoutOperations(result: ParserResult): ParserResult {
  for (const item of result.rpn.items()) {
    if (item.type === "valueGenerator") {
      item.generator.operation = dummyOperation;
    }
  }
  return result;
}

const config = testConfig();
const operators = config.getOperators();
const functions = config.getFunctions();
const units = config.getUnits();
const valueGenerators = config.getValueGenerators();
const parser = new Parser(operators, functions, units, valueGenerators, config.getFormatter());

function runTest(name: string, tokens: Token[], output: ParserResult) {
  test(name, () => {
    const received = parser.parse(new List(tokens));
    expect(withoutOperations(received)).toEqual(withoutOperations(output));
  });
}

runTest("", [], parserSuccess([]));

runTest(
  "1 + 2",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
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
  parserSuccess([
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ]),
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
  parserError("Unbalanced parens in final loop.", [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
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
  parserError('Unbalanced parens in ")" loop.', [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
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
  parserSuccess([
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
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
  parserSuccess([
    { type: "number", value: new BigNumber("5") },
    { type: "number", value: new BigNumber("7") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "assignment", variableName: "a" },
  ]),
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
  parserSuccess([
    { type: "valueGenerator", generator: new VariableReader("y") },
    { type: "valueGenerator", generator: new VariableReader("x") },
    { type: "number", value: new BigNumber("40") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "assignment", variableName: "d" },
  ]),
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
  parserSuccess([
    { type: "number", value: new BigNumber("5") },
    { type: "number", value: new BigNumber("7") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("75") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
);

runTest(
  "sum",
  [{ type: "aggregator", value: "sum" }],
  parserSuccess([
    { type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator },
  ]),
);

runTest(
  "average",
  [{ type: "aggregator", value: "average" }],
  parserSuccess([
    {
      type: "valueGenerator",
      generator: valueGenerators.getAggregator("average") as ValueGenerator,
    },
  ]),
);

runTest(
  "0 = 1",
  [
    { type: "number", value: "0" },
    { type: "assignment", value: "=" },
    { type: "number", value: "1" },
  ],
  parserError("Assignment operators are only allowed after identifiers.", [
    { type: "number", value: new BigNumber("0") },
  ]),
);

runTest(
  "10 %",
  [{ type: "number", value: "10" }, { type: "unit", value: "%" }],
  parserSuccess([
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
  ]),
);

runTest(
  "50.5 cm",
  [{ type: "number", value: "50.5" }, { type: "unit", value: "cm" }],
  parserSuccess([
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
  ]),
);

runTest(
  "50.5 cm + 4 in",
  [
    { type: "number", value: "50.5" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "+" },
    { type: "number", value: "4" },
    { type: "unit", value: "in" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
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
  parserSuccess([
    { type: "number", value: new BigNumber("5") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "assignment", variableName: "a" },
  ]),
);

runTest(
  "120 - 10 %",
  [
    { type: "number", value: "120" },
    { type: "operator", value: "-" },
    { type: "number", value: "10" },
    { type: "unit", value: "%" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("120") },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ]),
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
    { type: "unit", value: "%" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("100") },
    { type: "number", value: new BigNumber("5") },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ]),
);

runTest(
  "10 in to cm",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "in" },
    { type: "operator", value: "to" },
    { type: "unit", value: "cm" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
  ]),
);

runTest(
  "10 in + 120 mm as cm",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "in" },
    { type: "operator", value: "+" },
    { type: "number", value: "120" },
    { type: "unit", value: "mm" },
    { type: "operator", value: "as" },
    { type: "unit", value: "cm" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "number", value: new BigNumber("120") },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
);

runTest(
  "Fee: 4 GBP to Euro",
  [
    { type: "identifier", value: "Fee" },
    { type: "assignment", value: ":" },
    { type: "number", value: "4" },
    { type: "unit", value: "GBP" },
    { type: "operator", value: "to" },
    { type: "unit", value: "Euro" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("EUR") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
    { type: "assignment", variableName: "Fee" },
  ]),
);

runTest(
  "Discount: -4 GBP to Euro",
  [
    { type: "identifier", value: "Discount" },
    { type: "assignment", value: ":" },
    { type: "operator", value: "-" },
    { type: "number", value: "4" },
    { type: "unit", value: "GBP" },
    { type: "operator", value: "to" },
    { type: "unit", value: "Euro" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "unit", unit: units.getUnit("EUR") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
    { type: "assignment", variableName: "Discount" },
  ]),
);

runTest(
  "Fee: 4 GBP as Euro",
  [
    { type: "identifier", value: "Fee" },
    { type: "assignment", value: ":" },
    { type: "number", value: "4" },
    { type: "unit", value: "GBP" },
    { type: "operator", value: "as" },
    { type: "unit", value: "Euro" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("EUR") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
    { type: "assignment", variableName: "Fee" },
  ]),
);

runTest(
  "10*(1-1)",
  [
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "(", value: "(" },
    { type: "number", value: "1" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
    { type: ")", value: ")" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ]),
);

runTest(
  "10*8.7mm",
  [
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "number", value: "8.7" },
    { type: "unit", value: "mm" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("8.7") },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ]),
);

runTest(
  "333 $ flug * 3 personen",
  [
    { type: "number", value: "333" },
    { type: "unit", value: "$" },
    { type: "identifier", value: "flug" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
    { type: "identifier", value: "personen" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("333") },
    { type: "unit", unit: units.getUnit("$") as Unit },
    { type: "valueGenerator", generator: new VariableReader("flug") },
    { type: "number", value: new BigNumber("3") },
    { type: "valueGenerator", generator: new VariableReader("personen") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ]),
);

runTest(
  "30 € for the train ticket",
  [
    { type: "number", value: "30" },
    { type: "unit", value: "€" },
    { type: "identifier", value: "for" },
    { type: "identifier", value: "the" },
    { type: "identifier", value: "train" },
    { type: "identifier", value: "ticket" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("30") },
    { type: "unit", unit: units.getUnit("€") as Unit },
    { type: "valueGenerator", generator: new VariableReader("for") },
    { type: "valueGenerator", generator: new VariableReader("the") },
    { type: "valueGenerator", generator: new VariableReader("train") },
    { type: "valueGenerator", generator: new VariableReader("ticket") },
  ]),
);

runTest(
  "round(123.456789; 0)",
  [
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "123.456789" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("123.456789") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("round") as Func },
  ]),
);

runTest(
  "round(1.1 * 4.4; 2 * (1 - 0.5))",
  [
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "1.1" },
    { type: "operator", value: "*" },
    { type: "number", value: "4.4" },
    { type: ";", value: ";" },
    { type: "number", value: "2" },
    { type: "operator", value: "*" },
    { type: "(", value: "(" },
    { type: "number", value: "1" },
    { type: "operator", value: "-" },
    { type: "number", value: "0.5" },
    { type: ")", value: ")" },
    { type: ")", value: ")" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("1.1") },
    { type: "number", value: new BigNumber("4.4") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "number", value: new BigNumber("2") },
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("0.5") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "function", function: functions.getFunction("round") as Func },
  ]),
);

runTest(
  "round(123.4 - 12; -2)",
  [
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "123.4" },
    { type: "operator", value: "-" },
    { type: "number", value: "12" },
    { type: ";", value: ";" },
    { type: "operator", value: "-" },
    { type: "number", value: "2" },
    { type: ")", value: ")" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("123.4") },
    { type: "number", value: new BigNumber("12") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "function", function: functions.getFunction("round") as Func },
  ]),
);

runTest(
  "round((123.4 - 12) * 3; -2)",
  [
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "(", value: "(" },
    { type: "number", value: "123.4" },
    { type: "operator", value: "-" },
    { type: "number", value: "12" },
    { type: ")", value: ")" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
    { type: ";", value: ";" },
    { type: "operator", value: "-" },
    { type: "number", value: "2" },
    { type: ")", value: ")" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("123.4") },
    { type: "number", value: new BigNumber("12") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
    { type: "function", function: functions.getFunction("round") as Func },
  ]),
);

runTest(
  "floor(123.65; 0) + 2",
  [
    { type: "function", value: "floor" },
    { type: "(", value: "(" },
    { type: "number", value: "123.65" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("123.65") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("floor") as Func },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ]),
);

runTest(
  "unknown unit",
  [{ type: "number", value: "10" }, { type: "unit", value: "megameter" }],
  parserError('Unknown unit "megameter".', [{ type: "number", value: new BigNumber("10") }]),
);

runTest(
  "unknown aggregator",
  [{ type: "aggregator", value: "awerage" }],
  parserError('Unknown aggregator "awerage".', []),
);

runTest(
  "1 ! 2",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "!" },
    { type: "number", value: "2" },
  ],
  parserError("Unknown operator !", [{ type: "number", value: new BigNumber("1") }]),
);

runTest(
  "round ;",
  [{ type: "function", value: "round" }, { type: ";", value: ";" }],
  parserError('Unbalanced parens in ";" loop.', []),
);

const testDate = "2019-04-20";
runTest(
  testDate,
  [{ type: "date", value: testDate }],
  parserSuccess([{ type: "date", date: new Date(testDate) }]),
);

runTest(
  "10 days from now",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "days" },
    { type: "operator", value: "from" },
    { type: "aggregator", value: "now" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("day") as Unit },
    { type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator },
    { type: "operator", operator: operators.getOperator("from") as Operator },
  ]),
);

runTest(
  "x = round(12.34; 1) m",
  [
    { type: "identifier", value: "x" },
    { type: "assignment", value: "=" },
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "12.34" },
    { type: ";", value: ";" },
    { type: "number", value: "1" },
    { type: ")", value: ")" },
    { type: "unit", value: "m" },
  ],
  parserSuccess([
    { type: "number", value: new BigNumber("12.34") },
    { type: "number", value: new BigNumber("1") },
    { type: "function", function: functions.getFunction("round") as Func },
    { type: "unit", unit: units.getUnit("m") as Unit },
    { type: "assignment", variableName: "x" },
  ]),
);
