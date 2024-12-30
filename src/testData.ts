import { Result } from '@badrap/result';
import { Environment } from './Environment';
import { Token } from './lex';
import { ast, Line } from './parse';
import { units } from './Unit';
import { Value } from './Value';

type TokenWithoutPosition = Omit<Token, 'from' | 'to'>;
function token(type: Token['type'], value: string): TokenWithoutPosition {
    return { type, value };
}

interface TestDataItem {
    inputEnvironment?: Environment;
    input: string;
    tokens: TokenWithoutPosition[];
    line: Line;
    result: string;
    outputEnvironment?: Environment;
}

export const testData: TestDataItem[] = [
    {
        input: '1',
        tokens: [token('literal', '1')],
        line: ast.expression(ast.literal('1')),
        result: '1',
    },
    {
        input: '1+2',
        tokens: [token('literal', '1'), token('operator', '+'), token('literal', '2')],
        line: ast.expression(ast.operator('+', ast.literal('1'), ast.literal('2'))),
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
        line: ast.expression(
            ast.operator('+', ast.literal('1'), ast.operator('*', ast.literal('2'), ast.literal('3'))),
        ),
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
        line: ast.expression(
            ast.operator('+', ast.operator('*', ast.literal('1'), ast.literal('2')), ast.literal('3')),
        ),
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
        line: ast.expression(
            ast.operator('+', ast.operator('+', ast.literal('1'), ast.literal('2')), ast.literal('3')),
        ),
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
        line: ast.expression(
            ast.operator('^', ast.literal('4'), ast.operator('**', ast.literal('3'), ast.literal('2'))),
        ),
        result: '262 144',
    },
    {
        input: '1+-2',
        tokens: [token('literal', '1'), token('operator', '+'), token('operator', '-'), token('literal', '2')],
        line: ast.expression(ast.operator('+', ast.literal('1'), ast.unary('-', ast.literal('2')))),
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
        line: ast.expression(
            ast.operator(
                '+',
                ast.literal('1'),
                ast.operator('*', ast.literal('2'), ast.operator('^', ast.literal('3'), ast.literal('4'))),
            ),
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
        line: ast.expression(
            ast.operator('*', ast.operator('+', ast.literal('1'), ast.literal('2')), ast.literal('3')),
        ),
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
        line: ast.assignment('x', ast.operator('-', ast.literal('2'), ast.literal('3'))),
        result: '-1',
        outputEnvironment: new Environment(new Map([['x', new Value(-1)]])),
    },
    {
        input: '100 + 10 %',
        tokens: [token('literal', '100'), token('operator', '+'), token('literal', '10'), token('identifier', '%')],
        line: ast.expression(ast.operator('+', ast.literal('100'), ast.conversion('%', ast.literal('10')))),
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
        line: ast.expression(
            ast.operator('-', ast.conversion('mm', ast.literal('100')), ast.conversion('%', ast.literal('10'))),
        ),
        result: '90 mm',
    },
    {
        input: '100 * 10 %',
        tokens: [token('literal', '100'), token('operator', '*'), token('literal', '10'), token('identifier', '%')],
        line: ast.expression(ast.operator('*', ast.literal('100'), ast.conversion('%', ast.literal('10')))),
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
        line: ast.expression(
            ast.conversion(
                'mm',
                ast.operator('+', ast.conversion('m', ast.literal('1')), ast.conversion('cm', ast.literal('1'))),
            ),
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
        line: ast.assignment('x', ast.operator('+', ast.variable('y'), ast.variable('z'))),
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
        line: ast.expression(ast.operator('-', ast.aggregation('sum'), ast.literal('1'))),
        result: '4',
    },
    {
        input: 'total',
        inputEnvironment: new Environment(new Map(), [Result.ok(new Value(2)), Result.ok(new Value(3))]),
        tokens: [token('identifier', 'total')],
        line: ast.expression(ast.aggregation('total')),
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
        line: ast.expression(ast.aggregation('min')),
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
        line: ast.expression(
            ast.conversion(
                'mm',
                ast.operator('+', ast.conversion('cm', ast.literal('1')), ast.conversion('in', ast.literal('2'))),
            ),
        ),
        result: '60.8 mm',
    },
    {
        input: '1 kg -> g',
        tokens: [token('literal', '1'), token('identifier', 'kg'), token('conversion', '->'), token('identifier', 'g')],
        line: ast.expression(ast.conversion('g', ast.conversion('kg', ast.literal('1')))),
        result: '1 000 g',
    },
    {
        input: '4^0.5',
        tokens: [token('literal', '4'), token('operator', '^'), token('literal', '0.5')],
        line: ast.expression(ast.operator('^', ast.literal('4'), ast.literal('0.5'))),
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
        line: ast.expression(
            ast.operator('+', ast.function('sin', ast.literal('1')), ast.function('cos', ast.literal('2'))),
        ),
        result: '0.4253 2414 8261',
    },
    {
        input: '1m == 100 cm',
        tokens: [
            token('literal', '1'),
            token('identifier', 'm'),
            token('operator', '=='),
            token('literal', '100'),
            token('identifier', 'cm'),
        ],
        line: ast.expression(
            ast.operator('==', ast.conversion('m', ast.literal('1')), ast.conversion('cm', ast.literal('100'))),
        ),
        result: 'true',
    },
    {
        input: '1 kg === 1',
        tokens: [token('literal', '1'), token('identifier', 'kg'), token('operator', '==='), token('literal', '1')],
        line: ast.expression(ast.operator('===', ast.conversion('kg', ast.literal('1')), ast.literal('1'))),
        result: 'true',
    },
    {
        input: '1 kg === 1 m',
        tokens: [
            token('literal', '1'),
            token('identifier', 'kg'),
            token('operator', '==='),
            token('literal', '1'),
            token('identifier', 'm'),
        ],
        line: ast.expression(
            ast.operator('===', ast.conversion('kg', ast.literal('1')), ast.conversion('m', ast.literal('1'))),
        ),
        result: 'false',
    },
    {
        input: '1 cm == 11 mm',
        tokens: [
            token('literal', '1'),
            token('identifier', 'cm'),
            token('operator', '=='),
            token('literal', '11'),
            token('identifier', 'mm'),
        ],
        line: ast.expression(
            ast.operator('==', ast.conversion('cm', ast.literal('1')), ast.conversion('mm', ast.literal('11'))),
        ),
        result: 'false',
    },
    {
        input: '1 cm != 11 mm',
        tokens: [
            token('literal', '1'),
            token('identifier', 'cm'),
            token('operator', '!='),
            token('literal', '11'),
            token('identifier', 'mm'),
        ],
        line: ast.expression(
            ast.operator('!=', ast.conversion('cm', ast.literal('1')), ast.conversion('mm', ast.literal('11'))),
        ),
        result: 'true',
    },
    {
        input: 'round(1,23456; 3)',
        tokens: [
            token('identifier', 'round'),
            token('lparen', '('),
            token('literal', '1,23456'),
            token('semicolon', ';'),
            token('literal', '3'),
            token('rparen', ')'),
        ],
        line: ast.expression(ast.function('round', ast.cons(ast.literal('1,23456'), ast.literal('3')))),
        result: '1.235',
    },
    {
        input: '1lb to kg',
        tokens: [
            token('literal', '1'),
            token('identifier', 'lb'),
            token('identifier', 'to'),
            token('identifier', 'kg'),
        ],
        line: ast.expression(ast.conversion('kg', ast.conversion('lb', ast.literal('1')))),
        result: '0.4535 9237 kg',
    },
    {
        input: '1kg to lbs',
        tokens: [
            token('literal', '1'),
            token('identifier', 'kg'),
            token('identifier', 'to'),
            token('identifier', 'lbs'),
        ],
        line: ast.expression(ast.conversion('lbs', ast.conversion('kg', ast.literal('1')))),
        result: '2.2046 2262 1849 lbs',
    },
];
