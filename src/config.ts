import { Formatter } from "./formatter";
import { Func } from "./function";
import { Operator } from "./operator";
import { Unit } from "./unit";
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

export class Functions {
  private functions: { [k: string]: Func } = {};

  public addFunction(func: Func) {
    this.functions[func.name] = func;
  }

  public getNames(): string[] {
    return Object.keys(this.functions);
  }

  public getFunction(name: string): Func | undefined {
    return this.functions[name];
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
  private groups: { [key: string]: Unit[] } = {};

  public addUnit(unit: Unit) {
    this.unitTable[unit.defaultName.singular.toLowerCase()] = unit;
    this.unitTable[unit.defaultName.plural.toLowerCase()] = unit;
    for (const name of unit.synonyms) {
      this.unitTable[name.singular.toLowerCase()] = unit;
      this.unitTable[name.plural.toLowerCase()] = unit;
    }
  }

  public addAutoConversionGroup(units: Unit[]) {
    for (const unit of units) {
      this.addUnit(unit);
      this.groups[unit.defaultName.singular] = units;
    }
  }

  public getAutoConversionGroup(unit: Unit): Unit[] {
    const group = this.groups[unit.defaultName.singular];
    if (group === undefined) {
      return [];
    } else {
      return group;
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
  private functions: Functions;
  private units: Units;
  private valueGenerators: ValueGenerators;
  private formatter: Formatter;

  constructor(formatter: Formatter) {
    this.formatter = formatter;
    this.operators = new Operators();
    this.functions = new Functions();
    this.units = new Units();
    this.valueGenerators = new ValueGenerators();
  }

  public getOperators(): Operators {
    return this.operators;
  }

  public getFunctions(): Functions {
    return this.functions;
  }

  public getUnits(): Units {
    return this.units;
  }

  public getValueGenerators(): ValueGenerators {
    return this.valueGenerators;
  }

  public getFormatter(): Formatter {
    return this.formatter;
  }
}
