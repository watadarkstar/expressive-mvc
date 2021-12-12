import { renderHook } from "@testing-library/react-hooks";
import { Oops } from "../src/singleton";
import { Singleton } from "./adapter";

describe("singleton", () => {
  class Global extends Singleton {
    value = 1;
  }
  
  afterEach(() => Global.reset());

  it("will access values from create global", () => {
    const hook = renderHook(() => Global.use());
  
    expect(hook.result.current.value).toBe(1);
  })
  
  it("will find existing instance", () => {
    const instance = Global.create();
    const found = Global.find();
  
    expect(found).toBe(instance);
  })

  it("will get an existing instance", () => {
    const instance = Global.create();
    const found = Global.is();
  
    expect(found).toBe(instance);
  })

  it("will throw if cannot get instance", () => {
    const expected = Oops.GlobalDoesNotExist(Global.name);

    expect(() => Global.is()).toThrowError(expected);
  })
  
  it("will complain if not initialized", () => {
    Global.create();
    expect(Global.get()).toBeDefined();
  
    Global.reset();
    expect(Global.get()).toBeUndefined();
  })
  
  it("will destroy active instance on reset", () => {
    const hook = renderHook(() => Global.tap());
    const expected = Oops.GlobalDoesNotExist(Global.name);
    
    expect(() => hook.result.current).toThrowError(expected);
  })
  
  it("will access values from found global", () => {
    Global.create();
    const rendered = renderHook(() => Global.get("value"));
  
    expect(rendered.result.current).toBe(1);
  })
  
  it("will complain already exists", () => {
    Global.create();
    const expected = Oops.GlobalExists(Global.name);
    
    expect(() => Global.create()).toThrowError(expected);
  })
})

describe("update", () => {
  class Global extends Singleton {
    foo = 1;
    bar = 2;
  }
  
  afterEach(() => Global.reset());

  it("will update values on singleton instance", async () => {
    Global.create();
    
    expect(Global.get("foo")).toBe(1);
    expect(Global.get("bar")).toBe(2);

    const update = await Global.update({ foo: 2, bar: 1 });

    expect(update).toMatchObject(["foo", "bar"]);

    expect(Global.get("foo")).toBe(2);
    expect(Global.get("bar")).toBe(1);
  })

  it("will create then update instance", async () => {
    const update = await Global.update({ foo: 1, bar: 2 });

    expect(update).toBe(false);

    expect(Global.get("foo")).toBe(1);
    expect(Global.get("bar")).toBe(2);
  })
})