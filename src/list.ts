type ListItem<T> = { type: "done" } | { type: "notDone"; value: T };

export class List<T> {
  private arr: T[];
  private idx: number = -1;

  constructor(arr: T[]) {
    this.arr = arr;
  }

  public next(): ListItem<T> {
    if (this.idx + 1 < this.arr.length) {
      this.idx = this.idx + 1;
      return {
        value: this.arr[this.idx],
        type: "notDone",
      };
    } else {
      return {
        type: "done",
      };
    }
  }

  public peek(ahead: number = 1): ListItem<T> {
    if (this.idx + ahead < this.arr.length) {
      return {
        value: this.arr[this.idx + ahead],
        type: "notDone",
      };
    } else {
      return {
        type: "done",
      };
    }
  }

  public current(): T | undefined {
    return this.arr[this.idx];
  }

  public length(): number {
    return this.arr.length;
  }

  public items(): T[] {
    return this.arr;
  }
}
