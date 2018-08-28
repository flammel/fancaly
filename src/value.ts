import { BigNumber } from "bignumber.js";
import { Unit } from "./unit";

type NumberFormatter = (value: BigNumber) => string;

export function isError(obj: any): obj is ErrorValue {
  return "typeName" in obj && obj.typeName === "ErrorValue";
}

export function isEmpty(obj: any): obj is EmptyValue {
  return "typeName" in obj && obj.typeName === "EmptyValue";
}

export function isNumeric(obj: any): obj is UnitfulNumericValue | UnitlessNumericValue {
  return obj instanceof UnitfulNumericValue || obj instanceof UnitlessNumericValue;
}

export function isUnit(obj: any): obj is UnitValue {
  return "typeName" in obj && obj.typeName === "UnitValue";
}

export function isUnitless(obj: any): obj is UnitlessNumericValue {
  return "typeName" in obj && obj.typeName === "UnitlessNumericValue";
}

export function isUnitful(obj: any): obj is UnitfulNumericValue {
  return "typeName" in obj && obj.typeName === "UnitfulNumericValue";
}

function hasUnit(obj: any): obj is UnitValue | UnitfulNumericValue {
  return obj instanceof UnitValue || obj instanceof UnitfulNumericValue;
}

export type NumericValue = UnitfulNumericValue | UnitlessNumericValue;

export interface Value {
  typeName: string;
  toString(numberFormatter: NumberFormatter): string;
}

export class UnitlessNumericValue implements Value {
  public typeName = "UnitlessNumericValue";
  public value: BigNumber;

  constructor(value: BigNumber | string) {
    this.value = new BigNumber(value);
  }

  public toString(numberFormatter: NumberFormatter): string {
    return numberFormatter(this.value);
  }

  public convert(other: Value): Value {
    if (hasUnit(other)) {
      return new UnitfulNumericValue(this.value, other.unit);
    } else {
      return new UnitlessNumericValue(this.value);
    }
  }

  public changeValue(newValue: BigNumber): UnitlessNumericValue {
    return new UnitlessNumericValue(newValue);
  }
}

export class UnitfulNumericValue implements Value {
  public typeName = "UnitfulNumericValue";
  public value: BigNumber;

  constructor(value: BigNumber | string, public unit: Unit) {
    this.value = new BigNumber(value);
  }

  public toString(numberFormatter: NumberFormatter): string {
    return this.unit.format(numberFormatter(this.value));
  }

  public convert(other: Value): Value {
    if (hasUnit(other)) {
      const to = other.unit;
      if (this.unit.base !== to.base) {
        return new ErrorValue("Cannot convert unit " + this.unit.name + " to " + to.name + ".");
      }
      return new UnitfulNumericValue(
        this.value.times(this.unit.multiplier.dividedBy(to.multiplier)),
        to,
      );
    } else {
      return new UnitlessNumericValue(this.value);
    }
  }

  public changeValue(newValue: BigNumber): UnitfulNumericValue {
    return new UnitfulNumericValue(newValue, this.unit);
  }
}

export class ErrorValue implements Value {
  public typeName = "ErrorValue";

  constructor(public description: string) {}

  public toString(): string {
    return "";
  }
}

export class UnitValue implements Value {
  public typeName = "UnitValue";

  constructor(public unit: Unit) {}

  public toString(): string {
    return "";
  }
}

export class EmptyValue implements Value {
  public typeName = "EmptyValue";

  public toString(): string {
    return "";
  }
}
