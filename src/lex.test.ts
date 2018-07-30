import { lex, LexerResult, Token, Tokens } from "./lex";
import { List } from "./list";

function runTest(input: string, output: LexerResult) {
  test(input, () => {
    expect(lex(input)).toEqual(output);
  });
}

runTest("", { type: "success", tokens: new List<Token>([]) });

runTest("# comment", {
  type: "success",
  tokens: new List<Token>([{ type: "comment", value: "# comment" }]),
});

runTest("a : (0.1 cm - x in) to m", {
  type: "success",
  tokens: new List<Token>([
    { type: "identifier", value: "a" },
    { type: "assignment", value: ":" },
    { type: "(", value: "(" },
    { type: "number", value: "0.1" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "-" },
    { type: "identifier", value: "x" },
    { type: "unit", value: "in" },
    { type: ")", value: ")" },
    { type: "conversion", value: "to" },
    { type: "unit", value: "m" },
  ]),
});

runTest("sum", {
  type: "success",
  tokens: new List<Token>([{ type: "aggregator", value: "sum" }]),
});

runTest("average", {
  type: "success",
  tokens: new List<Token>([{ type: "aggregator", value: "average" }]),
});

runTest("10 %", {
  type: "success",
  tokens: new List<Token>([{ type: "number", value: "10" }, { type: "unit", value: "%" }]),
});

runTest("50.5 cm", {
  type: "success",
  tokens: new List<Token>([{ type: "number", value: "50.5" }, { type: "unit", value: "cm" }]),
});

runTest("50.5 cm + 4 in", {
  type: "success",
  tokens: new List<Token>([
    { type: "number", value: "50.5" },
    { type: "unit", value: "cm" },
    { type: "operator", value: "+" },
    { type: "number", value: "4" },
    { type: "unit", value: "in" },
  ]),
});

runTest("120 - 10 %", {
  type: "success",
  tokens: new List<Token>([
    { type: "number", value: "120" },
    { type: "operator", value: "-" },
    { type: "number", value: "10" },
    { type: "unit", value: "%" },
  ]),
});

runTest("10 in to cm", {
  type: "success",
  tokens: new List<Token>([
    { type: "number", value: "10" },
    { type: "unit", value: "in" },
    { type: "conversion", value: "to" },
    { type: "unit", value: "cm" },
  ]),
});

runTest("10 cm as in", {
  type: "success",
  tokens: new List<Token>([
    { type: "number", value: "10" },
    { type: "unit", value: "cm" },
    { type: "conversion", value: "as" },
    { type: "unit", value: "in" },
  ]),
});

runTest("LängȘe: 10 mm", {
  type: "success",
  tokens: new List<Token>([
    { type: "identifier", value: "LängȘe" },
    { type: "assignment", value: ":" },
    { type: "number", value: "10" },
    { type: "unit", value: "mm" },
  ]),
});

runTest("- 20 km", {
  type: "success",
  tokens: new List<Token>([
    { type: "operator", value: "-" },
    { type: "number", value: "20" },
    { type: "unit", value: "km" },
  ]),
});

runTest("10*(1-1)", {
  type: "success",
  tokens: new List<Token>([
    { type: "number", value: "10" },
    { type: "operator", value: "*" },
    { type: "(", value: "(" },
    { type: "number", value: "1" },
    { type: "operator", value: "-" },
    { type: "number", value: "1" },
    { type: ")", value: ")" },
  ]),
});
