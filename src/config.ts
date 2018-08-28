import { BigNumber } from "bignumber.js";
import { NumberFormat } from "./numberFormat";
import { Operator } from "./operator";
import { Formatter, Unit, UnitName } from "./unit";
import { Aggregator } from "./valueGenerator";

export class Operators {
  private operators: { [k: string]: Operator } = {};

  public addOperator(operator: Operator) {
    this.operators[operator.operator] = operator;
  }

  public getNames(): string[] {
    return Object.keys(this.operators);
  }

  public getOperator(name: string): Operator | undefined {
    return this.operators[name];
  }
}

export class ValueGenerators {
  private valueGenerators: { [k: string]: Aggregator } = {};

  public addAggregator(aggregator: Aggregator) {
    this.valueGenerators[aggregator.name] = aggregator;
  }

  public getAggregatorNames(): string[] {
    return Object.keys(this.valueGenerators);
  }

  public getAggregator(name: string): Aggregator | undefined {
    return this.valueGenerators[name];
  }
}

export class Units {
  private unitTable: { [key: string]: Unit } = {};

  public addUnit(base: UnitName, multiplier: string, format: Formatter, ...names: UnitName[]) {
    for (const name of names) {
      this.unitTable[name.toLowerCase()] = {
        base,
        name: names[0],
        multiplier: new BigNumber(multiplier),
        format,
      };
    }
  }

  public getNames(): string[] {
    return Object.keys(this.unitTable);
  }

  public getUnit(name: string): Unit | undefined {
    return this.unitTable[name.toLowerCase()];
  }
}

export class Config {
  private operators: Operators;
  private units: Units;
  private valueGenerators: ValueGenerators;
  private numberFormat: NumberFormat;

  constructor(numberFormat: NumberFormat) {
    this.numberFormat = numberFormat;
    this.operators = new Operators();
    this.units = new Units();
    this.valueGenerators = new ValueGenerators();
  }

  public getOperators(): Operators {
    return this.operators;
  }

  public getUnits(): Units {
    return this.units;
  }

  public getValueGenerators(): ValueGenerators {
    return this.valueGenerators;
  }

  public getNumberFormat(): NumberFormat {
    return this.numberFormat;
  }
}
