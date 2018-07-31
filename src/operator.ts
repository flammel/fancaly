import { BigNumber } from "bignumber.js";

import { convert, percent, Unit } from "./conversion";
import { errorValue, isNumericValue, numericValue, NumericValue, Value } from "./evaluate";
import { Stack } from "./stack";

export interface Operator {
  associativity: "left" | "right";
  operation: Operation;
  operator: string;
  precedence: number;
  type: "Operator";
}

type Operation = (stack: Stack<Value>) => Value;
type BinaryOperation = (a: NumericValue, b: NumericValue) => Value;

function binaryOperation(
  operator: string,
  operation: BinaryOperation,
  operationPercent: BinaryOperation,
): Operation {
  return (stack) => {
    const rgtOperand = stack.pop();
    const lftOperand = stack.pop();
    if (!isNumericValue(lftOperand) || !isNumericValue(rgtOperand)) {
      return errorValue(
        `Operands of "${operator}" must be numeric values but are ${
          lftOperand ? lftOperand.type : "undefined"
        } and ${rgtOperand ? rgtOperand.type : "undefined"}.`,
      );
    }
    if (lftOperand.unit !== percent && rgtOperand.unit === percent) {
      return operationPercent(lftOperand, rgtOperand);
    }

    const convertedRgt = convert(rgtOperand, lftOperand.unit);
    if (!isNumericValue(convertedRgt)) {
      return errorValue(
        `Could not convert ${rgtOperand.unit.name} in rgt operand to unit ${
          lftOperand.unit.name
        } of lft operand`,
      );
    }
    return operation(lftOperand, convertedRgt);
  };
}

function unaryOperation(operator: string, operation: (a: NumericValue) => Value): Operation {
  return (stack) => {
    const operand = stack.pop();
    if (!isNumericValue(operand)) {
      return errorValue(
        `Operand of "${operator}" must be a numeric value but is ${
          operand ? operand.type : "undefined"
        }.`,
      );
    }
    return operation(operand);
  };
}

function conversionOperation(operator: string): Operation {
  return (stack) => {
    const unit = stack.pop();
    if (!unit || unit.type !== "unit") {
      return errorValue(
        `Operand of "${operator}" must be a unit but is ${unit ? unit.type : "undefined"}.`,
      );
    }
    const operand = stack.pop();
    if (!isNumericValue(operand)) {
      return errorValue(
        `Operand of "${operator}" must be a numeric value but is ${
          operand ? operand.type : "undefined"
        }.`,
      );
    }
    return convert(operand, unit.unit);
  };
}

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
    type: "Operator",
  };
}

function makeConversionOperator(symbol: string): Operator {
  return {
    associativity: "left",
    operation: conversionOperation(symbol),
    operator: symbol,
    precedence: 16,
    type: "Operator",
  };
}

const operators: { [k: string]: Operator } = {
  "*": makeBinaryOperator(
    "*",
    14,
    (a, b) => numericValue(a.value.times(b.value), a.unit),
    (a, b) => numericValue(a.value.dividedBy(100).multipliedBy(b.value), a.unit),
  ),
  "+": makeBinaryOperator(
    "+",
    13,
    (a, b) => numericValue(a.value.plus(b.value), a.unit),
    (a, b) =>
      numericValue(a.value.dividedBy(100).multipliedBy(b.value.plus(new BigNumber(100))), a.unit),
  ),
  "-": makeBinaryOperator(
    "-",
    13,
    (a, b) => numericValue(a.value.minus(b.value), a.unit),
    (a, b) =>
      numericValue(a.value.dividedBy(100).multipliedBy(new BigNumber(100).minus(b.value)), a.unit),
  ),
  "/": makeBinaryOperator(
    "/",
    14,
    (a, b) => numericValue(a.value.dividedBy(b.value), a.unit),
    (a, b) => numericValue(a.value.dividedBy(b.value.dividedBy(100)), a.unit),
  ),
  "-u": {
    associativity: "right",
    operation: unaryOperation("-u", (a: NumericValue) => numericValue(a.value.negated(), a.unit)),
    operator: "-u",
    precedence: 20,
    type: "Operator",
  },
  to: makeConversionOperator("to"),
  as: makeConversionOperator("as"),
};

export function operatorNames(): string[] {
  return Object.keys(operators);
}

export function getOperator(name: string): Operator {
  return operators[name];
}
