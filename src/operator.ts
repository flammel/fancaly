import { Environment } from "./evaluate";
import { unitless } from "./unit";
import { isNumericValue, noValue, NumericValue, numericValue, Value } from "./value";

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

export function makeReadVariable(varName: string): ValueGenerator {
  return { type: "ValueGenerator", name: varName, operation: (env: Environment) => {
    if (env.variables[varName] !== undefined) {
      return env.variables[varName];
    } else {
      return noValue();
    }
  },
};
}

//
//
//

export interface ValueGenerator {
  operation: (env: Environment) => Value;
  name: string;
  type: "ValueGenerator";
}

//
//
//

function getAggregatorValues(env: Environment): NumericValue[] {
  const values = [];
  for (const val of env.lines.reverse()) {
    if (isNumericValue(val)) {
      values.unshift(val);
    }
    if (val.type === "NoValue") {
      break;
    }
  }
  return values;
}

const aggregators: { [k: string]: ValueGenerator } = {
  sum: {
    operation: (env: Environment) => {
      const values = getAggregatorValues(env);
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
    name: "sum",
    type: "ValueGenerator",
  },
  average: {
    operation: (env: Environment) => {
      const values = getAggregatorValues(env);
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
    name: "average",
    type: "ValueGenerator",
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

export function getAggregator(name: string): ValueGenerator {
  return aggregators[name];
}
