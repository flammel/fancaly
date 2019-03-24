import { isDateTime, isNumeric, Value } from "./value";

export class Formatter {
  private decimalSeparator: string;

  constructor(decimalSeparator: string) {
    this.decimalSeparator = decimalSeparator;
  }

  public getNumberRegExp(): RegExp {
    return new RegExp("^([0-9]+(?:" + escapeRegExp(this.decimalSeparator) + "[0-9]+)?)\\s*(.*)$");
  }

  public getDateRegExp(): RegExp {
    return new RegExp("^([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9])(.*)$");
  }

  public parseNumber(value: string): string {
    if (this.decimalSeparator === ".") {
      return value;
    }
    return value.replace(this.decimalSeparator, ".");
  }

  public format(value: Value): string {
    if (isNumeric(value)) {
      return value.unit.format(value.value.dp(4).toFormat());
    }

    if (isDateTime(value)) {
      if (value.withTime) {
        return value.date.toISOString();
      } else {
        return value.date.toISOString().substr(0, 10);
      }
    }

    return "";
  }
}

/**
 * https://stackoverflow.com/a/6969486
 */
export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
