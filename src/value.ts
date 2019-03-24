import { BigNumber } from "bignumber.js";
import { Unit, unitless } from "./unit";

export function isError(obj: any): obj is ErrorValue {
  return obj instanceof ErrorValue;
}

export function isEmpty(obj: any): obj is EmptyValue {
  return obj instanceof EmptyValue;
}

export function isNumeric(obj: any): obj is NumericValue {
  return obj instanceof NumericValue;
}

export function isUnit(obj: any): obj is UnitValue {
  return obj instanceof UnitValue;
}

export function isDateTime(obj: any): obj is DateTimeValue {
  return obj instanceof DateTimeValue;
}

export function isResult(obj: any): boolean {
  return isNumeric(obj) || isDateTime(obj);
}

export type Value = DateTimeValue | NumericValue | ErrorValue | EmptyValue | UnitValue;

export class DateTimeValue {
  constructor(public date: Date, public withTime: boolean) {}

  public withNewValue(newValue: Date): DateTimeValue {
    return new DateTimeValue(newValue, this.withTime);
  }

  public toString(): string {
    return `DateTimeValue(${this.date.toISOString()}, ${this.withTime})`;
  }
}

export class NumericValue {
  public value: BigNumber;

  constructor(value: BigNumber | string, public unit: Unit) {
    this.value = new BigNumber(value);
  }

  public withNewUnit(newUnit: Unit): NumericValue {
    if (this.unit.base === newUnit.base) {
      return new NumericValue(
        this.value.times(this.unit.multiplier.dividedBy(newUnit.multiplier)),
        newUnit,
      );
    } else if (this.unit === unitless) {
      return new NumericValue(this.value, newUnit);
    } else {
      return new NumericValue(this.value, unitless);
    }
  }

  public withNewValue(newValue: BigNumber): NumericValue {
    return new NumericValue(newValue, this.unit);
  }

  public toString(): string {
    return `NumericValue(${this.value.valueOf()}, ${this.unit.name})`;
  }
}

export class ErrorValue {
  constructor(public description: string) {}
  public toString(): string {
    return `ErrorValue(${this.description})`;
  }
}

export class UnitValue {
  constructor(public unit: Unit) {}
  public toString(): string {
    return `UnitValue(${this.unit.name})`;
  }
}

export class EmptyValue {
  public toString(): string {
    return `EmptyValue()`;
  }
}
