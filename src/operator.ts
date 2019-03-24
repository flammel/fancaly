import { Stack } from "./stack";
import { Unit, unitless } from "./unit";
import { ErrorValue, isDateTime, isEmpty, isNumeric, isUnit, NumericValue, Value } from "./value";

export type Operation = (stack: Stack<Value>) => Value;

export interface Operator {
  associativity: Associativity;
  operation: Operation;
  operator: string;
  precedence: number;
}

type Associativity = "left" | "right";
type UnaryOperation = (a: BigNumber) => BigNumber;
type BinaryOperation = (lft: BigNumber, rgt: BigNumber) => BigNumber;
type DateTimeBinaryOperation = (date: Date, value: NumericValue) => Date | undefined;
type PartialBinaryOperation = (lft: Value, rgt: Value) => Value | undefined;

export function rightDateTimeBinaryOperation(
  operation: DateTimeBinaryOperation,
): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isDateTime(rgt) && isNumeric(lft)) {
      const newValue = operation(rgt.date, lft);
      if (newValue) {
        return rgt.withNewValue(newValue);
      }
    }
    return undefined;
  };
}

export function oneDateTimeBinaryOperation(
  operation: DateTimeBinaryOperation,
): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isDateTime(lft) && isNumeric(rgt)) {
      const newValue = operation(lft.date, rgt);
      if (newValue) {
        return lft.withNewValue(newValue);
      }
    }
    if (isDateTime(rgt) && isNumeric(lft)) {
      const newValue = operation(rgt.date, lft);
      if (newValue) {
        return rgt.withNewValue(newValue);
      }
    }
    return undefined;
  };
}

export function onlyLeftWithUnitBinaryOperation(
  unit: Unit,
  operation: BinaryOperation,
): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt) && lft.unit === unit && rgt.unit !== unit) {
      return rgt.withNewValue(operation(lft.value, rgt.value));
    }
    return undefined;
  };
}

export function onlyRightWithUnitBinaryOperation(
  unit: Unit,
  operation: BinaryOperation,
): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt) && lft.unit !== unit && rgt.unit === unit) {
      return lft.withNewValue(operation(lft.value, rgt.value));
    }
    return undefined;
  };
}

export function noneWithUnitBinaryOperation(
  unit: Unit,
  operation: BinaryOperation,
): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt) && lft.unit !== unit && rgt.unit !== unit) {
      return new NumericValue(operation(lft.value, rgt.withNewUnit(lft.unit).value), unit);
    }
    return undefined;
  };
}

export function numericBinaryOperation(operation: BinaryOperation): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt)) {
      const convertedRgt = rgt.withNewUnit(lft.unit);
      return convertedRgt.withNewValue(operation(lft.value, convertedRgt.value));
    }
    return undefined;
  };
}

export function conversionOperation(): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isUnit(rgt)) {
      return lft.withNewUnit(rgt.unit).withNewUnit(rgt.unit);
    }
    return undefined;
  };
}

export function binaryOperator(
  operator: string,
  associativity: Associativity,
  precedence: number,
  operations: PartialBinaryOperation[],
): Operator {
  return {
    operator,
    associativity,
    precedence,
    operation: (stack: Stack<Value>): Value => {
      const rgt = stack.popUntil((val) => !isEmpty(val));
      const lft = stack.popUntil((val) => !isEmpty(val));
      for (const operation of operations) {
        const result = operation(lft, rgt);
        if (result !== undefined) {
          return result;
        }
      }
      return new ErrorValue(
        `Operation "${operator}" cannot be applied to operands ${lft} and ${rgt}.`,
      );
    },
  };
}

export function unaryOperator(
  operator: string,
  associativity: Associativity,
  precedence: number,
  operation: UnaryOperation,
): Operator {
  return {
    operator,
    associativity,
    precedence,
    operation: (stack: Stack<Value>): Value => {
      const operand = stack.pop();
      if (!isNumeric(operand)) {
        return new ErrorValue(
          `Operand of "${operator}" must be a numeric value but is ${operand}.`,
        );
      }
      return operand.withNewValue(operation(operand.value));
    },
  };
}
