import { BigNumber } from "bignumber.js";
import { errorValue, numericValue, NumericValue, Value } from "./evaluate";

type UnitName = string;

export interface Unit {
  base: UnitName;
  name: UnitName;
  multiplier: BigNumber;
}

const unitTable: { [key: string]: Unit } = {
  unitless: { base: "unitless", name: "unitless", multiplier: new BigNumber(1) },
  "%": { base: "%", name: "%", multiplier: new BigNumber(1) },
};

export function addUnit(base: UnitName, multiplier: string, ...names: UnitName[]) {
  for (const name of names) {
    unitTable[name.toLowerCase()] = { base, name: names[0], multiplier: new BigNumber(multiplier) };
  }
}

export function convert(value: NumericValue, to: Unit): NumericValue | null {
  if (value.unit === unitless) {
    return numericValue(value.value, to);
  }
  if (value.unit.base !== to.base) {
    return null;
  }
  return numericValue(value.value.times(value.unit.multiplier.dividedBy(to.multiplier)), to);
}

addUnit("mm", "1", "mm");
addUnit("mm", "10", "cm");
addUnit("mm", "100", "dm");
addUnit("mm", "1000", "m");
addUnit("mm", "1000000", "km");
addUnit("mm", "304.8", "ft", "foot", "feet");
addUnit("mm", "25.4", "in", "inch");
addUnit("USD", "1", "USD", "$", "dollar", "dollars");
addUnit("USD", "1", "EUR", "€", "euro", "euros");
addUnit("USD", "1", "GBP");
addUnit("g", "1", "g", "gram", "grams");
addUnit("g", "10", "dkg");
addUnit("g", "1000", "kg");
addUnit("g", "28.3495", "oz");

export const unitless = unitTable.unitless;
export const percent = unitTable["%"];

export function getUnit(name: string): Unit | undefined {
  return unitTable[name.toLowerCase()];
}

export function unitNames(): string[] {
  const names = [];
  for (const name in unitTable) {
    /* istanbul ignore else  */
    if (unitTable.hasOwnProperty(name)) {
      names.push(name);
    }
  }
  return names;
}
