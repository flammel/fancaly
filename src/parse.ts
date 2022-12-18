import { Result } from '@badrap/result';
import { Token } from './lex';
import { findUnit } from './Unit';

const aggregationNames = ['sum', 'total', 'average', 'avg', 'mean', 'min', 'max', 'minimum', 'maximum'] as const;
type AggregationName = typeof aggregationNames[number];

const functionNames = [
    'cos',
    'sin',
    'tan',
    'arccos',
    'arcsin',
    'arctan',
    'ln',
    'lg',
    'ld',
    'abs',
    'sqrt',
    'round',
] as const;
type FunctionName = typeof functionNames[number];

const binaryOperators = ['+', '-', '*', '/', '^', '**'] as const;
type BinaryOperator = typeof binaryOperators[number];

const prefixOperators = ['+', '-'] as const;
type PrefixOperator = typeof prefixOperators[number];

const conversionOperators = ['->', 'to', 'in'] as const;
type ConversionOperator = typeof conversionOperators[number];

export type AST =
    | { type: 'operator'; operator: BinaryOperator; lhs: AST; rhs: AST }
    | { type: 'unary'; operator: PrefixOperator; expression: AST }
    | { type: 'assignment'; variableName: string; expression: AST }
    | { type: 'literal'; value: string }
    | { type: 'variable'; name: string }
    | { type: 'function'; name: FunctionName; argument: AST }
    | { type: 'aggregation'; name: AggregationName }
    | { type: 'conversion'; unitName: string; expression: AST }
    | { type: 'empty' };

export const ast = {
    operator(operator: Extract<AST, { type: 'operator' }>['operator'], lhs: AST, rhs: AST): AST {
        return {
            type: 'operator',
            operator,
            lhs,
            rhs,
        };
    },
    unary(operator: Extract<AST, { type: 'unary' }>['operator'], expression: AST): AST {
        return { type: 'unary', operator, expression };
    },
    assignment(variableName: string, expression: AST): AST {
        return { type: 'assignment', variableName, expression };
    },
    literal(value: string): AST {
        return { type: 'literal', value };
    },
    variable(name: string): AST {
        return { type: 'variable', name };
    },
    function(name: FunctionName, argument: AST): AST {
        return { type: 'function', name, argument };
    },
    aggregation(name: Extract<AST, { type: 'aggregation' }>['name']): AST {
        return { type: 'aggregation', name };
    },
    conversion(unitName: string, expression: AST): AST {
        return { type: 'conversion', unitName, expression };
    },
    empty(): AST {
        return { type: 'empty' };
    },
};

// https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html
export function parse(tokens: Token[]): Result<AST> {
    if (tokens.length === 0) {
        return Result.ok({ type: 'empty' });
    }

    if (tokens.at(0)?.type === 'comment') {
        return Result.ok({ type: 'empty' });
    }

    const assignment = parseAssignment(tokens);
    if (assignment.isOk) {
        return assignment;
    }

    return parseRecursive(new TokenStream(tokens), 0);
}

function parseAssignment(tokens: Token[]): Result<AST> {
    const variableName = tokens.at(0);
    if (variableName?.type === 'identifier' && tokens.at(1)?.type === 'assignment') {
        return parseRecursive(new TokenStream(tokens.slice(2)), 0).map((expression) => ({
            type: 'assignment',
            variableName: variableName.value,
            expression,
        }));
    }
    return makeError('Not an assignment');
}

function parseRecursive(tokens: TokenStream, minimumBindingPower: number): Result<AST> {
    const leftResult = parseLeft(tokens);
    if (leftResult.isErr) {
        return leftResult;
    }
    let lhs = leftResult.value;

    for (;;) {
        const peekedToken = tokens.peek();
        if (peekedToken === undefined) {
            break;
        }

        if (peekedToken.type === 'rparen') {
            break;
        }

        const binaryOperator = parseBinaryOperator(peekedToken);
        if (binaryOperator.isOk) {
            if (binaryOperator.value.leftBindingPower < minimumBindingPower) {
                break;
            }

            tokens.next();
            const rhs = parseRecursive(tokens, binaryOperator.value.rightBindingPower);
            if (rhs.isOk) {
                lhs = { type: 'operator', operator: binaryOperator.value.operator, lhs, rhs: rhs.value };
            }
            continue;
        }

        const unit = parseUnit(peekedToken);
        if (unit.isOk) {
            tokens.next();
            lhs = { type: 'conversion', unitName: peekedToken.value, expression: lhs };
            continue;
        }

        const conversionOperator = parseConversionOperator(peekedToken);
        if (conversionOperator.isOk) {
            if (conversionOperator.value.bindingPower < minimumBindingPower) {
                break;
            }

            tokens.next();
            const unitName = tokens.next();
            if (unitName !== undefined) {
                lhs = { type: 'conversion', unitName: unitName.value, expression: lhs };
            }
            continue;
        }

        return makeError('Unhandled right token ' + JSON.stringify(peekedToken));
    }

    return Result.ok(lhs);
}

