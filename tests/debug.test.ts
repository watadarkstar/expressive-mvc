import { Model } from '../src';
import { Debug } from '../src/debug';
import { mockConsole } from './adapter';

describe("isTypeof", () => {
  class Test extends Model {}

  it("will assert if Model extends another", () => {
    class Test2 extends Test {}

    expect(Test.isTypeof(Test2)).toBe(true);
  })

  it("will be falsy if not super", () => {
    class NotATest extends Model {}

    expect(Model.isTypeof(NotATest)).toBe(true);
    expect(Test.isTypeof(NotATest)).toBe(false);
  })
})

describe("Symbols", () => {
  class FooBar extends Model {
    foo = "foo";
    bar = "bar";
  }

  it("will be defined", () => {
    expect(Debug.CONTROL).toBeDefined()
    expect(Debug.STATE).toBeDefined()
    expect(Debug.LOCAL).toBeDefined()
  })

  it("will expose instance controller", () => {
    const instance = FooBar.create() as Debug<FooBar>;
    const control = instance[Debug.CONTROL];

    expect(control).toBeDefined();
  })

  it("will expose instance state", () => {
    const instance = FooBar.create() as Debug<FooBar>;
    const exported = instance.export();
    const state = instance[Debug.STATE];

    expect(state).toMatchObject(exported);
  })

  it("will expose subscriber within listener", () => {
    const instance = FooBar.create() as Debug<FooBar>;

    expect(instance[Debug.LOCAL]).toBeUndefined();

    instance.effect(local => {
      expect(local[Debug.CONTROL]).toBe(instance[Debug.CONTROL]);
      expect(local[Debug.LOCAL]).toBeDefined();
    })
  })
})

describe("WHY", () => {
  class Test extends Model {
    value1 = 1;
    value2 = 2;
    value3 = 3;
  }

  it("will reveal last update", async () => {
    const test = Test.create() as Debug<Test>;

    test.value1 = 2;
    test.value2 = 3;

    const update = await test.update();
    const updated = test[Debug.WHY];

    expect(update).toStrictEqual(updated);

    expect(updated).toContain("value1");
    expect(updated).toContain("value2");
  })

  it("will reveal cause for update", async () => {
    const test = Test.create() as Debug<Test>;

    let update: readonly string[] | undefined;
    let fullUpdate: readonly string[] | false;

    test.effect(state => {
      void state.value1;
      void state.value3;

      update = state[Debug.WHY];
    })

    expect(update).toBeUndefined();

    test.value1 = 2;
    test.value2 = 3;

    fullUpdate = await test.update();

    // sanity check
    expect(update).not.toStrictEqual(fullUpdate);
    expect(fullUpdate).toContain("value2");

    expect(update).toContain("value1");
    expect(update).not.toContain("value2");

    test.value3 = 4;

    fullUpdate = await test.update();

    // sanity check
    expect(fullUpdate).not.toContain("value1");

    expect(update).toContain("value3");
    expect(fullUpdate).toContain("value3");
  })
})

describe("toString", () => {
  class Test extends Model {};

  it("Model will cast to string as class name", () => {
    const test = Test.create();
    expect(String(test)).toBe("Test");
  })
})

describe("errors", () => {
  const { error } = mockConsole();

  it("will log update errors in the console", async () => {
    class Test extends Model {
      value = 1;
    };

    const expected = new Error("Goodbye cruel world!")
    const test = Test.create();

    test.on("value", () => {
      throw expected;
    });

    test.value = 2;

    await test.update();

    expect(error).toBeCalledWith(expected);
  });
})