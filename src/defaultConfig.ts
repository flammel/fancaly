import { BigNumber } from "bignumber.js";
import { Config } from "./config";
import { Environment } from "./environment";
import { Formatter } from "./formatter";
import {
  binaryOperator,
  conversionOperation,
  noneWithUnitBinaryOperation,
  numericBinaryOperation,
  oneDateTimeBinaryOperation,
  onlyLeftWithUnitBinaryOperation,
  onlyRightWithUnitBinaryOperation,
  Operator,
  rightDateTimeBinaryOperation,
  unaryOperator,
} from "./operator";
import { Stack } from "./stack";
import { makeUnit, Unit, unitless } from "./unit";
import {
  DateTimeValue,
  ErrorValue,
  isDateTime,
  isEmpty,
  isNumeric,
  NumericValue,
  Value,
} from "./value";
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
  const units = config.getUnits();

  const percentage = makeUnit("%", "1", "%");
  units.addUnit(percentage);
  units.addUnit(makeUnit("g", "28.3495", "oz"));
  units.addUnit(makeUnit("ml", "29.5735", "fl oz"));

  units.addAutoConversionGroup([
    makeUnit("mm", "1", "mm"),
    makeUnit("mm", "10", "cm"),
    makeUnit("mm", "100", "dm"),
    makeUnit("mm", "1000", "m"),
    makeUnit("mm", "1000000", "km"),
  ]);
  units.addAutoConversionGroup([
    makeUnit("mm", "304.8", "ft", ["foot", "feet"]),
    makeUnit("mm", "25.4", "in", ["inch", "inches"]),
    makeUnit("mm", "1609340", ["mile", "miles"]),
  ]);
  units.addAutoConversionGroup([
    makeUnit("g", "1", "g", ["gram", "grams"]),
    makeUnit("g", "10", "dkg"),
    makeUnit("g", "1000", "kg"),
    makeUnit("g", "1000000", "t"),
  ]);
  units.addAutoConversionGroup([
    makeUnit("ml", "1", "ml"),
    makeUnit("ml", "10", "cl"),
    makeUnit("ml", "100", "dl"),
    makeUnit("ml", "1000", "l"),
  ]);
  const seconds = makeUnit("ns", "1000000000", "s", ["second", "seconds"]);
  const days = makeUnit("ns", "86400000000000", ["day", "days"]);
  units.addAutoConversionGroup([
    makeUnit("ns", "1", "ns"),
    makeUnit("ns", "1000000", "ms"),
    seconds,
    makeUnit("ns", "60000000000", ["minute", "minutes"]),
    makeUnit("ns", "3600000000000", "h", ["hour", "hours"]),
    days,
    // 30 days
    makeUnit("ns", "2592000000000000", ["month", "months"]),
    // 365 days
    makeUnit("ns", "31536000000000000", ["year", "years"]),
  ]);

  config.getOperators().addOperator(addition(percentage));
  config.getOperators().addOperator(subtraction(percentage, seconds));
  config.getOperators().addOperator(multiplication(percentage));
  config.getOperators().addOperator(division(percentage));
  config.getOperators().addOperator(asAPercentageOff(percentage));
  config.getOperators().addOperator(asAPercentageOf(percentage));
  config.getOperators().addOperator(asAPercentageOn(percentage));
  config.getOperators().addOperator(percentOnWhat(percentage));
  config.getOperators().addOperator(percentOfWhat(percentage));
  config.getOperators().addOperator(percentOffWhat(percentage));
  config.getOperators().addOperator(percentOn(percentage));
  config.getOperators().addOperator(percentOf(percentage));
  config.getOperators().addOperator(percentOff(percentage));
  config.getOperators().addOperator(convertTo);
  config.getOperators().addOperator(convertAs);
  config.getOperators().addOperator(unaryMinus);
  config.getOperators().addOperator({
    operator: "days until",
    associativity: "right",
    precedence: 10,
    operation: (stack: Stack<Value>): Value => {
      const rgt = stack.popUntil((val) => !isEmpty(val));
      if (isDateTime(rgt)) {
        const newRgt = new Date(rgt.date.getTime());
        newRgt.setHours(0);
        newRgt.setMinutes(0);
        newRgt.setSeconds(0);
        newRgt.setMilliseconds(0);
        const now = new Date();
        now.setHours(0);
        now.setMinutes(0);
        now.setSeconds(0);
        now.setMilliseconds(0);
        const diffInSeconds = new BigNumber(newRgt.getTime())
          .minus(new BigNumber(now.getTime()))
          .dividedBy(1000);
        return new NumericValue(diffInSeconds, seconds).withNewUnit(days);
      }
      return new ErrorValue(`Operation "days until" cannot be applied to operand ${rgt}.`);
    },
  });
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
  config.getValueGenerators().addAggregator({
    operation: (env) => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return new DateTimeValue(date, false);
    },
    name: "tomorrow",
  });
  config.getValueGenerators().addAggregator({
    operation: (env) => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return new DateTimeValue(date, false);
    },
    name: "yesterday",
  });

  return config;
}

