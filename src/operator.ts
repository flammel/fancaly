import { Stack } from "./stack";
import { Value } from "./value";

export type Operation = (stack: Stack<Value>) => Value;

export interface Operator {
  associativity: "left" | "right";
  operation: Operation;
  operator: string;
  precedence: number;
}
