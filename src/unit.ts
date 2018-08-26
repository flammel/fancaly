import { BigNumber } from "bignumber.js";

export type UnitName = string;

export interface Unit {
  base: UnitName;
  name: UnitName;
  multiplier: BigNumber;
  format: Formatter;
}

export type Formatter = (formattedNumber: string) => string;
