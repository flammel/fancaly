import { BigNumber } from "bignumber.js";
import { convert, getUnit, Unit, UnitName } from "./conversion";
import { numericValue } from "./evaluate";

function runTest(value: string, from: UnitName, to: UnitName, expected: string) {
  test(value + " " + from + " to " + to, () => {
    expect(convert(numericValue(value, getUnit(from) as Unit), getUnit(to) as Unit)).toEqual(
      numericValue(expected, getUnit(to) as Unit),
    );
  });
}

runTest("1", "mm", "m", "0.001");
runTest("1", "cm", "m", "0.01");
runTest("1", "m", "mm", "1000");
runTest("1", "m", "cm", "100");
runTest("1", "in", "cm", "2.54");
runTest("1", "inch", "mm", "25.4");
runTest("1", "foot", "mm", "304.8");
runTest("2", "feet", "mm", "609.6");
runTest("1000", "ft", "mm", "304800");
