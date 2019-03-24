import { BigNumber } from "bignumber.js";
import { Config } from "./config";
import { Environment } from "./environment";
import { Formatter } from "./formatter";
import {
  binaryOperator,
  conversionOperation,
  leftPercentageBinaryOperation,
  noPercentageBinaryOperation,
  numericBinaryOperation,
  oneDateTimeBinaryOperation,
  Operator,
  rightDateTimeBinaryOperation,
  rightPercentageBinaryOperation,
  unaryOperator,
} from "./operator";
import { Stack } from "./stack";
import { percentage, unitless, UnitName } from "./unit";
import { DateTimeValue, ErrorValue, isEmpty, isNumeric, NumericValue, Value } from "./value";
import { ValueGenerator } from "./valueGenerator";

export function defaultConfig(decimalSeparator: string = "."): Config {
  BigNumber.config({
    FORMAT: {
      decimalSeparator,
      fractionGroupSeparator: "",
      fractionGroupSize: 0,
      groupSeparator: "",
      groupSize: 0,
      secondaryGroupSize: 0,
    },
  });

  const config = new Config(new Formatter(decimalSeparator));

  addUnit(config, "mm", "1", "mm");
  addUnit(config, "mm", "10", "cm");
  addUnit(config, "mm", "100", "dm");
  addUnit(config, "mm", "1000", "m");
  addUnit(config, "mm", "1000000", "km");
  addUnit(config, "mm", "304.8", "ft", "foot", "feet");
  addUnit(config, "mm", "25.4", "in", "inch");
  addUnit(config, "mm", "1609340", "mile", "miles");
  addUnit(config, "g", "1", "g", "gram", "grams");
  addUnit(config, "g", "10", "dkg");
  addUnit(config, "g", "1000", "kg");
  addUnit(config, "g", "1000000", "t");
  addUnit(config, "g", "28.3495", "oz");
  addUnit(config, "ml", "1", "ml");
  addUnit(config, "ml", "10", "cl");
  addUnit(config, "ml", "100", "dl");
  addUnit(config, "ml", "1000", "l");
  addUnit(config, "ml", "1000", "l");
  addUnit(config, "ml", "29.5735", "fl oz");
  addUnit(config, "s", "0.000000001", "ns");
  addUnit(config, "s", "0.001", "ms");
  addUnit(config, "s", "1", "s");
  addUnit(config, "s", "60", "minute", "minutes");
  addUnit(config, "s", "3600", "h");
  addUnit(config, "s", "86400", "day", "days");

  config.getOperators().addOperator(addition);
  config.getOperators().addOperator(subtraction);
  config.getOperators().addOperator(multiplication);
  config.getOperators().addOperator(division);
  config.getOperators().addOperator(unaryMinus);
  config.getOperators().addOperator(asAPercentageOff);
  config.getOperators().addOperator(asAPercentageOf);
  config.getOperators().addOperator(asAPercentageOn);
  config.getOperators().addOperator(percentOnWhat);
  config.getOperators().addOperator(percentOfWhat);
  config.getOperators().addOperator(percentOffWhat);
  config.getOperators().addOperator(percentOn);
  config.getOperators().addOperator(percentOf);
  config.getOperators().addOperator(percentOff);
  config.getOperators().addOperator(convertTo);
  config.getOperators().addOperator(convertAs);
  config
    .getOperators()
    .addOperator(binaryOperator("from", "left", 13, [rightDateTimeBinaryOperation(addTimeToDate)]));
  config.getFunctions().addFunction(roundFunction("round", BigNumber.ROUND_HALF_UP));
  config.getFunctions().addFunction(roundFunction("ceil", BigNumber.ROUND_CEIL));
  config.getFunctions().addFunction(roundFunction("floor", BigNumber.ROUND_FLOOR));
  config.getValueGenerators().addAggregator(sum);
  config.getValueGenerators().addAggregator(average);
  config.getValueGenerators().addAggregator({
    operation: (env) => new DateTimeValue(new Date(), true),
    name: "now",
  });
  config.getValueGenerators().addAggregator({
    operation: (env) => new DateTimeValue(new Date(), false),
    name: "today",
  });

  const currencies = (window as any).currencies;
  if (currencies && currencies.hasOwnProperty("rates") && currencies.hasOwnProperty("base")) {
    Object.keys(currencies.rates || {}).forEach((key) => {
      let names: string[] = [];
      if (key === "USD") {
        names = ["$", "dollar", "dollars"];
      }
      if (key === "EUR") {
        names = ["€", "euro", "euros"];
      }
      addUnit(config, currencies.base, currencies.rates[key], key, ...names);
    });
  }

  return config;
}

function addUnit(config: Config, base: UnitName, multiplier: string, ...names: UnitName[]) {
  config
    .getUnits()
    .addUnit(
      base,
      multiplier,
      (formattedNumber: string) => formattedNumber + " " + names[0],
      ...names,
    );
}

const bn100 = new BigNumber(100);
const addTimeToDate = (date: Date, value: NumericValue) => {
  const ms = getMilliseconds(value);
  if (ms) {
    return new Date(date.valueOf() + ms);
  }
  return undefined;
};

//
// ValueGenerator
//

