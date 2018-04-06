type ListItem<T> = { type: "done" } | { type: "notDone"; value: T };

export class List<T> {
  private items: T[];
  private idx: number = -1;

  constructor(items: T[]) {
    this.items = items;
  }

  public next(): ListItem<T> {
    if (this.idx + 1 < this.items.length) {
      this.idx = this.idx + 1;
      return {
        value: this.items[this.idx],
        type: "notDone",
      };
    } else {
      return {
        type: "done",
      };
    }
  }

  public peek(ahead: number = 1): ListItem<T> {
    if (this.idx + ahead < this.items.length) {
      return {
        value: this.items[this.idx + ahead],
        type: "notDone",
      };
    } else {
      return {
        type: "done",
      };
    }
  }

  public current(): T | undefined {
    return this.items[this.idx];
  }

  public length(): number {
    return this.items.length;
  }
}
