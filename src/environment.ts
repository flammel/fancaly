import { Value } from "./value";

export class Environment {
  constructor(public variables: { [key: string]: Value } = {}, public lines: Value[] = []) {}
}
