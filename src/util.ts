/**
 * For exhaustiveness checking.
 */
/* istanbul ignore next  */
export function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}
