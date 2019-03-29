export class Stack<T> {
  private readonly arr: T[];
  private readonly fallback: T;

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

  public popUntil(predicate: (_: T) => boolean): T {
    let stackTop = this.arr.pop();
    while (stackTop !== undefined && !predicate(stackTop)) {
      stackTop = this.arr.pop();
    }
    return stackTop || this.fallback;
  }
}
