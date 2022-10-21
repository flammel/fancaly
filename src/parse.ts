import { Result } from '@badrap/result';
import { assertNever } from './assertNever';
import { Token, Tokens } from './lex';
import { isUnit } from './Unit';

type OperatorName = '+' | '-' | '*' | '/' | '^' | '**';
type AggregationName = 'sum' | 'total' | 'average' | 'avg' | 'mean';

export type ASTNode =
    | { type: 'operator'; operator: OperatorName; lhs: ASTNode; rhs: ASTNode }
    | { type: 'negation'; expression: ASTNode }
    | { type: 'assignment'; variableName: string; expression: ASTNode }
    | { type: 'literal'; value: string }
    | { type: 'variable'; name: string }
    | { type: 'aggregation'; name: AggregationName }
    | { type: 'conversion'; unit: string; expression: ASTNode }
    | { type: 'empty' };

export type AST = ASTNode;

type StackItem =
    | { type: 'lparen' }
    | { type: 'operator'; operator: OperatorName; precedence: number }
    | { type: 'negation' }
    | { type: 'assignment' };

type ParserState = {
    tokens: Tokens;
    index: number;
    operators: StackItem[];
    operands: ASTNode[];
    error: string | null;
    nextMinus: 'unary' | 'binary';
};

export function parse(tokens: Tokens): Result<AST, Error> {
    if (tokens.length === 0) {
        return Result.ok({ type: 'empty' });
    }

    if (tokens.at(0)?.type === 'comment') {
        return Result.ok({ type: 'empty' });
    }

    let state: ParserState = {
        tokens,
        index: 0,
        operators: [],
        operands: [],
        error: null,
        nextMinus: 'unary',
    };
    let token = state.tokens[state.index];
    while (token !== undefined && state.error === null) {
        state = tryParsers(state, token);
        state.index++;
        token = state.tokens[state.index];
    }

    if (state.error !== null) {
        return Result.err(new Error(state.error));
    }

    return parseRemainingStack(state);
}

function tryParsers(state: ParserState, token: Token): ParserState {
    switch (token.type) {
        case 'literal':
            return parseLiteral(state, token.value);
        case 'operator':
            return parseOperator(state, token.value);
        case 'lparen':
            return parseLeftParen(state);
        case 'rparen':
            return parseRightParen(state);
        case 'identifier':
            return parseIdentifier(state, token.value);
        case 'assignment':
            return parseAssignment(state);
        case 'comment':
            return state;
        case 'conversion':
            return parseConversion(state, token.value);
        default:
            assertNever(token.type);
    }
}

function parseLiteral(state: ParserState, literal: string): ParserState {
    state.nextMinus = 'binary';
    state.operands.push({ type: 'literal', value: literal });
    return state;
}

type OperatorConfig = {
    name: OperatorName;
    precedence: number;
    associativity: 'left' | 'right';
};
function operatorConfig(operatorSymbol: string): OperatorConfig | undefined {
    switch (operatorSymbol) {
        case '+':
            return { name: '+', precedence: 100, associativity: 'left' };
        case '-':
            return { name: '-', precedence: 100, associativity: 'left' };
        case '*':
            return { name: '*', precedence: 200, associativity: 'left' };
        case '/':
            return { name: '/', precedence: 200, associativity: 'left' };
        case '^':
            return { name: '^', precedence: 300, associativity: 'right' };
        case '**':
            return { name: '**', precedence: 300, associativity: 'right' };
        default:
            return undefined;
    }
}

function parseOperator(state: ParserState, operatorSymbol: string): ParserState {
    const config = operatorConfig(operatorSymbol);
    if (config === undefined) {
        state.error = 'Unknown operator ' + operatorSymbol;
        return state;
    }

    if (operatorSymbol === '-' && state.nextMinus === 'unary') {
        state.nextMinus = 'binary';
        state.operators.push({
            type: 'negation',
        });
        return state;
    }

    state.nextMinus = 'unary';
    state = consumeOperators(state, operatorSymbol, config.precedence, config.associativity);
    state.operators.push({
        type: 'operator',
        operator: config.name,
        precedence: config.precedence,
    });
    return state;
}

