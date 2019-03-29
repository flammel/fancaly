import { Config, Units } from "./config";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { Formatter } from "./formatter";
import { Lexer } from "./lexer";
import { Parser, RPN } from "./parser";
import { unitless } from "./unit";
import { isNumeric, NumericValue, Value } from "./value";

function dp(num: BigNumber): number {
  return (num.decimalPlaces(4).decimalPlaces() as unknown) as number;
}

export class Interpreter {
  private lexer: Lexer;
  private parser: Parser;
  private evaluator: Evaluator;
  private formatter: Formatter;
  private units: Units;

  constructor(config: Config) {
    this.lexer = new Lexer(
      config.getOperators().getNames(),
      config.getFunctions().getNames(),
      config.getUnits().getNames(),
      config.getValueGenerators().getAggregatorNames(),
      config.getFormatter(),
    );
    this.parser = new Parser(
      config.getOperators(),
      config.getFunctions(),
      config.getUnits(),
      config.getValueGenerators(),
      config.getFormatter(),
    );
    this.evaluator = new Evaluator();
    this.formatter = config.getFormatter();
    this.units = config.getUnits();
  }

  public evaluateLine(env: Environment, line: string): string {
    const lexed = this.lexer.lex(line);
    if (lexed.type === "error") {
      return "";
    }
    const parsed = this.parser.parse(lexed.tokens);
    if (parsed.type === "error") {
      return "";
    }
    const value = this.evaluator.evaluate(parsed.rpn, env);
    return this.formatter.format(this.determineOutputUnit(parsed.rpn, value));
  }

  private determineOutputUnit(rpn: RPN, value: Value): Value {
    if (!isNumeric(value) || value.unit === unitless) {
      return value;
    }
    if (!this.shouldChangeUnit(rpn)) {
      return value;
    }

    const otherUnits = this.units.getAutoConversionGroup(value.unit);
    if (otherUnits.length < 1) {
      return value;
    }

    const baseUnit = this.units.getUnit(value.unit.base);
    if (baseUnit === undefined) {
      return value;
    }

    const valueInBase = new NumericValue(value.value.times(value.unit.multiplier), baseUnit);
    let curr = valueInBase;
    let prev;
    for (const unit of otherUnits) {
      prev = curr;
      curr = valueInBase.withNewUnit(unit);
      if (dp(curr.value) > dp(prev.value)) {
        curr = prev;
        break;
      }
    }

    if (otherUnits.indexOf(curr.unit) === -1) {
      return value;
    } else {
      return curr;
    }
  }

  private shouldChangeUnit(rpn: RPN): boolean {
    let containsOperators = false;
    for (const item of rpn.items()) {
      if (item.type === "operator") {
        containsOperators = true;
        if (item.operator.operator === "to" || item.operator.operator === "as") {
          return false;
        }
      }
    }
    return containsOperators;
  }
}
