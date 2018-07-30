import { numericValue, NumericValue, Value } from "./evaluate";

export interface Operator {
  associativity: "left" | "right";
  operation: Operation;
  operator: string;
  precedence: number;
  type: "Operator";
}

export type Operation =
  | { action: (a: NumericValue) => NumericValue; arity: 1 }
  | { action: (a: NumericValue, b: NumericValue) => NumericValue; arity: 2 };

const operators: { [k: string]: Operator } = {
  "*": {
    associativity: "left",
    operation: {
      arity: 2,
      action: (a: NumericValue, b: NumericValue) => numericValue(a.value.times(b.value), a.unit),
    },
    operator: "*",
    precedence: 14,
    type: "Operator",
  },
  "+": {
    associativity: "left",
    operation: {
      arity: 2,
      action: (a: NumericValue, b: NumericValue) => numericValue(a.value.plus(b.value), a.unit),
    },
    operator: "+",
    precedence: 13,
    type: "Operator",
  },
  "-": {
    associativity: "left",
    operation: {
      arity: 2,
      action: (a: NumericValue, b: NumericValue) => numericValue(a.value.minus(b.value), a.unit),
    },
    operator: "-",
    precedence: 13,
    type: "Operator",
  },
  "-u": {
    associativity: "right",
    operation: {
      arity: 1,
      action: (a: NumericValue) => numericValue(a.value.negated(), a.unit),
    },
    operator: "-u",
    precedence: 15,
    type: "Operator",
  },
  "/": {
    associativity: "left",
    operation: {
      arity: 2,
      action: (a: NumericValue, b: NumericValue) =>
        numericValue(a.value.dividedBy(b.value), a.unit),
    },
    operator: "/",
    precedence: 14,
    type: "Operator",
  },
};

export function operatorNames(): string[] {
  const names = [];
  for (const a in operators) {
    /* istanbul ignore else  */
    if (operators.hasOwnProperty(a)) {
      names.push(a);
    }
  }
  return names;
}

export function getOperator(name: string): Operator {
  return operators[name];
}
