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
