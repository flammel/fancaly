import { convert, unitless } from "./conversion";
import { Environment, isNumericValue, numericValue, NumericValue, Value } from "./evaluate";

export interface ValueGenerator {
  operation: (env: Environment) => Value;
  type: "ValueGenerator";
}

export function makeReadVariable(varName: string): ValueGenerator {
  return {
    type: "ValueGenerator",
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
  },
};

export function aggregatorNames(): string[] {
  const names = [];
  for (const a in aggregators) {
    /* istanbul ignore else  */
    if (aggregators.hasOwnProperty(a)) {
      names.push(a);
    }
  }
  return names;
}

export function getAggregator(name: string): ValueGenerator {
  return aggregators[name];
}
