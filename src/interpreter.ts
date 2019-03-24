import { Config } from "./config";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { Formatter } from "./formatter";
import { Lexer } from "./lexer";
import { Parser } from "./parser";

export class Interpreter {
  private lexer: Lexer;
  private parser: Parser;
  private evaluator: Evaluator;
  private formatter: Formatter;

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
    return this.formatter.format(value);
  }
}
