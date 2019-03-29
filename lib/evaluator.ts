import { BigNumber } from "bignumber.js";
import { Environment } from "./environment";
import { Func } from "./function";
import { Operator } from "./operator";
import { RPN, RPNItem } from "./parser";
import { Stack } from "./stack";
import { Unit, unitless } from "./unit";
import { assertNever } from "./util";
import {
  DateTimeValue,
  EmptyValue,
  ErrorValue,
  isDateTime,
  isEmpty,
  isError,
  isNumeric,
  NumericValue,
  UnitValue,
  Value,
} from "./value";
import { ValueGenerator } from "./valueGenerator";

type ErrorMessage = string;

export class Evaluator {
  public evaluate(rpn: RPN, env: Environment): Value {
    if (rpn.length() === 0) {
      env.lines.push(new EmptyValue());
      return new EmptyValue();
    }

    const stack: Stack<Value> = new Stack(new ErrorValue("Empty stack"));
    while (rpn.next().type !== "done") {
      const result = this.tryEvaluators(stack, env, rpn.current() as RPNItem);
      if (result !== null) {
        return new ErrorValue(result);
      }
    }

    const final = this.getResultFromStack(stack);
    if (!isError(final)) {
      env.lines.push(final);
    }
    return final;
  }

  private evaluateOperator(stack: Stack<Value>, operator: Operator): ErrorMessage | null {
    const result = operator.operation(stack);
    if (isError(result)) {
      return result.description;
    }
    stack.push(result);
    return null;
  }

  private evaluateFunction(stack: Stack<Value>, func: Func): ErrorMessage | null {
    const result = func.operation(stack);
    if (isError(result)) {
      return result.description;
    }
    stack.push(result);
    return null;
  }

  private evaluateAssignment(
    stack: Stack<Value>,
    env: Environment,
    variableName: string,
  ): ErrorMessage | null {
    const varValue = stack.peek();
    if (isNumeric(varValue)) {
      env.variables[variableName] = varValue;
      return null;
    } else {
      return `Top of stack at the point of assignment must be a numeric value, but is ${varValue}.`;
    }
  }

  private evaluateValueGenerator(
    stack: Stack<Value>,
    env: Environment,
    generator: ValueGenerator,
  ): ErrorMessage | null {
    stack.push(generator.operation(env));
    return null;
  }

  private evaluateNumber(stack: Stack<Value>, value: BigNumber): ErrorMessage | null {
    stack.push(new NumericValue(value, unitless));
    return null;
  }

  private evaluateDate(stack: Stack<Value>, date: Date): ErrorMessage | null {
    stack.push(new DateTimeValue(date, false));
    return null;
  }

  private evaluateTime(
    stack: Stack<Value>,
    hours: BigNumber,
    minutes: BigNumber,
    seconds?: BigNumber,
  ): ErrorMessage | null {
    const date = new Date(
      1970,
      0,
      1,
      hours.toNumber(),
      minutes.toNumber(),
      seconds ? seconds.toNumber() : 0,
    );
    stack.push(new DateTimeValue(date, true));
    return null;
  }

  private evaluateUnit(stack: Stack<Value>, unit: Unit): ErrorMessage | null {
    const lastVal = stack.peek();
    if (isNumeric(lastVal) && lastVal.unit === unitless) {
      stack.pop();
      stack.push(new NumericValue(lastVal.value, unit));
    } else {
      stack.push(new UnitValue(unit));
    }
    return null;
  }

  private tryEvaluators(
    stack: Stack<Value>,
    env: Environment,
    currentItem: RPNItem,
  ): ErrorMessage | null {
    switch (currentItem.type) {
      case "operator":
        return this.evaluateOperator(stack, currentItem.operator);
      case "function":
        return this.evaluateFunction(stack, currentItem.function);
      case "assignment":
        return this.evaluateAssignment(stack, env, currentItem.variableName);
      case "valueGenerator":
        return this.evaluateValueGenerator(stack, env, currentItem.generator);
      case "number":
        return this.evaluateNumber(stack, currentItem.value);
      case "unit":
        return this.evaluateUnit(stack, currentItem.unit);
      case "date":
        return this.evaluateDate(stack, currentItem.date);
      case "time":
        return this.evaluateTime(
          stack,
          currentItem.hours,
          currentItem.minutes,
          currentItem.seconds,
        );
      /* istanbul ignore next */
      default:
        assertNever(currentItem);
        return null;
    }
  }

  private getResultFromStack(stack: Stack<Value>): Value {
    const result = stack.popUntil((val) => !isEmpty(val));
    if (isNumeric(result) || isDateTime(result)) {
      return result;
    } else {
      return new ErrorValue(
        `Top of stack at the end of RPN evaluation must be a numeric value, but is ${result}.`,
      );
    }
  }
}
