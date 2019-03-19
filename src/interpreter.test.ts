import { Environment } from "./environment";
import { Interpreter } from "./interpreter";
import { testConfig } from "./testConfig";

function runTest(data: string) {
  // data.trim() removes leading and trailing newline from multiline string which is contained in
  // the data due to the formatting of the test cases.
  const inputsOutputs = data
    .trim()
    .split("\n")
    .map((line) =>
      line
        .trim()
        .split(/\ {4,}/)
        .map((linePart) => linePart.trim()),
    );

  test(data, () => {
    const interpreter = new Interpreter(testConfig());
    const env = new Environment();
    for (const inOut of inputsOutputs) {
      expect(interpreter.evaluateLine(env, inOut[0])).toEqual(inOut[1] ? inOut[1] : "");
    }
  });
}

runTest(`

`);

runTest(`
  1 + 2     3
`);

runTest(`
  1 +
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
  1 m + 1 cm to mm    1.01 m
`);

runTest(`
  (1 m + 1 cm) to mm    1010 mm
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

runTest(`
  Price: 7$ * 4           28 USD
  Fee: 4 GBP to Euro      4 EUR
  (sum - 4 %) to USD        30.72 USD
`);

runTest(`
  Price: 7$ * 4           28 USD
  Fee: 4 GBP to Euro      4 EUR
  sum to USD * 4 %        1.28 USD
`);

runTest(`
  Price: 7$ * 4           28 USD
  Fee: 4 GBP to Euro      4 EUR
  sum to USD + 3 €        35 USD
`);

runTest(`
  -11         -11
  10          10
  sum         -1
`);

runTest(`
  11         11
  -10        -10
  sum        1
`);

runTest(`
  10*(1-1)      0
`);

runTest(`
  a:1           1
  10*(a-1)      0
`);

runTest(`
  10*(-1)      -10
`);

runTest(`
  a:1          1
  10*(-a)      -10
`);

runTest(`
  1 fl oz to ml      29.5735 ml
`);

runTest(`
  ipad costs 500 € + 10 % tax       550 EUR
`);

runTest(`
  333 $ flug * 3 personen       999 USD
`);

runTest(`
  30 € for the train ticket     30 EUR
  60 € for the hotel            60 EUR
  total sum for the holiday     90 EUR
`);

runTest(`
  10 % of 111           11.1
`);

runTest(`
  10 % off 111           99.9
`);

runTest(`
  10 % on 111           122.1
`);

runTest(`
  40 as a % of 100      40 %
`);

runTest(`
  15 as a % on 10       50 %
`);

runTest(`
  40 as a % off 100      60 %
`);

runTest(`
  10 % of what is 20      200
`);

runTest(`
  10 % off what is 90     100
`);

runTest(`
  10 % on what is 110     100
`);

runTest(`
  10 mm * 12 g            120
`);

runTest(`
  12 g as mm              12 mm
`);

runTest(`
  10 mm as a % of 10 cm     10 %
`);

test("1,67823 + 30", () => {
  const interpreter = new Interpreter(testConfig(","));
  const env = new Environment();
  expect(interpreter.evaluateLine(env, "1,67823 + 30")).toEqual("31,6782");
});
