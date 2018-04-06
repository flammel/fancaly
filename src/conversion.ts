import { BigNumber } from "bignumber.js";
import { Unit } from "./unit";
import { errorValue, numericValue, NumericValue, Value } from "./value";

const conversions: {
  [key: string]: { [key: string]: (a: BigNumber) => BigNumber };
} = {
  cm: {
    cm: (a: BigNumber) => a,
    in: (a: BigNumber) => a.dividedBy(new BigNumber("2.54")),
  },
  in: {
    cm: (a: BigNumber) => a.times(new BigNumber("2.54")),
    in: (a: BigNumber) => a,
  },
  unitless: {
    cm: (a: BigNumber) => a,
    in: (a: BigNumber) => a,
    unitless: (a: BigNumber) => a,
    "%": (a: BigNumber) => a,
  },
};

export function convert(value: NumericValue, unit: Unit): Value {
  if (!(value.unit.name in conversions)) {
    return errorValue(`No conversions for unit ${value.unit.name}`);
  }
  if (!(unit.name in conversions[value.unit.name])) {
    return errorValue(
      `No conversions from unit ${value.unit.name} to unit ${unit.name}`,
    );
  }
  const converter = conversions[value.unit.name][unit.name];
  return numericValue(converter(value.value), unit);
}
