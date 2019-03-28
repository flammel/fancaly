import { Formatter } from "./formatter";
import { Lexer, LexerResult, lexerSuccess } from "./lexer";
import { testConfig } from "./testConfig";

const config = testConfig();
const lexer = new Lexer(
  config.getOperators().getNames(),
  config.getFunctions().getNames(),
  config.getUnits().getNames(),
  config.getValueGenerators().getAggregatorNames(),
  new Formatter("."),
);

function runTest(input: string, output: LexerResult) {
  test(input, () => {
    expect(lexer.lex(input)).toEqual(output);
  });
}

runTest("", lexerSuccess([]));

runTest("# comment", lexerSuccess([{ type: "comment", value: "# comment" }]));

runTest(
  "a : (0.1 cm - x in) to m",
  lexerSuccess([
    { type: "identifier", value: "a" },
    { type: "assignment", value: ":" },
    { type: "(", value: "(" },
    { type: "number", value: "0.1" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "-" },
    { type: "identifier", value: "x" },
    { type: "unit", value: "in" },
    { type: ")", value: ")" },
    { type: "operator", value: "to" },
    { type: "unit", value: "m" },
  ]),
);

runTest("sum", lexerSuccess([{ type: "aggregator", value: "sum" }]));

runTest("average", lexerSuccess([{ type: "aggregator", value: "average" }]));

runTest("10 %", lexerSuccess([{ type: "number", value: "10" }, { type: "unit", value: "%" }]));

runTest(
  "50.5 cm",
  lexerSuccess([{ type: "number", value: "50.5" }, { type: "unit", value: "cm" }]),
);

runTest(
  "50.5 cm + 4 in",
  lexerSuccess([
    { type: "number", value: "50.5" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "+" },
    { type: "number", value: "4" },
    { type: "unit", value: "in" },
  ]),
);

runTest(
  "120 - 10 %",
  lexerSuccess([
    { type: "number", value: "120" },
    { type: "operator", value: "-" },
    { type: "number", value: "10" },
    { type: "unit", value: "%" },
  ]),
);

runTest(
  "10 in to cm",
  lexerSuccess([
    { type: "number", value: "10" },
    { type: "unit", value: "in" },
    { type: "operator", value: "to" },
    { type: "unit", value: "cm" },
  ]),
);

runTest(
  "10 cm as in",
  lexerSuccess([
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "as" },
    { type: "unit", value: "in" },
  ]),
);

runTest(
  "LängȘe: 10 mm",
  lexerSuccess([
    { type: "identifier", value: "LängȘe" },
    { type: "assignment", value: ":" },
    { type: "number", value: "10" },
    { type: "unit", value: "mm" },
  ]),
);

runTest(
  "- 20 km",
  lexerSuccess([
    { type: "operator", value: "-" },
    { type: "number", value: "20" },
    { type: "unit", value: "km" },
  ]),
);

runTest(
  "10*(1-1)",
  lexerSuccess([
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "(", value: "(" },
    { type: "number", value: "1" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
    { type: ")", value: ")" },
  ]),
);

runTest(
  "sum-1",
  lexerSuccess([
    { type: "aggregator", value: "sum" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
  ]),
);

runTest(
  "1in to cm-1",
  lexerSuccess([
    { type: "number", value: "1" },
    { type: "unit", value: "in" },
    { type: "operator", value: "to" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
  ]),
);

runTest(
  "asdf: 10 cm as mm",
  lexerSuccess([
    { type: "identifier", value: "asdf" },
    { type: "assignment", value: ":" },
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "as" },
    { type: "unit", value: "mm" },
  ]),
);

runTest(
  "10 * 8.7 mm",
  lexerSuccess([
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "number", value: "8.7" },
    { type: "unit", value: "mm" },
  ]),
);

runTest(
  "333 $ flug * 3 personen",
  lexerSuccess([
    { type: "number", value: "333" },
    { type: "unit", value: "$" },
    { type: "identifier", value: "flug" },
    { type: "operator", value: "*" },
    { type: "number", value: "3" },
    { type: "identifier", value: "personen" },
  ]),
);

runTest(
  "30 € for the train ticket",
  lexerSuccess([
    { type: "number", value: "30" },
    { type: "unit", value: "€" },
    { type: "identifier", value: "for" },
    { type: "identifier", value: "the" },
    { type: "identifier", value: "train" },
    { type: "identifier", value: "ticket" },
  ]),
);

runTest(
  "round(123.456789; 0)",
  lexerSuccess([
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "123.456789" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
  ]),
);

runTest(
  "round(1.1 * 4.4; 2 * (1 - 0.5))",
  lexerSuccess([
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
  ]),
);

runTest(
  "round(123.4 - 12; -2)",
  lexerSuccess([
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "123.4" },
    { type: "operator", value: "-" },
    { type: "number", value: "12" },
    { type: ";", value: ";" },
    { type: "operator", value: "-" },
    { type: "number", value: "2" },
    { type: ")", value: ")" },
  ]),
);

runTest(
  "floor(123.65; 0) + 2",
  lexerSuccess([
    { type: "function", value: "floor" },
    { type: "(", value: "(" },
    { type: "number", value: "123.65" },
    { type: ";", value: ";" },
    { type: "number", value: "0" },
    { type: ")", value: ")" },
    { type: "operator", value: "+" },
    { type: "number", value: "2" },
  ]),
);

runTest("1992-06-22", lexerSuccess([{ type: "date", value: "1992-06-22" }]));

runTest(
  "1992 -06-22",
  lexerSuccess([
    { type: "number", value: "1992" },
    { type: "operator", value: "-" },
    { type: "number", value: "06" },
    { type: "operator", value: "-" },
    { type: "number", value: "22" },
  ]),
);

runTest(
  "1992-06- 22",
  lexerSuccess([
    { type: "number", value: "1992" },
    { type: "operator", value: "-" },
    { type: "number", value: "06" },
    { type: "operator", value: "-" },
    { type: "number", value: "22" },
  ]),
);

runTest(
  "x = round(12.34; 1) m",
  lexerSuccess([
    { type: "identifier", value: "x" },
    { type: "assignment", value: "=" },
    { type: "function", value: "round" },
    { type: "(", value: "(" },
    { type: "number", value: "12.34" },
    { type: ";", value: ";" },
    { type: "number", value: "1" },
    { type: ")", value: ")" },
    { type: "unit", value: "m" },
  ]),
);
