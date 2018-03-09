import { Value, NumericValue, numericValue } from "./value";

export interface Operator {
  associativity: Associativity;
  operation: (a: NumericValue, b: NumericValue) => NumericValue;
  operator: string;
  precedence: number;
  type: "Operator";
}
type Associativity = "left" | "right";
type Operators = { [k: string]: Operator };

const operators: Operators = {
  "*": {
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.times(b.value), a.unit),
    operator: "*",
    precedence: 14,
    type: "Operator",
  },
  "+": {
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.plus(b.value), a.unit),
    operator: "+",
    precedence: 13,
    type: "Operator",
  },
  "-": {
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.minus(b.value), a.unit),
    operator: "-",
    precedence: 13,
    type: "Operator",
  },
  "/": {
    associativity: "left",
    operation: (a: NumericValue, b: NumericValue) =>
      numericValue(a.value.dividedBy(b.value), a.unit),
    operator: "/",
    precedence: 14,
    type: "Operator",
  },
};

export function isOperator(a: any): a is Operator {
  return a && a.type === "Operator";
}

export function isOperatorName(a: any): boolean {
  return a && a in operators;
}

export function getOperator(name: string): Operator {
  return operators[name];
}
