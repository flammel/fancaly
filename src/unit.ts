import { BigNumber } from "bignumber.js";

export type UnitName = string;

export interface Unit {
  base: UnitName;
  name: UnitName;
  multiplier: BigNumber;
  format: UnitFormatter;
}

export const unitless: Unit = {
  base: "",
  name: "",
  multiplier: new BigNumber(1),
  format: (str) => str,
};

export const percentage: Unit = {
  base: "%",
  name: "%",
  multiplier: new BigNumber(1),
  format: (str) => str,
};

export type UnitFormatter = (formattedNumber: string) => string;
