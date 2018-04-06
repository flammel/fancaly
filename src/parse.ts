import { Token, Tokens } from "./lex";
import {
  Assignment,
  getOperator,
  isAssignment,
  isOperator,
  isOperatorName,
  makeAssignment,
  makeReadVariable,
  Operator,
  ReadVariable,
} from "./operator";
import { Stack } from "./stack";
import { isUnit, Unit, unitless, units } from "./unit";
import { errorValue, numericValue, Value } from "./value";

export type ParserResult =
  | { type: "success"; rpn: RPN }
  | { type: "error"; description: string; rpn: RPN };

export type RPNItem = Value | Operator | Unit | Assignment | ReadVariable;
export type RPN = RPNItem[];

type StackItem = Operator | LeftBracketOnStack | Assignment;
interface LeftBracketOnStack {
  type: "(";
}
const leftBracketOnStack: LeftBracketOnStack = { type: "(" };

/**
 * For exhaustiveness checking.
 */
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

/**
 * https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
 */
function shuntingYardOperator(
  token: Token,
  stack: Stack<StackItem>,
  queue: RPN,
) {
  const operator = getOperator(token.value);
  let stackTop = stack.peek();
  while (
    isOperator(stackTop) &&
    (stackTop.precedence > operator.precedence ||
      (stackTop.precedence === operator.precedence &&
        stackTop.associativity === "left"))
  ) {
    stack.pop();
    queue.push(stackTop);
    stackTop = stack.peek();
  }
  stack.push(operator);
}

function assignmentLine(tokens: Tokens, stack: Stack<StackItem>) {
  const peek1 = tokens.peek(1);
  const peek2 = tokens.peek(2);
  if (
    !peek1.done &&
    peek1.value.name === "identifier" &&
    !peek2.done &&
    peek2.value.name === "assignment"
  ) {
    tokens.next();
    tokens.next();
    stack.push(makeAssignment(peek1.value.value));
  }
}

export function parse(tokens: Tokens): ParserResult {
  const stack: Stack<StackItem> = new Stack();
  const queue: RPN = [];

  assignmentLine(tokens, stack);

  while (!tokens.next().done) {
    const cur = tokens.current() as Token;

    if (cur.name === "number") {
      queue.push(numericValue(cur.value, unitless()));
      continue;
    }

    if (cur.name === "operator") {
      shuntingYardOperator(cur, stack, queue);
      continue;
    }

    if (cur.name === "(") {
      stack.push(leftBracketOnStack);
      continue;
    }

    if (cur.name === ")") {
      while (isOperator(stack.peek())) {
        queue.push(stack.pop() as Operator);
      }
      if (stack.peek() !== leftBracketOnStack) {
        return {
          type: "error",
          description: 'Unbalanced parens in ")" loop.',
          rpn: queue,
        };
      }
      stack.pop();
      continue;
    }

    if (cur.name === "identifier") {
      queue.push(makeReadVariable(cur.value));
      continue;
    }

    if (cur.name === "unit") {
      continue;
    }

    if (cur.name === "assignment") {
      return { type: "error", description: "Invalid assignment.", rpn: queue };
    }

    if (cur.name === "comment") {
      // ignore comments
      continue;
    }

    assertNever(cur.name);
  }

  while (stack.peek() !== undefined) {
    const stackTop = stack.pop();
    if (isOperator(stackTop) || isAssignment(stackTop)) {
      queue.push(stackTop);
    } else {
      return {
        type: "error",
        description: "Unbalanced parens in final loop.",
        rpn: queue,
      };
    }
  }

  return { type: "success", rpn: queue };
}
