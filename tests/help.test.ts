import { Environment } from "../lib/environment";
import { helpTextForTest } from "../lib/help";
import { Interpreter } from "../lib/interpreter";
import { testConfig } from "./testConfig";

const inputsOutputs = helpTextForTest()
  .trim()
  .split("\n")
  .map((line) =>
    line
      .trim()
      .split(/\ {5,}/)
      .map((linePart) => linePart.trim()),
  );

const interpreter = new Interpreter(testConfig());
const env = new Environment();
for (const inOut of inputsOutputs) {
  test("help line '" + inOut + "'", () => {
    expect(interpreter.evaluateLine(env, inOut[0])).toEqual(inOut[1] ? inOut[1] : "");
  });
}
