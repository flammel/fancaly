import { unitless } from "./unit";
import { NumericValue, numericValue, Value } from "./value";

type Associativity = "left" | "right";

export interface Operator {
  arity: number;
  associativity: Associativity;
  operation: (a: NumericValue, b: NumericValue) => NumericValue;
  operator: string;
  precedence: number;
  type: "Operator";
}

const operators: { [k: string]: Operator } = {
  "*": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.times(b.value), a.unit),
    operator: "*",
    precedence: 14,
    type: "Operator",
  },
  "+": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.plus(b.value), a.unit),
    operator: "+",
    precedence: 13,
    type: "Operator",
  },
  "-": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.minus(b.value), a.unit),
    operator: "-",
    precedence: 13,
    type: "Operator",
  },
  "/": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.dividedBy(b.value), a.unit),
    operator: "/",
    precedence: 14,
    type: "Operator",
  },
};

export function operatorNames(): string[] {
  const names = [];
  for (const a in operators) {
    if (operators.hasOwnProperty(a)) {
      names.push(a);
    }
  }
  return names;
}

export function isOperator(a: any): a is Operator {
  return a && a.type === "Operator";
}

export function isOperatorName(a: any): boolean {
  return a && a in operators;
}

export function getOperator(name: string): Operator {
  return operators[name];
}

//
//
//

export interface Assignment {
  type: "assignment";
  value: string;
}

export function isAssignment(a: any): a is Assignment {
  return a && a.type === "assignment";
}

export function makeAssignment(varName: string): Assignment {
  return { type: "assignment", value: varName };
}

//
//
//

export interface ReadVariable {
  type: "ReadVariable";
  value: string;
}

export function isReadVariable(a: any): a is ReadVariable {
  return a && a.type === "ReadVariable";
}

export function makeReadVariable(varName: string): ReadVariable {
  return { type: "ReadVariable", value: varName };
}

//
//
//

export interface Aggregator {
  operation: (values: NumericValue[]) => NumericValue;
  operator: string;
  type: "Aggregator";
}

const aggregators: { [k: string]: Aggregator } = {
  sum: {
    operation: (values: NumericValue[]) => {
      if (values.length === 0) {
        return numericValue("0", unitless());
      }
      return values
        .slice(1)
        .reduce(
          (prev, cur) => numericValue(prev.value.plus(cur.value), prev.unit),
          values[0],
        );
    },
    operator: "sum",
    type: "Aggregator",
  },
  average: {
    operation: (values: NumericValue[]) => {
      if (values.length === 0) {
        return numericValue("0", unitless());
      }
      const sum = values
        .slice(1)
        .reduce(
          (prev, cur) => numericValue(prev.value.plus(cur.value), prev.unit),
          values[0],
        );

      return numericValue(sum.value.dividedBy(values.length), sum.unit);
    },
    operator: "average",
    type: "Aggregator",
  },
};

export function aggregatorNames(): string[] {
  const names = [];
  for (const a in aggregators) {
    if (aggregators.hasOwnProperty(a)) {
      names.push(a);
    }
  }
  return names;
}

export function isAggregator(a: any): a is Aggregator {
  return a && a.type === "Aggregator";
}

export function isAggregatorName(a: any): boolean {
  return a && a in aggregators;
}

export function getAggregator(name: string): Aggregator {
  return aggregators[name];
}
