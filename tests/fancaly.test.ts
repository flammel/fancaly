import { emptyEnvironment, evaluate } from "../src/evaluate";
import { lex, Tokens } from "../src/lex";
import { parse } from "../src/parse";
import { stringifyValue } from "../src/value";

function runTest(data: { [key: string]: string }) {
  test(Object.keys(data).join(" | "), () => {
    const env = emptyEnvironment();
    for (const input in data) {
      if (data.hasOwnProperty(input)) {
        const lexed = lex(input);
        expect(lexed.type).toEqual("success");
        const parsed = parse(lexed.tokens);
        expect(parsed.type).toEqual("success");
        const evaluated = evaluate(parsed.rpn, env);
        expect(stringifyValue(evaluated)).toEqual(data[input]);
      }
    }
  });
}

runTest({ "1 + 2": "3" });

runTest({ "a: 10 + 2": "12" });

runTest({ "a: 10 + 2": "12" });
runTest({
  "a: 10 + 2": "12",
  "b: a / 2": "6",
  "c: a * b": "72",
  "c - 2": "70",
});
