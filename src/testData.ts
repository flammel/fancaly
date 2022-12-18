import { Result } from '@badrap/result';
import { Environment } from './Environment';
import { Token } from './lex';
import { ast, AST } from './parse';
import { units } from './Unit';
import { Value } from './Value';

type TokenWithoutPosition = Omit<Token, 'from' | 'to'>;
function token(type: Token['type'], value: string): TokenWithoutPosition {
    return { type, value };
}

type TestDataItem = {
    inputEnvironment?: Environment;
    input: string;
    tokens: TokenWithoutPosition[];
    ast: AST;
    result: string;
    outputEnvironment?: Environment;
};

export const testData: TestDataItem[] = [
    {
        input: '1',
        tokens: [token('literal', '1')],
        ast: ast.literal('1'),
        result: '1',
    },
    {
        input: '1+2',
        tokens: [token('literal', '1'), token('operator', '+'), token('literal', '2')],
        ast: ast.operator('+', ast.literal('1'), ast.literal('2')),
        result: '3',
    },
    {
        input: '1+2*3',
        tokens: [
            token('literal', '1'),
            token('operator', '+'),
            token('literal', '2'),
            token('operator', '*'),
            token('literal', '3'),
        ],
        ast: ast.operator('+', ast.literal('1'), ast.operator('*', ast.literal('2'), ast.literal('3'))),
        result: '7',
    },
    {
        input: '1*2+3',
        tokens: [
            token('literal', '1'),
            token('operator', '*'),
            token('literal', '2'),
            token('operator', '+'),
            token('literal', '3'),
        ],
        ast: ast.operator('+', ast.operator('*', ast.literal('1'), ast.literal('2')), ast.literal('3')),
        result: '5',
    },
    {
        input: '1+2+3',
        tokens: [
            token('literal', '1'),
            token('operator', '+'),
            token('literal', '2'),
            token('operator', '+'),
            token('literal', '3'),
        ],
        ast: ast.operator('+', ast.operator('+', ast.literal('1'), ast.literal('2')), ast.literal('3')),
        result: '6',
    },
    {
        input: '4^3**2',
        tokens: [
            token('literal', '4'),
            token('operator', '^'),
            token('literal', '3'),
            token('operator', '**'),
            token('literal', '2'),
        ],
        ast: ast.operator('^', ast.literal('4'), ast.operator('**', ast.literal('3'), ast.literal('2'))),
        result: '262 144',
    },
    {
        input: '1+-2',
        tokens: [token('literal', '1'), token('operator', '+'), token('operator', '-'), token('literal', '2')],
        ast: ast.operator('+', ast.literal('1'), ast.unary('-', ast.literal('2'))),
        result: '-1',
    },
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
        ast: ast.operator(
            '+',
            ast.literal('1'),
            ast.operator('*', ast.literal('2'), ast.operator('^', ast.literal('3'), ast.literal('4'))),
        ),
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
        ast: ast.operator('*', ast.operator('+', ast.literal('1'), ast.literal('2')), ast.literal('3')),
        result: '9',
    },
    {
        input: 'x = 2 - 3',
        tokens: [
            token('identifier', 'x'),
            token('assignment', '='),
            token('literal', '2'),
            token('operator', '-'),
            token('literal', '3'),
        ],
        ast: ast.assignment('x', ast.operator('-', ast.literal('2'), ast.literal('3'))),
        result: '-1',
        outputEnvironment: new Environment(new Map([['x', new Value(-1)]])),
    },
    {
        input: '100 + 10 %',
        tokens: [token('literal', '100'), token('operator', '+'), token('literal', '10'), token('identifier', '%')],
        ast: ast.operator('+', ast.literal('100'), ast.conversion('%', ast.literal('10'))),
        result: '110',
    },
    {
        input: '100 mm - 10 %',
        tokens: [
            token('literal', '100'),
            token('identifier', 'mm'),
            token('operator', '-'),
            token('literal', '10'),
            token('identifier', '%'),
        ],
        ast: ast.operator('-', ast.conversion('mm', ast.literal('100')), ast.conversion('%', ast.literal('10'))),
        result: '90 mm',
    },
    {
        input: '100 * 10 %',
        tokens: [token('literal', '100'), token('operator', '*'), token('literal', '10'), token('identifier', '%')],
        ast: ast.operator('*', ast.literal('100'), ast.conversion('%', ast.literal('10'))),
        result: '10',
    },
    {
        input: '1 m + 1 cm to mm',
        tokens: [
            token('literal', '1'),
            token('identifier', 'm'),
            token('operator', '+'),
            token('literal', '1'),
            token('identifier', 'cm'),
            token('identifier', 'to'),
            token('identifier', 'mm'),
        ],
        ast: ast.conversion(
            'mm',
            ast.operator('+', ast.conversion('m', ast.literal('1')), ast.conversion('cm', ast.literal('1'))),
        ),
        result: '1 010 mm',
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
        ast: ast.assignment('x', ast.operator('+', ast.variable('y'), ast.variable('z'))),
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
        input: 'sum - 1',
        inputEnvironment: new Environment(new Map(), [
            Result.ok(new Value(1)),
            Result.err(new Error()),
            Result.ok(new Value(2)),
            Result.ok(new Value(3)),
        ]),
        tokens: [token('identifier', 'sum'), token('operator', '-'), token('literal', '1')],
        ast: ast.operator('-', ast.aggregation('sum'), ast.literal('1')),
        result: '4',
    },
    {
        input: 'total',
        inputEnvironment: new Environment(new Map(), [Result.ok(new Value(2)), Result.ok(new Value(3))]),
        tokens: [token('identifier', 'total')],
        ast: ast.aggregation('total'),
        result: '5',
    },
    {
        input: 'min',
        inputEnvironment: new Environment(new Map(), [
            Result.ok(
                new Value(
                    100,
                    units.find((u) => u.name === 'mm'),
                ),
            ),
            Result.ok(
                new Value(
                    1,
                    units.find((u) => u.name === 'm'),
                ),
            ),
        ]),
        tokens: [token('identifier', 'min')],
        ast: ast.aggregation('min'),
        result: '100 mm',
    },
    {
        input: '1 cm + 2 in to mm',
        tokens: [
            token('literal', '1'),
            token('identifier', 'cm'),
            token('operator', '+'),
            token('literal', '2'),
            token('identifier', 'in'),
            token('identifier', 'to'),
            token('identifier', 'mm'),
        ],
        ast: ast.conversion(
            'mm',
            ast.operator('+', ast.conversion('cm', ast.literal('1')), ast.conversion('in', ast.literal('2'))),
        ),
        result: '60.8 mm',
    },
    {
        input: '1 kg -> g',
        tokens: [token('literal', '1'), token('identifier', 'kg'), token('conversion', '->'), token('identifier', 'g')],
        ast: ast.conversion('g', ast.conversion('kg', ast.literal('1'))),
        result: '1 000 g',
    },
    {
        input: '4^0.5',
        tokens: [token('literal', '4'), token('operator', '^'), token('literal', '0.5')],
        ast: ast.operator('^', ast.literal('4'), ast.literal('0.5')),
        result: '2',
    },
    {
        input: 'sin(1) + cos(2)',
        tokens: [
            token('identifier', 'sin'),
            token('lparen', '('),
            token('literal', '1'),
            token('rparen', ')'),
            token('operator', '+'),
            token('identifier', 'cos'),
            token('lparen', '('),
            token('literal', '2'),
            token('rparen', ')'),
        ],
        ast: ast.operator('+', ast.function('sin', ast.literal('1')), ast.function('cos', ast.literal('2'))),
        result: '0.4253 2414 8261',
    },
];
