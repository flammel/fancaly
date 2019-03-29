import { BigNumber } from "bignumber.js";
import { Functions, Operators, Units, ValueGenerators } from "./config";
import { Formatter } from "./formatter";
import { Func } from "./function";
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
  | { type: "function"; function: Func }
  | { type: "assignment"; variableName: string }
  | { type: "number"; value: BigNumber }
  | { type: "unit"; unit: Unit }
  | { type: "date"; date: Date }
  | { type: "time"; hours: BigNumber; minutes: BigNumber; seconds?: BigNumber }
  | { type: "valueGenerator"; generator: ValueGenerator };

export type RPN = List<RPNItem>;

type StackItem =
  | { type: "(" }
  | { type: "operator"; operator: Operator }
  | { type: "function"; function: Func }
  | { type: "assignment"; variableName: string };

interface ParserState {
  tokens: Tokens;
  stack: Stack<StackItem | undefined>;
  queue: RPNItem[];
  nextMinus: "-" | "-u";
}

type ErrorMessage = string;

export function parserSuccess(rpnItems: RPNItem[]): ParserResult {
  return {
    type: "success",
    rpn: new List(rpnItems),
  };
}

export function parserError(description: string, rpnItems: RPNItem[]): ParserResult {
  return {
    type: "error",
    description,
    rpn: new List(rpnItems),
  };
}

export class Parser {
  private readonly operators: Operators;
  private readonly functions: Functions;
  private readonly units: Units;
  private readonly valueGenerators: ValueGenerators;
  private readonly formatter: Formatter;

  constructor(
    operators: Operators,
    functions: Functions,
    units: Units,
    valueGenerators: ValueGenerators,
    formatter: Formatter,
  ) {
    this.operators = operators;
    this.functions = functions;
    this.units = units;
    this.valueGenerators = valueGenerators;
    this.formatter = formatter;
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
    return this.parseRemainingStack(state);
  }

  private tryParsers(state: ParserState, currentToken: Token): ErrorMessage | null {
    switch (currentToken.type) {
      case "number":
        return this.parseNumber(state, currentToken.value);
      case "operator":
        return this.parseOperator(this.operators, state, currentToken.value);
      case "function":
        return this.parseFunction(this.functions, state, currentToken.value);
      case "(":
        return this.parseLeftBracket(state);
      case ")":
        return this.parseRightBracket(state);
      case ";":
        return this.parseSemicolon(state);
      case "identifier":
        return this.parseIdentifier(state, currentToken.value);
      case "unit":
        return this.parseUnit(this.units, state, currentToken.value);
      case "assignment":
        return this.parseAssignment();
      case "comment":
        return this.parseComment();
      case "aggregator":
        return this.parseAggregator(this.valueGenerators, state, currentToken.value);
      case "date":
        return this.parseDate(state, currentToken.value);
      case "time":
        return this.parseTime(state, currentToken.value);
      /* istanbul ignore next */
      default:
        assertNever(currentToken.type);
        return null;
    }
  }

  private parseNumber(state: ParserState, value: string): ErrorMessage | null {
    state.nextMinus = "-";
    state.queue.push({
      type: "number",
      value: new BigNumber(this.formatter.parseNumber(value)),
    });
    return null;
  }

  private parseDate(state: ParserState, value: string): ErrorMessage | null {
    state.nextMinus = "-";
    state.queue.push({
      type: "date",
      date: new Date(value),
    });
    return null;
  }

  private parseTime(state: ParserState, value: string): ErrorMessage | null {
    state.nextMinus = "-";
    const [hours, minutes, seconds] = value.split(":").map((x) => new BigNumber(x));
    state.queue.push({
      type: "time",
      hours,
      minutes,
      seconds,
    });
    return null;
  }

  private parseOperator(
    operators: Operators,
    state: ParserState,
    value: string,
  ): ErrorMessage | null {
    // https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
    const operatorSymbol = value === "-" ? state.nextMinus : value;
    const operator = operators.getOperator(operatorSymbol);

    if (operator === undefined) {
      return `Unknown operator "${operatorSymbol}".`;
    }

    state.nextMinus = "-u";
    let stackTop = state.stack.peek();
    while (
      stackTop !== undefined &&
      (stackTop.type === "function" ||
        (stackTop.type === "operator" &&
          (stackTop.operator.precedence > operator.precedence ||
            (stackTop.operator.precedence === operator.precedence &&
              stackTop.operator.associativity === "left"))))
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

  private parseFunction(
    functions: Functions,
    state: ParserState,
    value: string,
  ): ErrorMessage | null {
    const func = functions.getFunction(value);
    if (func !== undefined) {
      state.stack.push({
        type: "function",
        function: func,
      });
    }
    return null;
  }

  private parseLeftBracket(state: ParserState): ErrorMessage | null {
    state.nextMinus = "-u";
    state.stack.push({ type: "(" });
    return null;
  }

  private parseSemicolon(state: ParserState): ErrorMessage | null {
    state.nextMinus = "-u";
    let stackTop = state.stack.peek();
    while (stackTop && stackTop.type === "operator") {
      state.queue.push(stackTop);
      state.stack.pop();
      stackTop = state.stack.peek();
    }
    if (stackTop === undefined || stackTop.type !== "(") {
      return 'Unbalanced parens in ";" loop.';
    }
    return null;
  }

  private parseRightBracket(state: ParserState): ErrorMessage | null {
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
    stackTop = state.stack.peek();
    if (stackTop !== undefined && stackTop.type === "function") {
      state.queue.push(stackTop);
      state.stack.pop();
    }
    return null;
  }

  private parseIdentifier(state: ParserState, value: string): ErrorMessage | null {
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

  private parseUnit(units: Units, state: ParserState, value: string): ErrorMessage | null {
    state.nextMinus = "-";
    const unit = units.getUnit(value);
    if (unit === undefined) {
      return `Unknown unit "${value}".`;
    }
    state.queue.push({
      type: "unit",
      unit,
    });
    return null;
  }

  private parseAssignment(): ErrorMessage | null {
    return "Assignment operators are only allowed after identifiers.";
  }

  private parseComment(): ErrorMessage | null {
    return null;
  }

  private parseAggregator(
    valueGenerators: ValueGenerators,
    state: ParserState,
    value: string,
  ): ErrorMessage | null {
    state.nextMinus = "-";
    const aggregator = valueGenerators.getAggregator(value);
    if (aggregator === undefined) {
      return `Unknown aggregator "${value}".`;
    }
    state.queue.push({
      type: "valueGenerator",
      generator: aggregator,
    });
    return null;
  }

  private parseRemainingStack(state: ParserState): ParserResult {
    let stackTop = state.stack.peek();
    while (stackTop !== undefined) {
      state.stack.pop();
      if (
        stackTop.type === "operator" ||
        stackTop.type === "assignment" ||
        stackTop.type === "function"
      ) {
        state.queue.push(stackTop);
      } else {
        return parserError("Unbalanced parens in final loop.", state.queue);
      }
      stackTop = state.stack.peek();
    }
    return parserSuccess(state.queue);
  }
}
