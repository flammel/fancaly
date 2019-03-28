import { BigNumber } from "bignumber.js";
import { advanceTo } from "jest-date-mock";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { Formatter } from "./formatter";
import { Func } from "./function";
import { Lexer, lexerSuccess, Token } from "./lexer";
import { List } from "./list";
import { Operator } from "./operator";
import { Parser, parserSuccess, RPNItem } from "./parser";
import { testConfig } from "./testConfig";
import { Unit, unitless } from "./unit";
import { DateTimeValue, EmptyValue, NumericValue, Value } from "./value";
import { ValueGenerator, VariableReader } from "./valueGenerator";

advanceTo(new Date(2018, 5, 27, 0, 0, 0));

const config = testConfig();
const operators = config.getOperators();
const functions = config.getFunctions();
const units = config.getUnits();
const valueGenerators = config.getValueGenerators();

const lexer = new Lexer(
  operators.getNames(),
  functions.getNames(),
  units.getNames(),
  valueGenerators.getAggregatorNames(),
  new Formatter("."),
);
const parser = new Parser(operators, functions, units, valueGenerators, config.getFormatter());
const evaluator = new Evaluator();

function runTest(
  input: string,
  tokens: Token[],
  rpn: RPNItem[],
  value: Value,
  env: Environment = new Environment(),
) {
  test(input, () => {
    const lexerResult = lexer.lex(input);
    expect(lexerResult).toEqual(lexerSuccess(tokens));

    const parserResult = parser.parse(lexerResult.tokens);
    expect(parserResult).toEqual(parserSuccess(rpn));

    const evaluatorResult = evaluator.evaluate(new List(rpn), env);
    expect(evaluatorResult).toEqual(value);
  });
}

runTest("", [], [], new EmptyValue());

runTest("# comment", [{ type: "comment", value: "# comment" }], [], new EmptyValue());

runTest(
  "1 + 2",
  [
    { type: "number", value: "1" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
  ],
  [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("3", unitless),
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
  [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ],
  new NumericValue("9", unitless),
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
  [
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("2") },
    { type: "number", value: new BigNumber("3") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("7", unitless),
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
  [
    { type: "number", value: new BigNumber("5") },
    { type: "number", value: new BigNumber("7") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "assignment", variableName: "a" },
  ],
  new NumericValue(new BigNumber("5").dividedBy(new BigNumber("7")), unitless),
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
  [
    { type: "valueGenerator", generator: new VariableReader("y") },
    { type: "valueGenerator", generator: new VariableReader("x") },
    { type: "number", value: new BigNumber("40") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "assignment", variableName: "d" },
  ],
  new NumericValue("13.40001", unitless),
  new Environment(
    {
      x: new NumericValue("0.0004", unitless),
      y: new NumericValue("13.4", unitless),
    },
    [],
  ),
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
  [
    { type: "number", value: new BigNumber("5") },
    { type: "number", value: new BigNumber("7") },
    { type: "operator", operator: operators.getOperator("/") as Operator },
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("75") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue(new BigNumber("5").dividedBy(new BigNumber("7")).plus("750"), unitless),
);

runTest(
  "sum",
  [{ type: "aggregator", value: "sum" }],
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new NumericValue("0", unitless),
);

runTest(
  "sum",
  [{ type: "aggregator", value: "sum" }],
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new NumericValue("3", unitless),
  new Environment({}, [new NumericValue("1", unitless), new NumericValue("2", unitless)]),
);

runTest(
  "sum",
  [{ type: "aggregator", value: "sum" }],
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator }],
  new NumericValue("129", unitless),
  new Environment({}, [
    new NumericValue("10", unitless),
    new EmptyValue(),
    new NumericValue("10", unitless),
    new NumericValue("119", unitless),
  ]),
);

runTest(
  "average",
  [{ type: "aggregator", value: "average" }],
  [
    {
      type: "valueGenerator",
      generator: valueGenerators.getAggregator("average") as ValueGenerator,
    },
  ],
  new NumericValue("0", unitless),
);

runTest(
  "average",
  [{ type: "aggregator", value: "average" }],
  [
    {
      type: "valueGenerator",
      generator: valueGenerators.getAggregator("average") as ValueGenerator,
    },
  ],
  new NumericValue("64", unitless),
  new Environment({}, [new NumericValue("10", unitless), new NumericValue("118", unitless)]),
);

runTest(
  "10 %",
  [{ type: "number", value: "10" }, { type: "unit", value: "%" }],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
  ],
  new NumericValue("10", units.getUnit("%") as Unit),
);

runTest(
  "50.5 cm",
  [{ type: "number", value: "50.5" }, { type: "unit", value: "cm" }],
  [
    { type: "number", value: new BigNumber("50.5") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
  ],
  new NumericValue("50.5", units.getUnit("cm") as Unit),
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
    { type: "identifier", value: "a" },
    { type: "assignment", value: ":" },
    { type: "number", value: "5" },
    { type: "unit", value: "in" },
    { type: "operator", value: "+" },
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
  ],
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
  "120 - 10 %",
  [
    { type: "number", value: "120" },
    { type: "operator", value: "-" },
    { type: "number", value: "10" },
    { type: "unit", value: "%" },
  ],
  [
    { type: "number", value: new BigNumber("120") },
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ],
  new NumericValue("108", unitless),
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
  [
    { type: "number", value: new BigNumber("100") },
    { type: "number", value: new BigNumber("5") },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
    { type: "unit", unit: units.getUnit("%") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ],
  new NumericValue("94", unitless),
);

runTest(
  "10 in to cm",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "in" },
    { type: "operator", value: "to" },
    { type: "unit", value: "cm" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
  ],
  new NumericValue("25.4", units.getUnit("cm") as Unit),
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
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "number", value: new BigNumber("120") },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("14.7244094488188976378", units.getUnit("in") as Unit),
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
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("EUR") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
    { type: "assignment", variableName: "Fee" },
  ],
  new NumericValue("4", units.getUnit("EUR") as Unit),
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
  [
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("1") },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ],
  new NumericValue("0", unitless),
);

