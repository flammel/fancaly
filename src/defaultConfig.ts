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
import { Unit, unitless, UnitName } from "./unit";
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

  addUnit(config, "%", "1", "%");
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

  const percentage = config.getUnits().getUnit("%") as Unit;

  config.getOperators().addOperator(addition(percentage));
  config.getOperators().addOperator(subtraction(percentage));
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
  if (value.unit.base === "s") {
    const ms = value.value.toNumber() * value.unit.multiplier.toNumber() * 1000;
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

const addition = (percentage: Unit) =>
  binaryOperator("+", "left", 13, [
    oneDateTimeBinaryOperation(addTimeToDate),
    onlyRightWithUnitBinaryOperation(percentage, (a, b) =>
      a.dividedBy(100).multipliedBy(b.plus(bn100)),
    ),
    numericBinaryOperation((a, b) => a.plus(b)),
  ]);

const subtraction = (percentage: Unit) =>
  binaryOperator("-", "left", 13, [
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
