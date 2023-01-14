import { Result } from '@badrap/result';
import { Environment } from './Environment';
import { Statement, Program, Expression } from './parse';
import { assertNever } from './assertNever';
import { Value } from './Value';
import { findUnit } from './Unit';

export class ErrorWithPosition extends Error {
    constructor(message: string, public readonly from: number, public readonly to: number) {
        super(message);
    }
}

export function evaluate(program: Program): Environment {
    const environment = new Environment();
    program.statements.forEach((statement) => {
        environment.addResult(
            statement.isOk ? evaluateStatement(environment, statement.value) : Result.err(statement.error),
        );
    });
    return environment;
}

function evaluateStatement(environment: Environment, statement: Statement): Result<Value | null, Error> {
    switch (statement.type) {
        case 'empty':
            return Result.ok(null);
        case 'comment':
            return Result.ok(null);
        case 'expression':
            return evaluateExpression(environment, statement.expression).map(
                (value) => value,
                (error) => new ErrorWithPosition(error.message, statement.pos.from, statement.pos.to),
            );
        case 'assignment':
            return evaluateExpression(environment, statement.expression).map(
                (value) => {
                    environment.setVariable(statement.variableName, value);
                    return value;
                },
                (error) => new ErrorWithPosition(error.message, statement.pos.from, statement.pos.to),
            );
        default:
            assertNever(statement);
    }
}

function evaluateExpression(environment: Environment, ast: Expression): Result<Value, Error> {
    switch (ast.type) {
        case 'literal':
            return Value.fromString(ast.value);
        case 'operator':
            return Result.all([
                evaluateExpression(environment, ast.lhs),
                evaluateExpression(environment, ast.rhs),
            ]).chain(([lhs, rhs]) => operation(ast.operator, lhs, rhs));
        case 'unary':
            return evaluateExpression(environment, ast.expression).chain((value) =>
                ast.operator === '-' ? value.negated() : Result.ok(value),
            );
        case 'aggregation':
            return aggregation(environment, ast.name);
        case 'variable':
            return environment.getVariable(ast.name);
        case 'conversion':
            return Result.all([findUnit(ast.unitName), evaluateExpression(environment, ast.expression)]).chain(
                ([unit, value]) => value.convertTo(unit),
            );
        case 'function':
            return evaluateExpression(environment, ast.argument).chain((value) => applyFunction(ast.name, value));
        default:
            assertNever(ast);
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
