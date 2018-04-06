export class Stack<T> {
  private arr: T[];

  constructor() {
    this.arr = [];
  }

  public push(value: T): void {
    this.arr.push(value);
  }

  public pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.arr.pop();
  }

  public peek(): T | undefined {
    return this.isEmpty() ? undefined : this.arr[this.arr.length - 1];
  }

  public isEmpty(): boolean {
    return this.arr.length === 0;
  }
}
