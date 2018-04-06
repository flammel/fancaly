import { NumericValue, numericValue, Value } from "./value";

export interface Operator {
  associativity: Associativity;
  operation: (a: NumericValue, b: NumericValue) => NumericValue;
  operator: string;
  precedence: number;
  type: "Operator";
}
type Associativity = "left" | "right";
interface Operators {
  [k: string]: Operator;
}

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
