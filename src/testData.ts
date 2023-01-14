import { Token } from './lex';
import { ast, Statement } from './parse';

type TokenWithoutPosition = Omit<Token, 'from' | 'to'>;
function token(type: Token['type'], value: string): TokenWithoutPosition {
    return { type, value };
}

type TestDataItem = {
    input: string;
    tokens: TokenWithoutPosition[];
    statements: Statement[];
    result: string[];
};

export const testData: TestDataItem[] = [
    {
        input: '1',
        tokens: [token('literal', '1')],
        statements: [ast.expression(ast.literal('1'), 0, 0)],
        result: ['1'],
    },
    {
        input: '1+2',
        tokens: [token('literal', '1'), token('operator', '+'), token('literal', '2')],
        statements: [ast.expression(ast.operator('+', ast.literal('1'), ast.literal('2')), 0, 0)],
        result: ['3'],
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
        statements: [
            ast.expression(
                ast.operator('+', ast.literal('1'), ast.operator('*', ast.literal('2'), ast.literal('3'))),
                0,
                0,
            ),
        ],
        result: ['7'],
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
        statements: [
            ast.expression(
                ast.operator('+', ast.operator('*', ast.literal('1'), ast.literal('2')), ast.literal('3')),
                0,
                0,
            ),
        ],
        result: ['5'],
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
        statements: [
            ast.expression(
                ast.operator('+', ast.operator('+', ast.literal('1'), ast.literal('2')), ast.literal('3')),
                0,
                0,
            ),
        ],
        result: ['6'],
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
        statements: [
            ast.expression(
                ast.operator('^', ast.literal('4'), ast.operator('**', ast.literal('3'), ast.literal('2'))),
                0,
                0,
            ),
        ],
        result: ['262 144'],
    },
    {
        input: '1+-2',
        tokens: [token('literal', '1'), token('operator', '+'), token('operator', '-'), token('literal', '2')],
        statements: [ast.expression(ast.operator('+', ast.literal('1'), ast.unary('-', ast.literal('2'))), 0, 0)],
        result: ['-1'],
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
        statements: [
            ast.expression(
                ast.operator(
                    '+',
                    ast.literal('1'),
                    ast.operator('*', ast.literal('2'), ast.operator('^', ast.literal('3'), ast.literal('4'))),
                ),
                0,
                0,
            ),
        ],
        result: ['163'],
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
        statements: [
            ast.expression(
                ast.operator('*', ast.operator('+', ast.literal('1'), ast.literal('2')), ast.literal('3')),
                0,
                0,
            ),
        ],
        result: ['9'],
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
        statements: [ast.assignment('x', ast.operator('-', ast.literal('2'), ast.literal('3')), 0, 0)],
        result: ['-1'],
    },
    {
        input: '100 + 10 %',
        tokens: [token('literal', '100'), token('operator', '+'), token('literal', '10'), token('identifier', '%')],
        statements: [
            ast.expression(ast.operator('+', ast.literal('100'), ast.conversion('%', ast.literal('10'))), 0, 0),
        ],
        result: ['110'],
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
        statements: [
            ast.expression(
                ast.operator('-', ast.conversion('mm', ast.literal('100')), ast.conversion('%', ast.literal('10'))),
                0,
                0,
            ),
        ],
        result: ['90 mm'],
    },
    {
        input: '100 * 10 %',
        tokens: [token('literal', '100'), token('operator', '*'), token('literal', '10'), token('identifier', '%')],
        statements: [
            ast.expression(ast.operator('*', ast.literal('100'), ast.conversion('%', ast.literal('10'))), 0, 0),
        ],
        result: ['10'],
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
        statements: [
            ast.expression(
                ast.conversion(
                    'mm',
                    ast.operator('+', ast.conversion('m', ast.literal('1')), ast.conversion('cm', ast.literal('1'))),
                ),
                0,
                0,
            ),
        ],
        result: ['1 010 mm'],
    },
    {
        input: 'y=2\nz=3\nx = y + z',
        tokens: [
            token('identifier', 'y'),
            token('assignment', '='),
            token('literal', '2'),
            token('newline', '\n'),
            token('identifier', 'z'),
            token('assignment', '='),
            token('literal', '3'),
            token('newline', '\n'),
            token('identifier', 'x'),
            token('assignment', '='),
            token('identifier', 'y'),
            token('operator', '+'),
            token('identifier', 'z'),
        ],
        statements: [
            ast.assignment('y', ast.literal('2'), 0, 0),
            ast.assignment('z', ast.literal('3'), 0, 0),
            ast.assignment('x', ast.operator('+', ast.variable('y'), ast.variable('z')), 0, 0),
        ],
        result: ['2', '3', '5'],
    },
    {
        input: '1\n\n2\n3\nsum - 1',
        tokens: [
            token('literal', '1'),
            token('newline', '\n'),
            token('newline', '\n'),
            token('literal', '2'),
            token('newline', '\n'),
            token('literal', '3'),
            token('newline', '\n'),
            token('identifier', 'sum'),
            token('operator', '-'),
            token('literal', '1'),
        ],
        statements: [
            ast.expression(ast.literal('1'), 0, 0),
            ast.empty(0, 0),
            ast.expression(ast.literal('2'), 0, 0),
            ast.expression(ast.literal('3'), 0, 0),
            ast.expression(ast.operator('-', ast.aggregation('sum'), ast.literal('1')), 0, 0),
        ],
        result: ['1', '', '2', '3', '4'],
    },
    {
        input: '2\n3\ntotal',
        tokens: [
            token('literal', '2'),
            token('newline', '\n'),
            token('literal', '3'),
            token('newline', '\n'),
            token('identifier', 'total'),
        ],
        statements: [
            ast.expression(ast.literal('2'), 0, 0),
            ast.expression(ast.literal('3'), 0, 0),
            ast.expression(ast.aggregation('total'), 0, 0),
        ],
        result: ['2', '3', '5'],
    },
    {
        input: '100mm\n1m\nmin',
        tokens: [
            token('literal', '100'),
            token('identifier', 'mm'),
            token('newline', '\n'),
            token('literal', '1'),
            token('identifier', 'm'),
            token('newline', '\n'),
            token('identifier', 'min'),
        ],
        statements: [
            ast.expression(ast.conversion('mm', ast.literal('100')), 0, 0),
            ast.expression(ast.conversion('m', ast.literal('1')), 0, 0),
            ast.expression(ast.aggregation('min'), 0, 0),
        ],
        result: ['100 mm', '1 m', '100 mm'],
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
        statements: [
            ast.expression(
                ast.conversion(
                    'mm',
                    ast.operator('+', ast.conversion('cm', ast.literal('1')), ast.conversion('in', ast.literal('2'))),
                ),
                0,
                0,
            ),
        ],
        result: ['60.8 mm'],
    },
    {
        input: '1 kg -> g',
        tokens: [token('literal', '1'), token('identifier', 'kg'), token('conversion', '->'), token('identifier', 'g')],
        statements: [ast.expression(ast.conversion('g', ast.conversion('kg', ast.literal('1'))), 0, 0)],
        result: ['1 000 g'],
    },
    {
        input: '4^0.5',
        tokens: [token('literal', '4'), token('operator', '^'), token('literal', '0.5')],
        statements: [ast.expression(ast.operator('^', ast.literal('4'), ast.literal('0.5')), 0, 0)],
        result: ['2'],
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
        statements: [
            ast.expression(
                ast.operator('+', ast.function('sin', ast.literal('1')), ast.function('cos', ast.literal('2'))),
                0,
                0,
            ),
        ],
        result: ['0.4253 2414 8261'],
    },
    {
        input: '1\n2',
        tokens: [token('literal', '1'), token('newline', '\n'), token('literal', '2')],
        statements: [ast.expression(ast.literal('1'), 0, 0), ast.expression(ast.literal('2'), 0, 0)],
        result: ['1', '2'],
    },
    {
        input: '#\n2',
        tokens: [token('comment', '#'), token('newline', '\n'), token('literal', '2')],
        statements: [ast.comment(0, 0), ast.expression(ast.literal('2'), 0, 0)],
        result: ['', '2'],
    },
];
