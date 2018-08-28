export class NumberFormat {
  private decimalSeparator: string;

  constructor(decimalSeparator: string) {
    this.decimalSeparator = decimalSeparator;
  }

  public getRegExp(): RegExp {
    return new RegExp("^([0-9]+(?:" + escapeRegExp(this.decimalSeparator) + "[0-9]+)?)\\s*(.*)$");
  }

  public parse(value: string): string {
    if (this.decimalSeparator === ".") {
      return value;
    }
    return value.replace(this.decimalSeparator, ".");
  }

  public getFormatter(): (value: BigNumber) => string {
    return (value) => value.dp(4).toFormat();
  }
}

/**
 * https://stackoverflow.com/a/6969486
 */
export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