runTest(
  "10*8.7mm",
  [
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "number", value: "8.7" },
    { type: "unit", value: "mm" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "number", value: new BigNumber("8.7") },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "operator", operator: operators.getOperator("*") as Operator },
  ],
  new NumericValue("87", units.getUnit("mm") as Unit),
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
  [
    { type: "number", value: new BigNumber("12.34") },
    { type: "number", value: new BigNumber("1") },
    { type: "function", function: functions.getFunction("round") as Func },
    { type: "unit", unit: units.getUnit("m") as Unit },
    { type: "assignment", variableName: "x" },
  ],
  new NumericValue("12.3", units.getUnit("m") as Unit),
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
    { type: "number", value: "30" },
    { type: "unit", value: "€" },
    { type: "identifier", value: "for" },
    { type: "identifier", value: "the" },
    { type: "identifier", value: "train" },
    { type: "identifier", value: "ticket" },
  ],
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
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "123.456789" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
  ],
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
    { type: "number", value: "1" },
    { type: ")", value: ")" },
  ],
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
  [
    { type: "number", value: new BigNumber("123.65") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("floor") as Func },
    { type: "number", value: new BigNumber("2") },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new NumericValue("125", unitless),
);

const testDate = "2019-04-20";
runTest(
  testDate,
  [{ type: "date", value: testDate }],
  [{ type: "date", date: new Date(testDate) }],
  new DateTimeValue(new Date(testDate), false),
);

runTest(
  "10 days from now",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "days" },
    { type: "operator", value: "from" },
    { type: "aggregator", value: "now" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("day") as Unit },
    { type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator },
    { type: "operator", operator: operators.getOperator("from") as Operator },
  ],
  new DateTimeValue(new Date(2018, 6, 7, 0, 0, 0), true),
);

runTest(
  "10 days + now",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "days" },
    { type: "operator", value: "+" },
    { type: "aggregator", value: "now" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("day") as Unit },
    { type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator },
    { type: "operator", operator: operators.getOperator("+") as Operator },
  ],
  new DateTimeValue(new Date(2018, 6, 7, 0, 0, 0), true),
);

runTest(
  "b: 11 * a",
  [
    { type: "identifier", value: "b" },
    { type: "assignment", value: ":" },
    { type: "number", value: "11" },
    { type: "operator", value: "*" },
    { type: "identifier", value: "a" },
  ],
  [
    { type: "number", value: new BigNumber("11") },
    { type: "valueGenerator", generator: new VariableReader("a") },
    { type: "operator", operator: operators.getOperator("*") as Operator },
    { type: "assignment", variableName: "b" },
  ],
  new NumericValue("110", unitless),
  new Environment({ a: new NumericValue("10", unitless) }, []),
);

runTest(
  "3+-5*-(7*4)",
  [
    { type: "number", value: "3" },
    { type: "operator", value: "+" },
    { type: "operator", value: "-" },
    { type: "number", value: "5" },
    { type: "operator", value: "*" },
    { type: "operator", value: "-" },
    { type: "(", value: "(" },
    { type: "number", value: "7" },
    { type: "operator", value: "*" },
    { type: "number", value: "4" },
    { type: ")", value: ")" },
  ],
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
    { type: "number", value: "4" },
    { type: "unit", value: "GBP" },
    { type: "operator", value: "as" },
    { type: "unit", value: "mm" },
  ],
  [
    { type: "number", value: new BigNumber("4") },
    { type: "unit", unit: units.getUnit("GBP") as Unit },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
  ],
  new NumericValue("4", units.getUnit("mm") as Unit),
);

