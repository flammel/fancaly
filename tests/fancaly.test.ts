import { emptyEnvironment, evaluate } from "../src/evaluate";
import { lex, Tokens } from "../src/lex";
import { parse } from "../src/parse";
import { stringifyValue } from "../src/value";

function runTest(data: Array<[string, string]>) {
  test(data.map((x) => x[0]).join(" | "), () => {
    const env = emptyEnvironment();
    for (const inOut of data) {
      const lexed = lex(inOut[0]);
      expect(lexed.type).toEqual("success");
      const parsed = parse(lexed.tokens);
      expect(parsed.type).toEqual("success");
      const evaluated = evaluate(parsed.rpn, env);
      expect(stringifyValue(evaluated)).toEqual(inOut[1]);
    }
  });
}

runTest([["", ""]]);

runTest([["1 + 2", "3"]]);

runTest([["a: 10 + 2", "12"]]);

runTest([["a: 10 + 2", "12"]]);

runTest([
  ["a: 10 + 2", "12"],
  ["b: a / 2", "6"],
  ["c: a * b", "72"],
  ["c - 2", "70"],
]);

runTest([["8", "8"], ["2", "2"], ["sum", "10"]]);

runTest([["4", "4"], ["", ""], ["8", "8"], ["2", "2"], ["sum", "10"]]);
