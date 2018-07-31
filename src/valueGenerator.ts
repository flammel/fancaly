import { convert, unitless } from "./conversion";
import { Environment, isNumericValue, numericValue, NumericValue, Value } from "./evaluate";

export interface ValueGenerator {
  operation: (env: Environment) => Value;
  type: "ValueGenerator";
  name: string;
}

export function makeReadVariable(varName: string): ValueGenerator {
  return {
    type: "ValueGenerator",
    name: "readVariable",
    operation: (env: Environment) => {
      if (env.variables[varName] !== undefined) {
        return env.variables[varName];
      } else {
        return { type: "empty" };
      }
    },
  };
}

function getAggregatorValues(env: Environment): NumericValue[] {
  const values = [];
  // reverse() operates in-place, so slice() before reversing
  for (const val of env.lines.slice().reverse()) {
    if (val.type === "number") {
      values.unshift(val);
    } else {
      break;
    }
  }
  return values;
}

function sumAggregator(values: NumericValue[]): Value {
  if (values.length === 0) {
    return numericValue("0", unitless);
  }
  return values.reduce((prev, cur) => {
    if (isNumericValue(prev)) {
      const converted = convert(cur, prev.unit);
      if (isNumericValue(converted)) {
        return numericValue(prev.value.plus(converted.value), prev.unit);
      }
    }
    return prev;
  });
}

const aggregators: { [k: string]: ValueGenerator } = {
  sum: {
    operation: (env: Environment) => {
      return sumAggregator(getAggregatorValues(env));
    },
    type: "ValueGenerator",
    name: "sum",
  },
  average: {
    operation: (env: Environment) => {
      const values = getAggregatorValues(env);
      const sum = sumAggregator(values);
      if (isNumericValue(sum)) {
        return numericValue(sum.value.dividedBy(values.length), sum.unit);
      }
      return sum;
    },
    type: "ValueGenerator",
    name: "average",
  },
};

export function aggregatorNames(): string[] {
  return Object.keys(aggregators);
}

export function getAggregator(name: string): ValueGenerator {
  return aggregators[name];
}