runTest(
  "ceil(1.4; 0)",
  [
    { type: "function", value: "ceil" },
    { type: "(", value: "(" },
    { type: "number", value: "1.4" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
  ],
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
    { type: "function", value: "floor" },
    { type: "(", value: "(" },
    { type: "number", value: "1.5" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
  ],
  [
    { type: "number", value: new BigNumber("1.5") },
    { type: "number", value: new BigNumber("0") },
    { type: "function", function: functions.getFunction("floor") as Func },
  ],
  new NumericValue("1", unitless),
);

runTest(
  "now",
  [{ type: "aggregator", value: "now" }],
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("now") as ValueGenerator }],
  new DateTimeValue(new Date(2018, 5, 27, 0, 0, 0), true),
);

runTest(
  "today",
  [{ type: "aggregator", value: "today" }],
  [{ type: "valueGenerator", generator: valueGenerators.getAggregator("today") as ValueGenerator }],
  new DateTimeValue(new Date(2018, 5, 27, 0, 0, 0), false),
);

runTest(
  "a : (1.1 cm - x in) to m",
  [
    { type: "identifier", value: "a" },
    { type: "assignment", value: ":" },
    { type: "(", value: "(" },
    { type: "number", value: "1.1" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "-" },
    { type: "identifier", value: "x" },
    { type: "unit", value: "in" },
    { type: ")", value: ")" },
    { type: "operator", value: "to" },
    { type: "unit", value: "m" },
  ],
  [
    { type: "number", value: new BigNumber("1.1") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "valueGenerator", generator: new VariableReader("x") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "operator", operator: operators.getOperator("-") as Operator },
    { type: "unit", unit: units.getUnit("m") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
    { type: "assignment", variableName: "a" },
  ],
  new NumericValue("0.007825", units.getUnit("m") as Unit),
  new Environment({ x: new NumericValue("0.125", unitless) }, []),
);

runTest(
  "10 cm as in",
  [
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "as" },
    { type: "unit", value: "in" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
  ],
  new NumericValue("3.9370078740157480315", units.getUnit("in") as Unit),
);

runTest(
  "LängȘe: 10 mm",
  [
    { type: "identifier", value: "LängȘe" },
    { type: "assignment", value: ":" },
    { type: "number", value: "10" },
    { type: "unit", value: "mm" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "assignment", variableName: "LängȘe" },
  ],
  new NumericValue("10", units.getUnit("mm") as Unit),
);

runTest(
  "- 20 km",
  [
    { type: "operator", value: "-" },
    { type: "number", value: "20" },
    { type: "unit", value: "km" },
  ],
  [
    { type: "number", value: new BigNumber("20") },
    { type: "unit", unit: units.getUnit("km") as Unit },
    { type: "operator", operator: operators.getOperator("-u") as Operator },
  ],
  new NumericValue("-20", units.getUnit("km") as Unit),
);

runTest(
  "sum-1",
  [
    { type: "aggregator", value: "sum" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
  ],
  [
    { type: "valueGenerator", generator: valueGenerators.getAggregator("sum") as ValueGenerator },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ],
  new NumericValue("9.11", units.getUnit("s") as Unit),
  new Environment({}, [new NumericValue("10.11", units.getUnit("s") as Unit)]),
);

runTest(
  "1in to cm-1",
  [
    { type: "number", value: "1" },
    { type: "unit", value: "in" },
    { type: "operator", value: "to" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
  ],
  [
    { type: "number", value: new BigNumber("1") },
    { type: "unit", unit: units.getUnit("in") as Unit },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "operator", operator: operators.getOperator("to") as Operator },
    { type: "number", value: new BigNumber("1") },
    { type: "operator", operator: operators.getOperator("-") as Operator },
  ],
  new NumericValue("1.54", units.getUnit("cm") as Unit),
);

runTest(
  "asdf: 10 cm as mm",
  [
    { type: "identifier", value: "asdf" },
    { type: "assignment", value: ":" },
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "as" },
    { type: "unit", value: "mm" },
  ],
  [
    { type: "number", value: new BigNumber("10") },
    { type: "unit", unit: units.getUnit("cm") as Unit },
    { type: "unit", unit: units.getUnit("mm") as Unit },
    { type: "operator", operator: operators.getOperator("as") as Operator },
    { type: "assignment", variableName: "asdf" },
  ],
  new NumericValue("100", units.getUnit("mm") as Unit),
);
