import { Environment } from "./environment";
import { EmptyValue, Value } from "./value";

export interface ValueGenerator {
  operation: (env: Environment) => Value;
  name: string;
}

export type Aggregator = ValueGenerator;

function readVariable(varName: string, env: Environment): Value {
  if (env.variables[varName] !== undefined) {
    return env.variables[varName];
  } else {
    return new EmptyValue();
  }
}

export class VariableReader implements ValueGenerator {
  public name = "readVariable";

  constructor(private varName: string) {}

  public operation(env: Environment): Value {
    return readVariable(this.varName, env);
  }
}
