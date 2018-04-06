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
