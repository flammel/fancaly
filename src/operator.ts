import { Stack } from "./stack";
import { Unit } from "./unit";
import {
  ErrorValue,
  isEmpty,
  isNumeric,
  isUnit,
  isUnitful,
  UnitfulNumericValue,
  Value,
} from "./value";

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
type PartialBinaryOperation = (lft: Value, rgt: Value) => Value | undefined;

export function leftPercentageBinaryOperation(operation: BinaryOperation): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt) && hasUnit(lft, "%") && !hasUnit(rgt, "%")) {
      return rgt.withNewValue(operation(lft.value, rgt.value));
    }
    return undefined;
  };
}

export function rightPercentageBinaryOperation(operation: BinaryOperation): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt) && !hasUnit(lft, "%") && hasUnit(rgt, "%")) {
      return lft.withNewValue(operation(lft.value, rgt.value));
    }
    return undefined;
  };
}

export function noPercentageBinaryOperation(
  percentageUnit: Unit,
  operation: BinaryOperation,
): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt) && !hasUnit(lft, "%") && !hasUnit(rgt, "%")) {
      return new UnitfulNumericValue(operation(lft.value, rgt.convert(lft).value), percentageUnit);
    }
    return undefined;
  };
}

export function numericBinaryOperation(operation: BinaryOperation): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isNumeric(rgt)) {
      const convertedRgt = rgt.convert(lft);
      return convertedRgt.withNewValue(operation(lft.value, convertedRgt.value));
    }
    return undefined;
  };
}

export function conversionOperation(): PartialBinaryOperation {
  return (lft: Value, rgt: Value) => {
    if (isNumeric(lft) && isUnit(rgt)) {
      return lft.convert(rgt).convert(rgt);
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
        `Operation "${operator}" cannot be applied to operands ${lft.typeName} and ${
          rgt.typeName
        }.`,
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
          `Operand of "${operator}" must be a numeric value but is ${operand.typeName}.`,
        );
      }
      return operand.withNewValue(operation(operand.value));
    },
  };
}

function hasUnit(a: Value, unitName: string): boolean {
  return isUnitful(a) && a.unit.name === unitName;
}
