import { Result } from '@badrap/result';
import { assertNever } from './assertNever';
import { Token, Tokens } from './lex';

export type ASTNode =
    | { type: 'operator'; operator: string; lhs: ASTNode; rhs: ASTNode }
    | { type: 'negation'; operand: ASTNode }
    | { type: 'assignment'; variableName: string; expression: ASTNode }
    | { type: 'number'; value: string; unit?: string }
    | { type: 'variable'; name: string }
    | { type: 'conversion'; unit: string; expression: ASTNode }
    | { type: 'empty' };

export type AST = ASTNode;

type StackItem =
    | { type: 'lparen' }
    | { type: 'operator'; operator: string; precedence: number }
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
        case 'percent':
            return state;
        default:
            assertNever(token.type);
    }
}

function parseLiteral(state: ParserState, literal: string): ParserState {
    let unit = undefined;
    const nextToken = state.tokens[state.index + 1];
    if (nextToken?.type === 'identifier' || nextToken?.type === 'percent') {
        unit = nextToken.value;
        state.index++;
    }
    state.nextMinus = 'binary';
    state.operands.push({ type: 'number', value: literal, unit });
    return state;
}

function parseOperator(state: ParserState, operatorSymbol: string): ParserState {
    const precedence = {
        '+': 100,
        '-': 100,
        '*': 200,
        '/': 200,
        '^': 300,
        '**': 300,
    }[operatorSymbol];
    const associativity = {
        '+': 'left',
        '-': 'left',
        '*': 'left',
        '/': 'left',
        '^': 'right',
        '**': 'right',
    }[operatorSymbol];
    if (precedence === undefined || associativity === undefined) {
        state.error = 'Missing precedence/associativity for ' + operatorSymbol;
        return state;
    }

    state.nextMinus = 'unary';
    let stackTop = peek(state.operators);
    while (
        stackTop?.type === 'operator' &&
        (stackTop.precedence > precedence || (stackTop.precedence === precedence && associativity === 'left'))
    ) {
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
    state.operators.push({
        type: 'operator',
        operator: operatorSymbol,
        precedence: precedence,
    });
    return state;
}

function parseLeftParen(state: ParserState): ParserState {
    state.nextMinus = 'unary';
    state.operators.push({ type: 'lparen' });
    return state;
}

function parseRightParen(state: ParserState): ParserState {
    state.nextMinus = 'binary';
    let stackTop = peek(state.operators);
    while (stackTop?.type === 'operator') {
        state.operators.pop();
        const rhs = state.operands.pop();
        const lhs = state.operands.pop();
        if (lhs === undefined || rhs === undefined) {
            state.error = 'Not enough arguments for ' + stackTop.operator;
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

    if (stackTop?.type !== 'lparen') {
        state.error = 'Unbalanced left parens';
        return state;
    }

    state.operators.pop();

    return state;
}

function parseAssignment(state: ParserState): ParserState {
    state.operators.push({
        type: 'assignment',
    });
    return state;
}

function parseIdentifier(state: ParserState, identifier: string): ParserState {
    state.operands.push({
        type: 'variable',
        name: identifier,
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
            const operand = state.operands.pop();
            if (operand === undefined) {
                state.error = 'Not enough arguments for negation';
                break;
            }
            state.operands.push({
                type: 'negation',
                operand,
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