function parseLeft(tokens: TokenStream): Result<AST> {
    const token = tokens.next();
    if (token === undefined) {
        return makeError('LHS EOF');
    }

    if (token.type === 'literal') {
        return Result.ok({ type: 'literal', value: token.value });
    }

    if (token.type === 'lparen') {
        const result = parseRecursive(tokens, 0);
        tokens.next();
        return result;
    }

    const aggregation = parseAggregationName(token);
    if (aggregation.isOk) {
        return Result.ok({ type: 'aggregation', name: aggregation.value });
    }

    const functionName = parseFunctionName(token);
    if (functionName.isOk) {
        return parseRecursive(tokens, functionName.value.bindingPower).map((expression) => ({
            type: 'function',
            name: functionName.value.name,
            argument: expression,
        }));
    }

    const prefixOperator = parsePrefixOperator(token);
    if (prefixOperator.isOk) {
        return parseRecursive(tokens, prefixOperator.value.bindingPower).map((expression) => ({
            type: 'unary',
            operator: prefixOperator.value.operator,
            expression,
        }));
    }

    if (token.type === 'identifier') {
        return Result.ok({ type: 'variable', name: token.value });
    }

    return makeError('Unhandled left token ' + JSON.stringify(token));
}

function parseBinaryOperator(
    token: Token,
): Result<{ operator: BinaryOperator; leftBindingPower: number; rightBindingPower: number }> {
    const operator = binaryOperators.find((operator) => operator === token.value);
    if (operator === undefined) {
        return makeError('Unknown binary operator ' + token.value);
    }

    const bindingPowers: Record<BinaryOperator, [number, number]> = {
        '+': [5, 6],
        '-': [5, 6],
        '*': [7, 8],
        '/': [7, 8],
        '^': [10, 9],
        '**': [10, 9],
    };

    return Result.ok({
        operator: operator,
        leftBindingPower: bindingPowers[operator][0],
        rightBindingPower: bindingPowers[operator][1],
    });
}

function parsePrefixOperator(token: Token): Result<{ operator: PrefixOperator; bindingPower: number }> {
    const operator = prefixOperators.find((operator) => operator === token.value);
    if (operator === undefined) {
        return makeError('Unknown prefix operator ' + token.value);
    }

    return Result.ok({ operator, bindingPower: 9 });
}

function parseAggregationName(token: Token): Result<AggregationName> {
    const name = aggregationNames.find((name) => name.toLocaleLowerCase() === token.value.toLocaleLowerCase());
    if (name === undefined) {
        return makeError('Unknown aggregation ' + token.value);
    }

    return Result.ok(name);
}

function parseFunctionName(token: Token): Result<{ name: FunctionName; bindingPower: number }> {
    const name = functionNames.find((name) => name.toLocaleLowerCase() === token.value.toLocaleLowerCase());
    if (name === undefined) {
        return makeError('Unknown function ' + token.value);
    }

    return Result.ok({ name, bindingPower: 11 });
}

function parseConversionOperator(token: Token): Result<{ operator: ConversionOperator; bindingPower: number }> {
    const operator = conversionOperators.find(
        (operator) => operator.toLocaleLowerCase() === token.value.toLocaleLowerCase(),
    );
    if (operator === undefined) {
        return makeError('Unknown conversion ' + token.value);
    }

    return Result.ok({ operator, bindingPower: 4 });
}

function parseUnit(token: Token): Result<string> {
    return findUnit(token.value).map((unit) => unit.name);
}

function makeError<ValueType>(message: string): Result<ValueType> {
    return Result.err(new Error(message));
}

class TokenStream {
    private readonly tokens: Token[];
    private position: number;

    public constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.position = 0;
    }

    public next(): Token | undefined {
        return this.tokens.at(this.position++);
    }

    public peek(): Token | undefined {
        return this.tokens.at(this.position);
    }
}