function consumeOperators(
    state: ParserState,
    operatorSymbol: string,
    precedence: number,
    associativity: string,
): ParserState {
    let stackTop = peek(state.operators);
    while (
        (stackTop?.type === 'operator' &&
            (stackTop.precedence > precedence || (stackTop.precedence === precedence && associativity === 'left'))) ||
        stackTop?.type === 'negation'
    ) {
        if (stackTop.type === 'negation') {
            state.operators.pop();
            const expression = state.operands.pop();
            if (expression === undefined) {
                state.error = 'Not enough arguments for unary -';
                return state;
            }
            state.operands.push({
                type: 'negation',
                expression,
            });
            stackTop = peek(state.operators);
            continue;
        }
        state.operators.pop();
        const rhs = state.operands.pop();
        const lhs = state.operands.pop();
        if (lhs === undefined || rhs === undefined) {
            state.error = 'Not enough arguments for ' + operatorSymbol;
            return state;
        }
        state.operands.push({
            type: 'operator',
            operator: stackTop.operator,
            lhs,
            rhs,
        });
        stackTop = peek(state.operators);
    }
    return state;
}

function parseLeftParen(state: ParserState): ParserState {
    state.nextMinus = 'unary';
    state.operators.push({ type: 'lparen' });
    return state;
}

function parseRightParen(state: ParserState): ParserState {
    state.nextMinus = 'binary';
    state = consumeOperators(state, ')', 0, 'left');

    const stackTop = state.operators.pop();
    if (stackTop?.type !== 'lparen') {
        state.error = 'Unbalanced left parens';
        return state;
    }

    return state;
}

function parseUnit(state: ParserState, unit: string): ParserState {
    state.nextMinus = 'binary';
    state = consumeOperators(state, unit, 500, 'left');

    const expression = state.operands.pop();
    if (expression === undefined) {
        state.error = 'No argument for unit';
        return state;
    }
    state.operands.push({
        type: 'conversion',
        unit,
        expression,
    });
    return state;
}

function parseAssignment(state: ParserState): ParserState {
    state.nextMinus = 'unary';
    state.operators.push({
        type: 'assignment',
    });
    return state;
}

function parseIdentifier(state: ParserState, identifier: string): ParserState {
    if (isUnit(identifier)) {
        return parseUnit(state, identifier);
    }

    if (
        identifier === 'sum' ||
        identifier === 'total' ||
        identifier === 'average' ||
        identifier === 'avg' ||
        identifier === 'mean'
    ) {
        state.nextMinus = 'binary';
        state.operands.push({
            type: 'aggregation',
            name: identifier,
        });
        return state;
    }

    state.nextMinus = 'binary';
    state.operands.push({
        type: 'variable',
        name: identifier,
    });
    return state;
}

function parseConversion(state: ParserState, name: string): ParserState {
    const nextToken = state.tokens[state.index + 1];
    if (nextToken?.type !== 'identifier') {
        state.error = 'No unit for conversion';
        return state;
    }
    state.index++;

    state = consumeOperators(state, name, 0, 'left');

    const expression = state.operands.pop();
    if (expression === undefined) {
        state.error = 'Nothing to convert';
        return state;
    }
    state.operands.push({
        type: 'conversion',
        unit: nextToken.value,
        expression,
    });
    return state;
}

function peek<T>(xs: T[]): T | undefined {
    return xs[xs.length - 1];
}

function parseRemainingStack(state: ParserState): Result<AST, Error> {
    let stackTop = state.operators.pop();
    while (stackTop !== undefined) {
        if (stackTop.type === 'lparen') {
            state.error = 'Unbalanced parens';
            break;
        } else if (stackTop.type === 'negation') {
            const expression = state.operands.pop();
            if (expression === undefined) {
                state.error = 'Not enough arguments for negation';
                break;
            }
            state.operands.push({
                type: 'negation',
                expression,
            });
            stackTop = state.operators.pop();
        } else if (stackTop.type === 'assignment') {
            const expression = state.operands.pop();
            if (expression === undefined) {
                state.error = 'No value for assignment';
                break;
            }
            const variableNode = state.operands.pop();
            if (variableNode?.type !== 'variable') {
                state.error = 'No name for assignment, instead ' + variableNode?.type;
                break;
            }
            state.operands.push({
                type: 'assignment',
                variableName: variableNode.name,
                expression,
            });
            stackTop = state.operators.pop();
        } else if (stackTop.type === 'operator') {
            const rhs = state.operands.pop();
            const lhs = state.operands.pop();
            if (lhs === undefined || rhs === undefined) {
                state.error = 'Not enough arguments for ' + stackTop.operator;
                break;
            }
            state.operands.push({
                type: 'operator',
                operator: stackTop.operator,
                lhs,
                rhs,
            });
            stackTop = state.operators.pop();
        } else {
            assertNever(stackTop);
        }
    }

    if (state.error !== null) {
        return Result.err(new Error(state.error));
    }

    const result = state.operands.pop();
    if (result === undefined) {
        return Result.err(new Error('No operands left'));
    }

    return Result.ok(result);
}
