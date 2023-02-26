import { run, Model } from '..';
import { Oops } from './run';
import { set } from './set';

class Test extends Model {
  test = run(this.wait);
  nope = run(this.fail);

  async wait<T>(input?: T){
    return new Promise<T | undefined>(res => {
      setTimeout(() => res(input), 1)
    });
  }

  async fail(){
    await new Promise(r => setTimeout(r, 1));
    throw new Error("Nope");
  }
}

it("will pass arguments to wrapped function", async () => {
  const control = Test.new();
  const input = Symbol("unique");
  const output = control.test(input);

  await expect(output).resolves.toBe(input);
})

it("will set active to true for run-duration", async () => {
  const { test } = Test.new();

  expect(test.active).toBe(false);

  const result = test("foobar");
  expect(test.active).toBe(true);

  const output = await result;
  expect(output).toBe("foobar");
  expect(test.active).toBe(false);
})

it("will emit method key before/after activity", async () => {
  let update: readonly string[];
  const { test, is } = Test.new();

  expect(test.active).toBe(false);

  const result = test("foobar");
  update = await is.on(true);

  expect(test.active).toBe(true);
  expect(update).toContain("test");

  const output = await result;
  update = await is.on(true);

  expect(test.active).toBe(false);
  expect(update).toContain("test");
  expect(output).toBe("foobar");
})

it("will throw immediately if already in-progress", () => {
  const { test } = Test.new();
  const expected = Oops.DuplicatePending("test");

  test();
  expect(() => test()).rejects.toThrowError(expected);
})

it("will throw and reset if action fails", async () => {
  const { nope, is: test } = Test.new();

  expect(nope.active).toBe(false);

  const result = nope();

  await test.on(true);
  expect(nope.active).toBe(true);

  await expect(result).rejects.toThrowError();
  expect(nope.active).toBe(false);
})

it("will complain if property is redefined", () => {
  const state = Test.new();
  const assign = () => state.test = 0 as any;

  expect(assign).toThrowError();
})

it("will internally retry on suspense", async () => {
  class Test extends Model {
    value = set<string>();

    getValue = run(async () => {
      didInvoke();
      return this.value;
    })
  }

  const didInvoke = jest.fn();
  const test = Test.new();
  const value = test.getValue();

  expect(didInvoke).toBeCalled();
  await test.on(true);

  test.value = "foobar";

  await expect(value).resolves.toBe("foobar");
  await test.on(true);

  expect(didInvoke).toBeCalledTimes(2);
})