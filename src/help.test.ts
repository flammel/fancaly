import { defaultConfig } from "./defaultConfig";
import { Environment } from "./environment";
import { helpTextForTest } from "./help";
import { Interpreter } from "./interpreter";

const inputsOutputs = helpTextForTest()
  .trim()
  .split("\n")
  .map((line) =>
    line
      .trim()
      .split(/\ {5,}/)
      .map((linePart) => linePart.trim()),
  );

test("help", () => {
  const interpreter = new Interpreter(defaultConfig());
  const env = new Environment();
  for (const inOut of inputsOutputs) {
    expect(interpreter.evaluateLine(env, inOut[0])).toEqual(inOut[1] ? inOut[1] : "");
  }
});
