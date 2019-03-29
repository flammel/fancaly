import { BigNumber } from "bignumber.js";

export class UnitName {
  constructor(public singular: string, public plural: string = singular) {}

  public toString(): string {
    return this.singular;
  }
}

export class Unit {
  constructor(
    public base: string,
    public multiplier: BigNumber,
    public defaultName: UnitName,
    public synonyms: UnitName[] = [],
  ) {}

  public formatSingular(str: string): string {
    return `${str} ${this.defaultName.singular}`.trim();
  }

  public formatPlural(str: string): string {
    return `${str} ${this.defaultName.plural}`.trim();
  }
}

function makeUnitName(name: string | [string, string]): UnitName {
  if (name instanceof Array) {
    return new UnitName(name[0], name[1]);
  } else {
    return new UnitName(name);
  }
}

export function makeUnit(
  base: string,
  multiplier: BigNumber | string,
  defaultName: string | [string, string],
  ...synonyms: Array<string | [string, string]>
): Unit {
  return new Unit(
    base,
    new BigNumber(multiplier),
    makeUnitName(defaultName),
    synonyms.map(makeUnitName),
  );
}

export const unitless = new Unit("", new BigNumber("1"), new UnitName(""));
