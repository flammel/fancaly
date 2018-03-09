import { BigNumber } from "bignumber.js";
import { Unit } from "./unit";

export type Value = NumericValue | NoValue | ErrorValue;

export interface NumericValue {
  type: "NumericValue";
  unit: Unit;
  value: BigNumber;
}
interface ErrorValue {
  type: "ErrorValue";
  description: string;
}

type NoValue = { type: "NoValue" };

export function isNumericValue(a: any): a is NumericValue {
  return a && a.type === "NumericValue";
}

export function noValue(): NoValue {
  return { type: "NoValue" };
}

export function numericValue(value: BigNumber, unit: Unit): NumericValue {
  return {
    type: "NumericValue",
    unit,
    value,
  };
}

export function errorValue(description: string): ErrorValue {
  return {
    type: "ErrorValue",
    description,
  };
}

export function stringifyValue(val: Value): string {
  switch (val.type) {
    case "NumericValue":
      let str = val.value.dp(4).toFormat();
      if (val.unit.name !== "unitless") {
        str += " " + val.unit.name;
      }
      return str;
    case "NoValue":
      return "";
    case "ErrorValue":
      return "Error: " + val.description;
  }
}
