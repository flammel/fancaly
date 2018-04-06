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
  tokens: new List<Token>([{ name: "comment", value: "# comment" }]),
});

runTest("a : (0.1 cm - x in) to m", {
  type: "success",
  tokens: new List<Token>([
    { name: "identifier", value: "a" },
    { name: "assignment", value: ":" },
    { name: "(", value: "(" },
    { name: "number", value: "0.1" },
    { name: "unit", value: "cm" },
    { name: "operator", value: "-" },
    { name: "identifier", value: "x" },
    { name: "unit", value: "in" },
    { name: ")", value: ")" },
    { name: "identifier", value: "to" },
    { name: "unit", value: "m" },
  ]),
});

runTest("sum", {
  type: "success",
  tokens: new List<Token>([{ name: "aggregator", value: "sum" }]),
});

runTest("average", {
  type: "success",
  tokens: new List<Token>([{ name: "aggregator", value: "average" }]),
});

runTest("10 %", {
  type: "success",
  tokens: new List<Token>([
    { name: "number", value: "10" },
    { name: "percent", value: "%" },
  ]),
});

runTest("50.5 cm", {
  type: "success",
  tokens: new List<Token>([
    { name: "number", value: "50.5" },
    { name: "unit", value: "cm" },
  ]),
});

runTest("50.5 cm + 4 in", {
  type: "success",
  tokens: new List<Token>([
    { name: "number", value: "50.5" },
    { name: "unit", value: "cm" },
    { name: "operator", value: "+" },
    { name: "number", value: "4" },
    { name: "unit", value: "in" },
  ]),
});

runTest("120 - 10 %", {
  type: "success",
  tokens: new List<Token>([
    { name: "number", value: "120" },
    { name: "operator", value: "-" },
    { name: "number", value: "10" },
    { name: "percent", value: "%" },
  ]),
});
