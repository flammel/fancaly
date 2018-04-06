type ListItem<T> = { done: true } | { done: false; value: T };

export class List<T> {
  private tokens: T[];
  private idx: number = -1;

  constructor(tokens: T[]) {
    this.tokens = tokens;
  }

  public next(): ListItem<T> {
    if (this.idx + 1 < this.tokens.length) {
      this.idx = this.idx + 1;
      return {
        value: this.tokens[this.idx],
        done: false,
      };
    } else {
      return {
        done: true,
      };
    }
  }

  public peek(ahead: number = 1): ListItem<T> {
    if (this.idx + ahead < this.tokens.length) {
      return {
        value: this.tokens[this.idx + ahead],
        done: false,
      };
    } else {
      return {
        done: true,
      };
    }
  }

  public current(): T | undefined {
    return this.tokens[this.idx];
  }
}
