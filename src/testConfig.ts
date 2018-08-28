import { Config } from "./config";
import { defaultConfig } from "./defaultConfig";
import { UnitName } from "./unit";

export function testConfig(decimalSeparator: string = "."): Config {
  const config = defaultConfig(decimalSeparator);
  addUnit(config, "USD", "1", "USD", "$", "dollar", "dollars");
  addUnit(config, "USD", "1", "EUR", "€", "euro", "euros");
  addUnit(config, "USD", "1", "GBP");
  return config;
}

function addUnit(config: Config, base: UnitName, multiplier: string, ...names: UnitName[]) {
  config
    .getUnits()
    .addUnit(
      base,
      multiplier,
      (formattedNumber: string) => formattedNumber + " " + names[0],
      ...names,
    );
}