const bn100 = new BigNumber(100);

const addTimeToDate = (date: Date, value: NumericValue) => {
  if (value.unit.base === "ns") {
    const ms = value.value
      .times(value.unit.multiplier)
      .dividedBy("1000000")
      .toFixed(0);
    return new Date(date.valueOf() + parseFloat(ms));
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

const addition = (percentage: Unit) =>
  binaryOperator("+", "left", 13, [
    oneDateTimeBinaryOperation(addTimeToDate),
    onlyRightWithUnitBinaryOperation(percentage, (a, b) =>
      a.dividedBy(100).multipliedBy(b.plus(bn100)),
    ),
    numericBinaryOperation((a, b) => a.plus(b)),
  ]);

const subtraction = (percentage: Unit, seconds: Unit) =>
  binaryOperator("-", "left", 13, [
    (lft: Value, rgt: Value) => {
      if (isDateTime(lft) && isDateTime(rgt)) {
        return new NumericValue(
          new BigNumber(lft.date.getTime() - rgt.date.getTime()).dividedBy(1000),
          seconds,
        );
      }
      return undefined;
    },
    onlyRightWithUnitBinaryOperation(percentage, (a, b) =>
      a.dividedBy(100).multipliedBy(bn100.minus(b)),
    ),
    numericBinaryOperation((a, b) => a.minus(b)),
  ]);

const division = (percentage: Unit) =>
  binaryOperator("/", "left", 14, [
    onlyRightWithUnitBinaryOperation(percentage, (a, b) => a.dividedBy(b.dividedBy(100))),
    numericBinaryOperation((a, b) => a.dividedBy(b)),
  ]);

const multiplication = (percentage: Unit) =>
  binaryOperator("*", "left", 14, [
    onlyRightWithUnitBinaryOperation(percentage, (a, b) => a.dividedBy(100).multipliedBy(b)),
    numericBinaryOperation((a, b) => a.times(b)),
  ]);

//
// percentage operations
//

const percentOnWhat = (percentage: Unit) =>
  binaryOperator("on what is", "left", 10, [
    onlyLeftWithUnitBinaryOperation(percentage, (a, b) =>
      b.dividedBy(a.plus(bn100)).multipliedBy(bn100),
    ),
  ]);

const percentOffWhat = (percentage: Unit) =>
  binaryOperator("off what is", "left", 10, [
    onlyLeftWithUnitBinaryOperation(percentage, (a, b) =>
      b.dividedBy(bn100.minus(a)).multipliedBy(bn100),
    ),
  ]);

const percentOfWhat = (percentage: Unit) =>
  binaryOperator("of what is", "left", 10, [
    onlyLeftWithUnitBinaryOperation(percentage, (a, b) => b.dividedBy(a).multipliedBy(bn100)),
  ]);

const percentOn = (percentage: Unit) =>
  binaryOperator("on", "left", 10, [
    onlyLeftWithUnitBinaryOperation(percentage, (a, b) =>
      b.dividedBy(bn100).multipliedBy(a.plus(bn100)),
    ),
  ]);

const percentOf = (percentage: Unit) =>
  binaryOperator("of", "left", 10, [
    onlyLeftWithUnitBinaryOperation(percentage, (a, b) => b.dividedBy(bn100).multipliedBy(a)),
  ]);

const percentOff = (percentage: Unit) =>
  binaryOperator("off", "left", 10, [
    onlyLeftWithUnitBinaryOperation(percentage, (a, b) =>
      b.dividedBy(bn100).multipliedBy(bn100.minus(a)),
    ),
  ]);

//
// "as a %" operations
//

const asAPercentageOf = (percentage: Unit) =>
  binaryOperator("as a % of", "left", 10, [
    noneWithUnitBinaryOperation(percentage, (a, b) => a.dividedBy(b).multipliedBy(bn100)),
  ]);

const asAPercentageOn = (percentage: Unit) =>
  binaryOperator("as a % on", "left", 10, [
    noneWithUnitBinaryOperation(percentage, (a, b) =>
      a
        .minus(b)
        .dividedBy(b)
        .multipliedBy(bn100),
    ),
  ]);

const asAPercentageOff = (percentage: Unit) =>
  binaryOperator("as a % off", "left", 10, [
    noneWithUnitBinaryOperation(percentage, (a, b) =>
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
