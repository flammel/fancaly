import { numericValue, NumericValue, Value } from "./evaluate";

export interface Operator {
  arity: number;
  associativity: "left" | "right";
  operation: (a: NumericValue, b: NumericValue) => NumericValue;
  operator: string;
  precedence: number;
  type: "Operator";
}

const operators: { [k: string]: Operator } = {
  "*": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) => numericValue(a.value.times(b.value), a.unit),
    operator: "*",
    precedence: 14,
    type: "Operator",
  },
  "+": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) => numericValue(a.value.plus(b.value), a.unit),
    operator: "+",
    precedence: 13,
    type: "Operator",
  },
  "-": {
    arity: 2,
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) => numericValue(a.value.minus(b.value), a.unit),
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

export function getOperator(name: string): Operator {
  return operators[name];
}
