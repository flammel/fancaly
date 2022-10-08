import { Result } from '@badrap/result';
import BigNumber from 'bignumber.js';
import { Environment } from './Environment';
import { Token, Tokens, TokenType } from './lex';
import { AST } from './parse';
import { Value } from './Value';

function token(type: TokenType, value: string): Token {
    return { type, value };
}

function binOp(operator: string, lhs: AST | number | string, rhs: AST | number | string): AST {
    return {
        type: 'operator',
        operator,
        lhs: toAst(lhs),
        rhs: toAst(rhs),
    };
}

function num(value: number): AST {
    return { type: 'number', value: new BigNumber(value).toString() };
}

function toAst(value: AST | number | string): AST {
    if (typeof value === 'number') {
        return num(value);
    }
    if (typeof value === 'string') {
        return { type: 'variable', name: value };
    }
    return value;
}

type TestDataItem = {
    inputEnvironment?: Environment;
    input: string;
    tokens: Tokens;
    ast: AST;
    result: string;
    outputEnvironment?: Environment;
};
export const testData: TestDataItem[] = [
    {
        input: '1 + 2 * 3 ^ 4',
        tokens: [
            token('literal', '1'),
            token('operator', '+'),
            token('literal', '2'),
            token('operator', '*'),
            token('literal', '3'),
            token('operator', '^'),
            token('literal', '4'),
        ],
        ast: binOp('+', 1, binOp('*', 2, binOp('^', 3, 4))),
        result: '163',
    },
    {
        input: '(1 + 2) * 3',
        tokens: [
            token('lparen', '('),
            token('literal', '1'),
            token('operator', '+'),
            token('literal', '2'),
            token('rparen', ')'),
            token('operator', '*'),
            token('literal', '3'),
        ],
        ast: binOp('*', binOp('+', 1, 2), 3),
        result: '9',
    },
    // {
    //     input: '2 * -3 * -(-4 + -5 - -6)',
    //     tokens: [
    //         token('literal', '2'),
    //         token('operator', '*'),
    //         token('operator', '-'),
    //         token('literal', '3'),
    //         token('operator', '*'),
    //         token('operator', '-'),
    //         token('lparen', '('),
    //         token('operator', '-'),
    //         token('literal', '4'),
    //         token('operator', '+'),
    //         token('operator', '-'),
    //         token('literal', '5'),
    //         token('operator', '-'),
    //         token('operator', '-'),
    //         token('literal', '6'),
    //         token('rparen', ')'),
    //     ],
    //     ast: {
    //         type: 'operator',
    //         operator: '*',
    //         lhs: {
    //             type: 'operator',
    //             operator: '+',
    //             lhs: { type: 'number', value: '1' },
    //             rhs: { type: 'number', value: '2' },
    //         },
    //         rhs: { type: 'number', value: '3' },
    //     },
    //     result: '-18',
    // },
    {
        input: 'x = 2 + 3 + 4',
        tokens: [
            token('identifier', 'x'),
            token('assignment', '='),
            token('literal', '2'),
            token('operator', '+'),
            token('literal', '3'),
            token('operator', '+'),
            token('literal', '4'),
        ],
        ast: {
            type: 'assignment',
            variableName: 'x',
            expression: binOp('+', binOp('+', 2, 3), 4),
        },
        result: '9',
        outputEnvironment: new Environment(new Map([['x', new Value(9)]])),
    },
    {
        input: 'x = y + z',
        inputEnvironment: new Environment(
            new Map([
                ['y', new Value(2)],
                ['z', new Value(3)],
            ]),
        ),
        tokens: [
            token('identifier', 'x'),
            token('assignment', '='),
            token('identifier', 'y'),
            token('operator', '+'),
            token('identifier', 'z'),
        ],
        ast: {
            type: 'assignment',
            variableName: 'x',
            expression: binOp('+', 'y', 'z'),
        },
        result: '5',
        outputEnvironment: new Environment(
            new Map([
                ['y', new Value(2)],
                ['z', new Value(3)],
                ['x', new Value(5)],
            ]),
        ),
    },
    {
        input: 'sum',
        inputEnvironment: new Environment(new Map(), [
            Result.ok(new Value(1)),
            Result.err(new Error()),
            Result.ok(new Value(2)),
            Result.ok(new Value(3)),
        ]),
        tokens: [token('identifier', 'sum')],
        ast: {
            type: 'variable',
            name: 'sum',
        },
        result: '5',
    },
];
