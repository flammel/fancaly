import { BigNumber } from "bignumber.js";
import { defaultConfig } from "./defaultConfig";
import { Environment } from "./environment";
import { Token } from "./lexer";
import { List } from "./list";
import { Operator } from "./operator";
import { Parser, ParserResult, RPNItem } from "./parser";
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

const config = defaultConfig();
const operators = config.getOperators();
const units = config.getUnits();
const valueGenerators = config.getValueGenerators();

function runTest(name: string, tokens: Token[], output: ParserResult) {
  test(name, () => {
    const parser = new Parser(operators, units, valueGenerators, config.getNumberFormat());
    const received = parser.parse(new List(tokens));
    expect(withoutOperations(received)).toEqual(withoutOperations(output));
  });
}

runTest("", [], {
  type: "success",
  rpn: new List<RPNItem>([]),
});

runTest(
  "1 + 2",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "operator", operator: operators.getOperator("+") as Operator },
      { type: "number", value: new BigNumber("3") },
      { type: "operator", operator: operators.getOperator("*") as Operator },
    ]),
  },
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
  {
    type: "error",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "number", value: new BigNumber("3") },
      { type: "operator", operator: operators.getOperator("*") as Operator },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
    description: "Unbalanced parens in final loop.",
  },
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
  {
    type: "error",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
    description: 'Unbalanced parens in ")" loop.',
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("2") },
      { type: "number", value: new BigNumber("3") },
      { type: "operator", operator: operators.getOperator("*") as Operator },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("5") },
      { type: "number", value: new BigNumber("7") },
      { type: "operator", operator: operators.getOperator("/") as Operator },
      { type: "assignment", variableName: "a" },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "valueGenerator", generator: new VariableReader("y") },
      { type: "valueGenerator", generator: new VariableReader("x") },
      { type: "number", value: new BigNumber("40") },
      { type: "operator", operator: operators.getOperator("/") as Operator },
      { type: "operator", operator: operators.getOperator("+") as Operator },
      { type: "assignment", variableName: "d" },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("5") },
      { type: "number", value: new BigNumber("7") },
      { type: "operator", operator: operators.getOperator("/") as Operator },
      { type: "number", value: new BigNumber("10") },
      { type: "number", value: new BigNumber("75") },
      { type: "operator", operator: operators.getOperator("*") as Operator },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
  },
);

runTest("sum", [{ type: "aggregator", value: "sum" }], {
  type: "success",
  rpn: new List<RPNItem>([
    { type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator },
  ]),
});

runTest("average", [{ type: "aggregator", value: "average" }], {
  type: "success",
  rpn: new List<RPNItem>([
    {
      type: "valueGenerator",
      generator: valueGenerators.getAggregator("average") as ValueGenerator,
    },
  ]),
});

runTest(
  "0 = 1",
  [
    { type: "number", value: "0" },
    { type: "assignment", value: "=" },
    { type: "number", value: "1" },
  ],
  {
    type: "error",
    description: "Assignment operators are only allowed after identifiers.",
    rpn: new List<RPNItem>([{ type: "number", value: new BigNumber("0") }]),
  },
);

runTest("10 %", [{ type: "number", value: "10" }, { type: "unit", value: "%" }], {
  type: "success",
  rpn: new List<RPNItem>([
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
  ]),
});

runTest("50.5 cm", [{ type: "number", value: "50.5" }, { type: "unit", value: "cm" }], {
  type: "success",
  rpn: new List<RPNItem>([
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
  ]),
});

runTest(
  "50.5 cm + 4 in",
  [
    { type: "number", value: "50.5" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "+" },
    { type: "number", value: "4" },
    { type: "unit", value: "in" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("50.5") },
      { type: "unit", unit: units.getUnit("cm") as Unit },
      { type: "number", value: new BigNumber("4") },
      { type: "unit", unit: units.getUnit("in") as Unit },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("5") },
      { type: "unit", unit: units.getUnit("in") as Unit },
      { type: "number", value: new BigNumber("10") },
      { type: "unit", unit: units.getUnit("cm") as Unit },
      { type: "operator", operator: operators.getOperator("+") as Operator },
      { type: "assignment", variableName: "a" },
    ]),
  },
);

runTest(
  "120 - 10 %",
  [
    { type: "number", value: "120" },
    { type: "operator", value: "-" },
    { type: "number", value: "10" },
    { type: "unit", value: "%" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("120") },
      { type: "number", value: new BigNumber("10") },
      { type: "unit", unit: units.getUnit("%") as Unit },
      { type: "operator", operator: operators.getOperator("-") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("100") },
      { type: "number", value: new BigNumber("5") },
      { type: "number", value: new BigNumber("1") },
      { type: "operator", operator: operators.getOperator("+") as Operator },
      { type: "unit", unit: units.getUnit("%") as Unit },
      { type: "operator", operator: operators.getOperator("-") as Operator },
    ]),
  },
);

runTest(
  "10 in to cm",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "in" },
    { type: "operator", value: "to" },
    { type: "unit", value: "cm" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("10") },
      { type: "unit", unit: units.getUnit("in") as Unit },
      { type: "unit", unit: units.getUnit("cm") as Unit },
      { type: "operator", operator: operators.getOperator("to") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("10") },
      { type: "unit", unit: units.getUnit("in") as Unit },
      { type: "number", value: new BigNumber("120") },
      { type: "unit", unit: units.getUnit("mm") as Unit },
      { type: "unit", unit: units.getUnit("cm") as Unit },
      { type: "operator", operator: operators.getOperator("as") as Operator },
      { type: "operator", operator: operators.getOperator("+") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("4") },
      { type: "unit", unit: units.getUnit("GBP") as Unit },
      { type: "unit", unit: units.getUnit("EUR") as Unit },
      { type: "operator", operator: operators.getOperator("to") as Operator },
      { type: "assignment", variableName: "Fee" },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("4") },
      { type: "unit", unit: units.getUnit("GBP") as Unit },
      { type: "operator", operator: operators.getOperator("-u") as Operator },
      { type: "unit", unit: units.getUnit("EUR") as Unit },
      { type: "operator", operator: operators.getOperator("to") as Operator },
      { type: "assignment", variableName: "Discount" },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("4") },
      { type: "unit", unit: units.getUnit("GBP") as Unit },
      { type: "unit", unit: units.getUnit("EUR") as Unit },
      { type: "operator", operator: operators.getOperator("as") as Operator },
      { type: "assignment", variableName: "Fee" },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("10") },
      { type: "number", value: new BigNumber("1") },
      { type: "number", value: new BigNumber("1") },
      { type: "operator", operator: operators.getOperator("-") as Operator },
      { type: "operator", operator: operators.getOperator("*") as Operator },
    ]),
  },
);

runTest(
  "10*8.7mm",
  [
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "number", value: "8.7" },
    { type: "unit", value: "mm" },
  ],
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("10") },
      { type: "number", value: new BigNumber("8.7") },
      { type: "unit", unit: units.getUnit("mm") as Unit },
      { type: "operator", operator: operators.getOperator("*") as Operator },
    ]),
  },
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
  {
    type: "success",
    rpn: new List<RPNItem>([
      { type: "number", value: new BigNumber("333") },
      { type: "unit", unit: units.getUnit("$") as Unit },
      { type: "valueGenerator", generator: new VariableReader("flug") },
      { type: "number", value: new BigNumber("3") },
      { type: "valueGenerator", generator: new VariableReader("personen") },
      { type: "operator", operator: operators.getOperator("*") as Operator },
    ]),
  },
);
