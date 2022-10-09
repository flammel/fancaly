import { Result } from '@badrap/result';
import { Context } from './Context';
import { Environment } from './Environment';
import { AST } from './parse';
import { assertNever } from './assertNever';
import { Value } from './Value';

export function evaluate(context: Context, environment: Environment, ast: AST): Result<Value, Error> {
    switch (ast.type) {
        case 'number':
            return ast.unit === undefined
                ? Value.fromString(ast.value)
                : context.getUnit(ast.unit).chain((unit) => Value.fromString(ast.value, unit));
        case 'operator':
            return Result.all([
                context.getOperator(ast.operator),
                evaluate(context, environment, ast.lhs),
                evaluate(context, environment, ast.rhs),
            ]).chain(([operator, lhs, rhs]) => operator.operation(lhs, rhs));
        case 'negation':
            return evaluate(context, environment, ast.operand).chain((value) => value.negated());
        case 'assignment':
            return evaluate(context, environment, ast.expression).map((value) => {
                environment.setVariable(ast.variableName, value);
                return value;
            });
        case 'variable':
            return context.getAggregator(ast.name).chain(
                (aggregator) => aggregator.operation(environment.getAggregatorValues()),
                () => environment.getVariable(ast.name),
            );
        case 'conversion':
            return Result.all([context.getUnit(ast.unit), evaluate(context, environment, ast.expression)]).chain(
                ([unit, value]) => value.convertTo(unit),
            );
        case 'empty':
            return Result.err(new Error(''));
        default:
            assertNever(ast);
    }
}
