import { renderHook } from '@testing-library/react-hooks';

import { Global } from './global';
import { Oops } from './mvc';

describe("init", () => {
  class Test extends Global {
    value = 1;
  }

  afterEach(() => {
    Test.get(instance => {
      instance.end(true);
    });
  });

  it("will access values from created global", () => {
    const hook = renderHook(() => Test.use());

    expect(hook.result.current.value).toBe(1);
  })

  it("will get an existing instance", () => {
    const instance = Test.new();

    expect(Test.get()).toBe(instance);
  })

  it("will throw if cannot get instance", () => {
    const expected = Oops.DoesNotExist(Test.name);

    expect(() => Test.get()).toThrowError(expected);
  })

  it("will return undefined if not initialized", () => {
    Test.new();
    expect(Test.get()).toBeDefined();

    Test.get().end(true);
    expect(Test.get(false)).toBeUndefined();
  })

  it("will throw if Global does not exist", () => {
    const hook = renderHook(() => Test.tap());
    const expected = Oops.DoesNotExist(Test.name);

    expect(() => hook.result.current).toThrowError(expected);
  })

  it("will access values from found global", () => {
    Test.new();
    const rendered = renderHook(() => Test.get("value"));

    expect(rendered.result.current).toBe(1);
  })

  it("will complain already exists", () => {
    class Test extends Global {
      static keepAlive = false;
    }

    Test.new();
    const expected = Oops.AlreadyExists(Test.name);

    expect(() => Test.new()).toThrowError(expected);
  })
})