function getAggregatorValues(env: Environment): NumericValue[] {
  const values = [];
  // reverse() operates in-place, so slice() before reversing
  for (const val of env.lines.slice().reverse()) {
    if (isNumeric(val)) {
      values.unshift(val);
    } else {
      break;
    }
  }
  return values;
}

function sumAggregator(values: NumericValue[]): Value {
  if (values.length === 0) {
    return new NumericValue("0", unitless);
  }
  return values.reduce((prev, cur) => {
    return prev.withNewValue(prev.value.plus(cur.withNewUnit(prev.unit).value));
  });
}

const sum: ValueGenerator = {
  operation: (env: Environment) => {
    return sumAggregator(getAggregatorValues(env));
  },
  name: "sum",
};

const average: ValueGenerator = {
  operation: (env: Environment) => {
    const values = getAggregatorValues(env);
    const summed = sumAggregator(values);
    if (isNumeric(summed) && values.length > 0) {
      return summed.withNewValue(summed.value.dividedBy(values.length));
    }
    return summed;
  },
  name: "average",
};

//
// unary
//

const unaryMinus: Operator = unaryOperator("-u", "right", 20, (a) => a.negated());

//
// binary
//

function getMilliseconds(value: NumericValue): number | undefined {
  if (value.unit.base === "s") {
    return value.value.toNumber() * value.unit.multiplier.toNumber() * 1000;
  }
  return undefined;
}

const addition = binaryOperator("+", "left", 13, [
  oneDateTimeBinaryOperation(addTimeToDate),
  rightPercentageBinaryOperation((a, b) => a.dividedBy(100).multipliedBy(b.plus(bn100))),
  numericBinaryOperation((a, b) => a.plus(b)),
]);

const subtraction = binaryOperator("-", "left", 13, [
  rightPercentageBinaryOperation((a, b) => a.dividedBy(100).multipliedBy(bn100.minus(b))),
  numericBinaryOperation((a, b) => a.minus(b)),
]);

const division = binaryOperator("/", "left", 14, [
  rightPercentageBinaryOperation((a, b) => a.dividedBy(b.dividedBy(100))),
  numericBinaryOperation((a, b) => a.dividedBy(b)),
]);

const multiplication = binaryOperator("*", "left", 14, [
  rightPercentageBinaryOperation((a, b) => a.dividedBy(100).multipliedBy(b)),
  numericBinaryOperation((a, b) => a.times(b)),
]);

//
// percentage operations
//

const percentOnWhat = binaryOperator("on what is", "left", 10, [
  leftPercentageBinaryOperation((a, b) => b.dividedBy(a.plus(bn100)).multipliedBy(bn100)),
]);

const percentOffWhat = binaryOperator("off what is", "left", 10, [
  leftPercentageBinaryOperation((a, b) => b.dividedBy(bn100.minus(a)).multipliedBy(bn100)),
]);

const percentOfWhat = binaryOperator("of what is", "left", 10, [
  leftPercentageBinaryOperation((a, b) => b.dividedBy(a).multipliedBy(bn100)),
]);

const percentOn = binaryOperator("on", "left", 10, [
  leftPercentageBinaryOperation((a, b) => b.dividedBy(bn100).multipliedBy(a.plus(bn100))),
]);

const percentOf = binaryOperator("of", "left", 10, [
  leftPercentageBinaryOperation((a, b) => b.dividedBy(bn100).multipliedBy(a)),
]);

const percentOff = binaryOperator("off", "left", 10, [
  leftPercentageBinaryOperation((a, b) => b.dividedBy(bn100).multipliedBy(bn100.minus(a))),
]);

//
// "as a %" operations
//

const asAPercentageOf = binaryOperator("as a % of", "left", 10, [
  noPercentageBinaryOperation(percentage, (a, b) => a.dividedBy(b).multipliedBy(bn100)),
]);

const asAPercentageOn = binaryOperator("as a % on", "left", 10, [
  noPercentageBinaryOperation(percentage, (a, b) =>
    a
      .minus(b)
      .dividedBy(b)
      .multipliedBy(bn100),
  ),
]);

const asAPercentageOff = binaryOperator("as a % off", "left", 10, [
  noPercentageBinaryOperation(percentage, (a, b) =>
    b
      .minus(a)
      .dividedBy(b)
      .multipliedBy(bn100),
  ),
]);

//
// conversion
//

const convertTo = binaryOperator("to", "left", 16, [conversionOperation()]);

const convertAs = binaryOperator("as", "left", 16, [conversionOperation()]);

//
// rounding
//

const roundFunction = (name: string, roundingMode: BigNumber.RoundingMode) => ({
  operation: (stack: Stack<Value>) => {
    const rgt = stack.popUntil((val) => !isEmpty(val));
    const lft = stack.popUntil((val) => !isEmpty(val));

    if (!isNumeric(lft) || !isNumeric(rgt)) {
      return new ErrorValue(`The function "${name}" must be applied to two numeric values`);
    }

    if (rgt.value.isNegative()) {
      const multiplier = new BigNumber(10).pow(rgt.value.abs().toNumber());
      return lft.withNewValue(
        lft.value
          .dividedBy(multiplier)
          .decimalPlaces(0, roundingMode)
          .multipliedBy(multiplier),
      );
    } else {
      return lft.withNewValue(lft.value.decimalPlaces(rgt.value.toNumber(), roundingMode));
    }
  },
  name,
});
