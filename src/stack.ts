export class Stack<T> {
  private arr: T[];
  private fallback: T;

  constructor(fallback: T) {
    this.arr = [];
    this.fallback = fallback;
  }

  public push(value: T): void {
    this.arr.push(value);
  }

  public pop(): T {
    return this.arr.pop() || this.fallback;
  }

  public peek(): T {
    return this.arr[this.arr.length - 1] || this.fallback;
  }
}
