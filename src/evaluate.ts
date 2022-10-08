import { Result } from '@badrap/result';
import BigNumber from 'bignumber.js';
import { assertNever } from './assertNever';
import { AST } from './AST';
import { Context } from './Context';
import { Environment } from './Environment';
import { negateValue, Value, value } from './Value';
import { notEmpty } from './notEmpty';

export function evaluate(context: Context, environment: Environment, ast: AST): Result<Value, Error> {
    switch (ast.type) {
        case 'number':
            return Result.ok(value(new BigNumber(ast.value.replace(',', '.')), ast.unit));
        case 'operator':
            return evaluateOperator(context, environment, ast);
        case 'negation':
            return evaluateNegation(context, environment, ast);
        case 'assignment':
            return evaluateAssignment(context, environment, ast);
        case 'variable':
            return evaluateVariable(context, environment, ast);
        case 'empty':
            return Result.err(new Error(''));
        default:
            assertNever(ast);
    }
}

function evaluateOperator(
    context: Context,
    environment: Environment,
    ast: Extract<AST, { type: 'operator' }>,
): Result<Value, Error> {
    const lhs = evaluate(context, environment, ast.lhs);
    if (lhs.isErr) {
        return lhs;
    }
    const rhs = evaluate(context, environment, ast.rhs);
    if (rhs.isErr) {
        return rhs;
    }
    const operation = context.operators.get(ast.operator)?.operation;
    if (operation === undefined) {
        return Result.err(new Error('No operation for ' + ast.operator));
    }
    return operation(lhs.value, rhs.value);
}

function evaluateNegation(
    context: Context,
    environment: Environment,
    ast: Extract<AST, { type: 'negation' }>,
): Result<Value, Error> {
    const operandResult = evaluate(context, environment, ast.operand);
    if (operandResult.isErr) {
        return operandResult;
    }
    return Result.ok(negateValue(operandResult.value));
}

function evaluateAssignment(
    context: Context,
    environment: Environment,
    ast: Extract<AST, { type: 'assignment' }>,
): Result<Value, Error> {
    const value = evaluate(context, environment, ast.expression);
    if (value.isErr) {
        return value;
    }
    environment.variables.set(ast.variableName, value.value);
    return Result.ok(value.value);
}

function evaluateVariable(
    context: Context,
    environment: Environment,
    ast: Extract<AST, { type: 'variable' }>,
): Result<Value, Error> {
    const aggregator = context.aggregators.get(ast.name);
    if (aggregator !== undefined) {
        const lastUndefinedIndex = environment.lines.lastIndexOf(undefined);
        const lines = lastUndefinedIndex === -1 ? environment.lines : environment.lines.slice(lastUndefinedIndex + 1);
        const filteredLines = lines.filter(notEmpty);
        if (filteredLines.length === 0) {
            return Result.err(new Error('No lines'));
        }
        return Result.ok(aggregator.operation(filteredLines));
    }
    const value = environment.variables.get(ast.name);
    if (value === undefined) {
        return Result.err(new Error('Undefined variable ' + ast.name));
    }
    return Result.ok(value);
}
