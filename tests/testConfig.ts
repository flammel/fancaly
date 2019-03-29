import { Config } from "../lib/config";
import { defaultConfig } from "../lib/defaultConfig";
import { makeUnit } from "../lib/unit";

export function testConfig(decimalSeparator: string = "."): Config {
  const config = defaultConfig(decimalSeparator);
  config.getUnits().addUnit(makeUnit("USD", "1", "USD", "$", ["dollar", "dollars"]));
  config.getUnits().addUnit(makeUnit("USD", "1", "EUR", "€", ["euro", "euros"]));
  config.getUnits().addUnit(makeUnit("USD", "1", "GBP"));
  return config;
}
