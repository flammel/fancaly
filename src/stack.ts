export class Stack<T> {
  private arr: T[];

  constructor() {
    this.arr = [];
  }

  public push(value: T): void {
    this.arr.push(value);
  }

  public pop(): T | undefined {
    return this.arr.pop();
  }

  public peek(): T | undefined {
    return this.arr[this.arr.length - 1];
  }
}
