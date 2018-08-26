import { Environment } from "./environment";
import { EmptyValue, Value } from "./value";

export interface ValueGenerator {
  operation: (env: Environment) => Value;
  name: string;
}

export type Aggregator = ValueGenerator;

export class VariableReader implements ValueGenerator {
  public name = "readVariable";
  public operation: (env: Environment) => Value;

  constructor(varName: string) {
    this.operation = (env: Environment) => {
      if (env.variables[varName] !== undefined) {
        return env.variables[varName];
      } else {
        return new EmptyValue();
      }
    };
  }
}
