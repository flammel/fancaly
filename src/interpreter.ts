import { Config } from "./config";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { Lexer } from "./lexer";
import { NumberFormat } from "./numberFormat";
import { Parser } from "./parser";

export class Interpreter {
  private lexer: Lexer;
  private parser: Parser;
  private evaluator: Evaluator;
  private numberFormat: NumberFormat;

  constructor(config: Config) {
    this.lexer = new Lexer(
      config.getOperators().getNames(),
      config.getUnits().getNames(),
      config.getValueGenerators().getAggregatorNames(),
      config.getNumberFormat(),
    );
    this.parser = new Parser(
      config.getOperators(),
      config.getUnits(),
      config.getValueGenerators(),
      config.getNumberFormat(),
    );
    this.evaluator = new Evaluator();
    this.numberFormat = config.getNumberFormat();
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
    const evaluated = this.evaluator.evaluate(parsed.rpn, env);
    return evaluated.toString(this.numberFormat.getFormatter());
  }
}
