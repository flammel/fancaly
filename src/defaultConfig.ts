import { BigNumber } from "bignumber.js";
import { Config } from "./config";
import { Environment } from "./environment";
import { NumberFormat } from "./numberFormat";
import { Operation, Operator } from "./operator";
import { Stack } from "./stack";
import { Unit, UnitName } from "./unit";
import {
  ErrorValue,
  isEmpty,
  isNumeric,
  isUnit,
  isUnitful,
  NumericValue,
  UnitfulNumericValue,
  UnitlessNumericValue,
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

  const config = new Config(new NumberFormat(decimalSeparator));

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

  config.getOperators().addOperator(addition);
  config.getOperators().addOperator(subtraction);
  config.getOperators().addOperator(multiplication);
  config.getOperators().addOperator(division);
  config.getOperators().addOperator(unaryMinus);
  config.getOperators().addOperator(asAPercentageOff(config.getUnits().getUnit("%") as Unit));
  config.getOperators().addOperator(asAPercentageOf(config.getUnits().getUnit("%") as Unit));
  config.getOperators().addOperator(asAPercentageOn(config.getUnits().getUnit("%") as Unit));
  config.getOperators().addOperator(percentOnWhat);
  config.getOperators().addOperator(percentOfWhat);
  config.getOperators().addOperator(percentOffWhat);
  config.getOperators().addOperator(percentOn);
  config.getOperators().addOperator(percentOf);
  config.getOperators().addOperator(percentOff);
  config.getOperators().addOperator(makeConversionOperator("to"));
  config.getOperators().addOperator(makeConversionOperator("as"));

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

  config.getValueGenerators().addAggregator(sum);
  config.getValueGenerators().addAggregator(average);

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
    return new UnitlessNumericValue("0");
  }
  return values.reduce((prev, cur) => {
    const converted = cur.convert(prev);
    if (isNumeric(converted)) {
      return prev.withNewValue(prev.value.plus(converted.value));
    }
    return prev;
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

const unaryMinus: Operator = {
  associativity: "right",
  operation: unaryOperation("-u", (a) => a.negated()),
  operator: "-u",
  precedence: 20,
};

function unaryOperation(operator: string, operation: (a: BigNumber) => BigNumber): Operation {
  return (stack) => {
    const operand = stack.pop();
    if (!isNumeric(operand)) {
      return new ErrorValue(
        `Operand of "${operator}" must be a numeric value but is ${operand.typeName}.`,
      );
    }
    return operand.withNewValue(operation(operand.value));
  };
}

//
// binary
//

const addition = makeBinaryOperator(
  "+",
  13,
  (a, b) => a.plus(b),
  (a, b) => a.dividedBy(100).multipliedBy(b.plus(bn100)),
);

const subtraction = makeBinaryOperator(
  "-",
  13,
  (a, b) => a.minus(b),
  (a, b) => a.dividedBy(100).multipliedBy(bn100.minus(b)),
);

const division = makeBinaryOperator(
  "/",
  14,
  (a, b) => a.dividedBy(b),
  (a, b) => a.dividedBy(b.dividedBy(100)),
);

const multiplication = makeBinaryOperator(
  "*",
  14,
  (a, b) => a.times(b),
  (a, b) => a.dividedBy(100).multipliedBy(b),
);

type BinaryOperation = (a: BigNumber, b: BigNumber) => BigNumber;

function makeBinaryOperator(
  symbol: string,
  precedence: number,
  operation: BinaryOperation,
  operationPercent: BinaryOperation,
): Operator {
  return {
    associativity: "left",
    operation: binaryOperation(symbol, operation, operationPercent),
    operator: symbol,
    precedence,
  };
}

function binaryOperation(
  operator: string,
  operation: BinaryOperation,
  operationPercent: BinaryOperation,
): Operation {
  return (stack) => {
    const rgtOperand = firstNonEmpty(stack);
    const lftOperand = firstNonEmpty(stack);
    if (!isNumeric(lftOperand) || !isNumeric(rgtOperand)) {
      return new ErrorValue(
        `Operands of "${operator}" must be numeric values but are ${lftOperand.typeName} and ${
          rgtOperand.typeName
        }.`,
      );
    }

    if (
      isUnitful(rgtOperand) &&
      rgtOperand.unit.name === "%" &&
      (!isUnitful(lftOperand) || lftOperand.unit.name !== "%")
    ) {
      return lftOperand.withNewValue(operationPercent(lftOperand.value, rgtOperand.value));
    }

    const convertedRgt = rgtOperand.convert(lftOperand);
    if (isNumeric(convertedRgt)) {
      return convertedRgt.withNewValue(operation(lftOperand.value, convertedRgt.value));
    }
    return convertedRgt;
  };
}

//
// percentage operations
//

const percentOnWhat = percentageOperation("on what is", (a, b) =>
  b.dividedBy(a.plus(bn100)).multipliedBy(bn100),
);
const percentOffWhat = percentageOperation("off what is", (a, b) =>
  b.dividedBy(bn100.minus(a)).multipliedBy(bn100),
);
const percentOfWhat = percentageOperation("of what is", (a, b) =>
  b.dividedBy(a).multipliedBy(bn100),
);
const percentOn = percentageOperation("on", (a, b) =>
  b.dividedBy(bn100).multipliedBy(a.plus(bn100)),
);
const percentOf = percentageOperation("of", (a, b) => b.dividedBy(bn100).multipliedBy(a));
const percentOff = percentageOperation("off", (a, b) =>
  b.dividedBy(bn100).multipliedBy(bn100.minus(a)),
);

function percentageOperation(name: string, operation: BinaryOperation): Operator {
  return {
    associativity: "left",
    operation: (stack) => {
      const rgtOperand = firstNonEmpty(stack);
      const lftOperand = firstNonEmpty(stack);
      if (!isNumeric(lftOperand) || !isNumeric(rgtOperand)) {
        return new ErrorValue(
          `Operands of "${name}" must be numeric values but are ${lftOperand.typeName} and ${
            rgtOperand.typeName
          }.`,
        );
      }

      if (!isUnitful(lftOperand) || lftOperand.unit.name !== "%") {
        return new ErrorValue(
          `Left operand of "${name}" must be a percentage but is ${lftOperand.typeName}`,
        );
      }

      if (isUnitful(rgtOperand) && rgtOperand.unit.name === "%") {
        return new ErrorValue(`Right operand of "${name}" must not be a percentage`);
      }

      return rgtOperand.withNewValue(operation(lftOperand.value, rgtOperand.value));
    },
    operator: name,
    precedence: 10,
  };
}

//
// "as a %" operations
//

const asAPercentageOf = (percentageUnit: Unit) =>
  asAPercentage("as a % of", (a, b) => a.dividedBy(b).multipliedBy(bn100), percentageUnit);

const asAPercentageOn = (percentageUnit: Unit) =>
  asAPercentage(
    "as a % on",
    (a, b) =>
      a
        .minus(b)
        .dividedBy(b)
        .multipliedBy(bn100),
    percentageUnit,
  );

const asAPercentageOff = (percentageUnit: Unit) =>
  asAPercentage(
    "as a % off",
    (a, b) =>
      b
        .minus(a)
        .dividedBy(b)
        .multipliedBy(bn100),
    percentageUnit,
  );

const asAPercentage = (
  name: string,
  operation: BinaryOperation,
  percentageUnit: Unit,
): Operator => ({
  associativity: "left",
  operation: (stack) => {
    const rgtOperand = firstNonEmpty(stack);
    const lftOperand = firstNonEmpty(stack);
    if (!isNumeric(lftOperand) || !isNumeric(rgtOperand)) {
      return new ErrorValue(
        `Operands of "${name}" must be numeric values but are ${lftOperand.typeName} and ${
          rgtOperand.typeName
        }.`,
      );
    }

    if (isUnitful(lftOperand) && lftOperand.unit.name === "%") {
      return new ErrorValue(`Left operand of "${name}" must not be a percentage`);
    }

    if (isUnitful(rgtOperand) && rgtOperand.unit.name === "%") {
      return new ErrorValue(`Right operand of "${name}" must not be a percentage`);
    }

    return new UnitfulNumericValue(operation(lftOperand.value, rgtOperand.value), percentageUnit);
  },
  operator: name,
  precedence: 10,
});

//
// conversion
//

function makeConversionOperator(symbol: string): Operator {
  return {
    associativity: "left",
    operation: (stack) => {
      const unit = firstNonEmpty(stack);
      if (!isUnit(unit)) {
        return new ErrorValue(`Operand of "${symbol}" must be a unit but is ${unit.typeName}.`);
      }
      const operand = firstNonEmpty(stack);
      if (!isNumeric(operand)) {
        return new ErrorValue(
          `Operand of "${symbol}" must be a numeric value but is ${operand.typeName}.`,
        );
      }
      // If the operand cannot be converted to the unit, then the first call
      // of convert will return a unitless value, which the second call to
      // convert will transform into a value with the unit.
      // If the first call to convert succeeds, then the second one will not
      // change anything.
      return operand.convert(unit).convert(unit);
    },
    operator: symbol,
    precedence: 16,
  };
}

//
// utilities
//

function firstNonEmpty(stack: Stack<Value>): Value {
  return stack.popUntil((val) => !isEmpty(val));
}

const bn100 = new BigNumber(100);
