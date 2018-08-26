import { BigNumber } from "bignumber.js";
import { Operators, Units, ValueGenerators } from "./config";
import { Token, Tokens } from "./lexer";
import { List } from "./list";
import { Operator } from "./operator";
import { Stack } from "./stack";
import { Unit } from "./unit";
import { assertNever } from "./util";
import { ValueGenerator, VariableReader } from "./valueGenerator";

export type ParserResult =
  | { type: "success"; rpn: RPN }
  | { type: "error"; description: string; rpn: RPN };

export type RPNItem =
  | { type: "operator"; operator: Operator }
  | { type: "assignment"; variableName: string }
  | { type: "number"; value: BigNumber }
  | { type: "unit"; unit: Unit }
  | { type: "valueGenerator"; generator: ValueGenerator };

export type RPN = List<RPNItem>;

type StackItem =
  | { type: "(" }
  | { type: "operator"; operator: Operator }
  | { type: "assignment"; variableName: string };

interface ParserState {
  tokens: Tokens;
  stack: Stack<StackItem | undefined>;
  queue: RPNItem[];
  nextMinus: "-" | "-u";
}

type ErrorMessage = string;

export class Parser {
  private operators: Operators;
  private units: Units;
  private valueGenerators: ValueGenerators;

  constructor(operators: Operators, units: Units, valueGenerators: ValueGenerators) {
    this.operators = operators;
    this.units = units;
    this.valueGenerators = valueGenerators;
  }

  public parse(tokens: Tokens): ParserResult {
    const state: ParserState = {
      tokens,
      stack: new Stack(undefined),
      queue: [],
      nextMinus: "-u",
    };

    while (state.tokens.next().type !== "done") {
      const result = this.tryParsers(state, state.tokens.current() as Token);
      if (result !== null) {
        return {
          type: "error",
          description: result,
          rpn: new List(state.queue),
        };
      }
    }
    return parseRemainingStack(state);
  }

  private tryParsers(state: ParserState, currentToken: Token): ErrorMessage | null {
    switch (currentToken.type) {
      case "number":
        return parseNumber(state, currentToken.value);
      case "operator":
        return parseOperator(this.operators, state, currentToken.value);
      case "(":
        return parseLeftBracket(state);
      case ")":
        return parseRightBracket(state);
      case "identifier":
        return parseIdentifier(state, currentToken.value);
      case "unit":
        return parseUnit(this.units, state, currentToken.value);
      case "assignment":
        return parseAssignment();
      case "comment":
        return parseComment();
      case "aggregator":
        return parseAggregator(this.valueGenerators, state, currentToken.value);
      default:
        assertNever(currentToken.type);
        return null;
    }
  }
}

function parseNumber(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  state.queue.push({
    type: "number",
    value: new BigNumber(value),
  });
  return null;
}

function parseOperator(
  operators: Operators,
  state: ParserState,
  value: string,
): ErrorMessage | null {
  // https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
  const operatorSymbol = value === "-" ? state.nextMinus : value;
  const operator = operators.getOperator(operatorSymbol);

  if (operator === undefined) {
    return "Unknown operator " + operatorSymbol;
  }

  state.nextMinus = "-u";
  let stackTop = state.stack.peek();
  while (
    stackTop !== undefined &&
    stackTop.type === "operator" &&
    (stackTop.operator.precedence > operator.precedence ||
      (stackTop.operator.precedence === operator.precedence &&
        stackTop.operator.associativity === "left"))
  ) {
    state.stack.pop();
    state.queue.push(stackTop);
    stackTop = state.stack.peek();
  }
  state.stack.push({
    type: "operator",
    operator,
  });
  return null;
}

function parseLeftBracket(state: ParserState): ErrorMessage | null {
  state.nextMinus = "-u";
  state.stack.push({ type: "(" });
  return null;
}

function parseRightBracket(state: ParserState): ErrorMessage | null {
  state.nextMinus = "-";
  let stackTop = state.stack.peek();
  while (stackTop && stackTop.type === "operator") {
    state.queue.push(stackTop);
    state.stack.pop();
    stackTop = state.stack.peek();
  }
  if (stackTop === undefined || stackTop.type !== "(") {
    return 'Unbalanced parens in ")" loop.';
  }
  state.stack.pop();
  return null;
}

function parseIdentifier(state: ParserState, value: string): ErrorMessage | null {
  const peeked = state.tokens.peek();
  if (peeked.type === "notDone" && peeked.value.type === "assignment") {
    state.nextMinus = "-u";
    state.stack.push({
      type: "assignment",
      variableName: value,
    });
    state.tokens.next();
  } else {
    state.nextMinus = "-";
    state.queue.push({
      type: "valueGenerator",
      generator: new VariableReader(value),
    });
  }
  return null;
}

function parseUnit(units: Units, state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  const unit = units.getUnit(value);
  if (unit === undefined) {
    return 'Unknown unit "' + value + '".';
  }
  state.queue.push({
    type: "unit",
    unit,
  });
  return null;
}

function parseAssignment(): ErrorMessage | null {
  return "Assignment operators are only allowed after identifiers.";
}

function parseComment(): ErrorMessage | null {
  return null;
}

function parseAggregator(
  valueGenerators: ValueGenerators,
  state: ParserState,
  value: string,
): ErrorMessage | null {
  state.nextMinus = "-";
  const aggregator = valueGenerators.getAggregator(value);
  if (aggregator === undefined) {
    return 'Unknown aggregator "' + value + '".';
  }
  state.queue.push({
    type: "valueGenerator",
    generator: aggregator,
  });
  return null;
}

function parseRemainingStack(state: ParserState): ParserResult {
  let stackTop = state.stack.peek();
  while (stackTop !== undefined) {
    state.stack.pop();
    if (stackTop.type === "operator" || stackTop.type === "assignment") {
      state.queue.push(stackTop);
    } else {
      return {
        type: "error",
        description: "Unbalanced parens in final loop.",
        rpn: new List(state.queue),
      };
    }
    stackTop = state.stack.peek();
  }
  return { type: "success", rpn: new List(state.queue) };
}
