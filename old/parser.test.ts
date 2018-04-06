import { BigNumber } from "bignumber.js";
import { interpret } from "./parser";
import { stringifyValue } from "./value";

BigNumber.config({
  FORMAT: {
    decimalSeparator: ".",
    fractionGroupSeparator: "",
    fractionGroupSize: 0,
    groupSeparator: "",
    groupSize: 0,
    secondaryGroupSize: 0,
  },
});

function runTest(input: string[], output: string[]) {
  test(input.join("; "), () => {
    expect(interpret(input).map(stringifyValue)).toEqual(output);
  });
}

runTest([], []);
runTest([""], [""]);
runTest(["# Headline"], [""]);
runTest(["1 000 +1"], ["1001"]);
runTest(["1.001 +1"], ["2.001"]);
runTest(["(1+  2) *3"], ["9"]);
runTest(["(1+  (2-1)) *3"], ["6"]);
runTest(["1+  2 *3"], ["7"]);
runTest(["a = 1", "a / 10 * 8"], ["1", "0.8"]);
runTest(["b = 11 + 22", "c: b/3", "c"], ["33", "11", "11"]);
runTest(["b = 11 + 22", "c: b/3", "c"], ["33", "11", "11"]);
runTest(["1 cm to in"], ["0.3937 in"]);
runTest(["(1+1) cm to in"], ["0.7874 in"]);
runTest(["2-1 cm to in"], ["0.3937 in"]);
// runTest(["1cm + 1 in to cm"], ["3.54 in"]);
runTest(["a: 2cm", "b=3cm", "a+b"], ["2 cm", "3 cm", "5 cm"]);
runTest(["a: 2", "b=3", "a cm +b cm"], ["2", "3", "5 cm"]);
runTest(["a: 2cm", "b=3in", " a +b "], ["2 cm", "3 in", "9.62 cm"]);
runTest(["a: 3in", "b=2cm", "a + b"], ["3 in", "2 cm", "3.7874 in"]);
runTest(["a: 3in", "b=2cm", "a+b cm"], ["3 in", "2 cm", "9.62 cm"]);
runTest(["1 in to cm"], ["2.54 cm"]);
