import { Config } from "./config";
import { Environment } from "./environment";
import { Evaluator } from "./evaluator";
import { Lexer } from "./lexer";
import { Parser } from "./parser";

export class Interpreter {
  private lexer: Lexer;
  private parser: Parser;
  private evaluator: Evaluator;

  constructor(config: Config) {
    this.lexer = new Lexer(
      config.getOperators().getNames(),
      config.getUnits().getNames(),
      config.getValueGenerators().getAggregatorNames(),
    );
    this.parser = new Parser(config.getOperators(), config.getUnits(), config.getValueGenerators());
    this.evaluator = new Evaluator();
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
    const formatter = (value: BigNumber) => value.dp(4).toFormat();
    return evaluated.toString(formatter);
  }
}
