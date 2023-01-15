import { Result } from '@badrap/result';
import { Environment } from './Environment';
import { Expression, Line } from './parse';
import { assertNever } from './assertNever';
import { Value } from './Value';
import { findUnit } from './Unit';

export function evaluate(environment: Environment, line: Line): Result<Value | null, Error> {
    switch (line.type) {
        case 'expression':
            return evaluateExpression(environment, line.expression);
        case 'assignment':
            return evaluateExpression(environment, line.expression).map((value) => {
                environment.setVariable(line.variableName, value);
                return value;
            });
        case 'comment':
            return Result.ok(null);
        case 'empty':
            return Result.ok(null);
        default:
            assertNever(line);
    }
}

export function evaluateExpression(environment: Environment, expression: Expression): Result<Value, Error> {
    switch (expression.type) {
        case 'literal':
            return Value.fromString(expression.value);
        case 'operator':
            return Result.all([
                evaluateExpression(environment, expression.lhs),
                evaluateExpression(environment, expression.rhs),
            ]).chain(([lhs, rhs]) => operation(expression.operator, lhs, rhs));
        case 'unary':
            return evaluateExpression(environment, expression.expression).chain((value) =>
                expression.operator === '-' ? value.negated() : Result.ok(value),
            );
        case 'aggregation':
            return aggregation(environment, expression.name);
        case 'variable':
            return environment.getVariable(expression.name);
        case 'conversion':
            return Result.all([
                findUnit(expression.unitName),
                evaluateExpression(environment, expression.expression),
            ]).chain(([unit, value]) => value.convertTo(unit));
        case 'function':
            return evaluateFunction(environment, expression.name, expression.argument);
        case 'cons':
            return Result.err(new Error('Standalone cons'));
        default:
            assertNever(expression);
    }
}

function operation(
    name: Extract<Expression, { type: 'operator' }>['operator'],
    lhs: Value,
    rhs: Value,
): Result<Value, Error> {
    switch (name) {
        case '+':
            return lhs.plus(rhs);
        case '-':
            return lhs.minus(rhs);
        case '*':
            return lhs.times(rhs);
        case '/':
            return lhs.dividedBy(rhs);
        case '^':
            return lhs.pow(rhs);
        case '**':
            return lhs.pow(rhs);
        case '==':
            return lhs.equals(rhs);
        case '===':
            return lhs.equals(rhs);
        case '!=':
            return lhs.notEquals(rhs);
        case '!==':
            return lhs.notEquals(rhs);
        default:
            assertNever(name);
    }
}

function aggregation(
    environment: Environment,
    name: Extract<Expression, { type: 'aggregation' }>['name'],
): Result<Value, Error> {
    switch (name) {
        case 'sum':
        case 'total':
            return Value.sum(getAggregationValues(environment));
        case 'avg':
        case 'average':
        case 'mean':
            return Value.average(getAggregationValues(environment));
        case 'min':
        case 'minimum':
            return Value.minimum(getAggregationValues(environment));
        case 'max':
        case 'maximum':
            return Value.maximum(getAggregationValues(environment));
        default:
            assertNever(name);
    }
}

function evaluateFunction(
    environment: Environment,
    name: Extract<Expression, { type: 'function' }>['name'],
    argument: Expression,
): Result<Value, Error> {
    if (name === 'round' && argument.type === 'cons' && argument.next !== null) {
        return Result.all([
            evaluateExpression(environment, argument.expression),
            evaluateExpression(environment, argument.next),
        ]).chain(([value, decimalPlaces]) => Value.round(value, decimalPlaces.bignum.toNumber()));
    }

    return evaluateExpression(environment, argument).chain((value) => applyFunction(name, value));
}

function applyFunction(name: Extract<Expression, { type: 'function' }>['name'], argument: Value): Result<Value, Error> {
    switch (name) {
        case 'cos':
            return Value.cos(argument);
        case 'sin':
            return Value.sin(argument);
        case 'tan':
            return Value.tan(argument);
        case 'arccos':
            return Value.arccos(argument);
        case 'arcsin':
            return Value.arcsin(argument);
        case 'arctan':
            return Value.arctan(argument);
        case 'ln':
            return Value.ln(argument);
        case 'lg':
            return Value.lg(argument);
        case 'ld':
            return Value.ld(argument);
        case 'abs':
            return Value.abs(argument);
        case 'sqrt':
            return Value.sqrt(argument);
        case 'round':
            return Value.round(argument);
        default:
            assertNever(name);
    }
}

function getAggregationValues(environment: Environment): Value[] {
    let values: Value[] = [];
    for (const result of environment.getResults()) {
        if (result.isErr || result.value === null) {
            values = [];
        } else {
            values.push(result.value);
        }
    }
    return values;
}
