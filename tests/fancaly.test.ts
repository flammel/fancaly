import { emptyEnvironment, evaluate } from "../src/evaluate";
import { stringifyValue } from "../src/evaluate";
import { lex, Tokens } from "../src/lex";
import { parse } from "../src/parse";

function runTest(data: string) {
  // data.trim() removes leading and trailing newline from multiline string which is contained in
  // the data due to the formatting of the test cases.
  const inputsOutputs = data
    .trim()
    .split("\n")
    .map((line) => line.split(/\ {4,}/).map((linePart) => linePart.trim()));
  test(data, () => {
    const env = emptyEnvironment();
    for (const inOut of inputsOutputs) {
      const lexed = lex(inOut[0]);
      if (lexed.type !== "success") {
        expect(lexed.description).toEqual("success");
      }
      const parsed = parse(lexed.tokens);
      if (parsed.type !== "success") {
        expect(parsed.description).toEqual("success");
      }
      const evaluated = evaluate(parsed.rpn, env);
      expect(stringifyValue(evaluated)).toEqual(inOut[1] ? inOut[1] : "");
    }
  });
}

runTest(`

`);

runTest(`
  1 + 2     3
`);

runTest(`
  a: 10 + 2     12
`);

runTest(`
  a: 10 + 2     12
`);

runTest(`
  a: 10 + 2     12
  b: a / 2      6
  c: a * b      72
  c - 2         70
`);

runTest(`
  d
`);

runTest(`
  8       8
  2       2
  sum     10
`);

runTest(`
  4       4

  8       8
  2       2
  sum     10
`);

runTest(`
  4           4

  8           8
  2           2
  sum + 5     15
`);

runTest(`
  4           4

  8           8
  2           2
  2 * sum     20
`);

runTest(`
  4               4

  8               8
  2               2
  a = 2 * sum     20
  a/2             10
`);

runTest(`
  4 cm      4 cm
  8 in      8 in
  sum       24.32 cm
`);

runTest(`
  120 - 10 %      108
`);
runTest(`
  120 / 10 %      1200
`);

runTest(`
  4               4

  8               8
  2               2
  sum + 10 %      11
`);

runTest(`
  length: 54.3 in to cm     137.922 cm
`);

runTest(`
  length: 1 oz as g     28.3495 g
`);

runTest(`
  tax: 20%          20 %
  price: 100 €      100 EUR
  price + tax       120 EUR
`);

runTest(`
  1         1
  3         3
  sum       4

  1+1       2
  2+2       4
  sum       6
`);

runTest(`
  4       4
  5       5
  sum     9

  1       1
  2       2
  sum     3
  sum     6
`);

runTest(`
  1 m + 1 cm to mm    1010 mm
`);

runTest(`
  asdf: 10      10
  asdf + 1      11
`);

runTest(`
  länge: 10 mm              10 mm
  höhe: 10 cm               10 cm
  ÜmlàutŞ: 1 in             1 in
  länge + höhe + ÜmlàutŞ    135.4 mm
`);

runTest(`
  Price: 7$ * 4           28 USD
  Fee: 4 GBP to Euro      4 EUR
  sum to USD - 4 %        30.72 USD
`);
