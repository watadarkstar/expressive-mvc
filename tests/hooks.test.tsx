import React from 'react';

import { Oops as Global } from '../src/singleton';
import { Model, Provider, render, renderHook, Singleton, use } from './adapter';

const opts = { timeout: 100 };

describe("use (instance)", () => {
  class Test extends Model {
    value = "foo";
  };

  it("will run callback", () => {
    const instance = Test.create();
    const callback = jest.fn();

    renderHook(() => instance.use(callback));
    expect(callback).toHaveBeenCalledWith(instance);
  })

  it("will subscribe to instance of controller", async () => {
    const instance = Test.create();

    const { result, waitForNextUpdate } =
      renderHook(() => instance.use());

    expect(result.current.value).toBe("foo");

    instance.value = "bar";
    await waitForNextUpdate(opts);
    expect(result.current.value).toBe("bar");
  })
})

describe("use (static)", () => {
  class Test extends Model {
    value = "foo";
  };

  it("will run callback", () => {
    const callback = jest.fn();
    renderHook(() => Test.use(callback));
    expect(callback).toHaveBeenCalledWith(expect.any(Test));
  })

  it("will subscribe to instance of controller", async () => {
    const { result, waitForNextUpdate } =
      renderHook(() => Test.use());

    expect(result.current.value).toBe("foo");

    result.current.value = "bar";

    await waitForNextUpdate(opts);
    expect(result.current.value).toBe("bar");
  })
})

describe("uses", () => {
  class Test extends Model {
    foo?: string = undefined;
    bar?: string = undefined;
  }

  it("will apply values", () => {
    const mockExternal = {
      foo: "foo",
      bar: "bar"
    }

    const { result } = renderHook(() => {
      return Test.uses(mockExternal).export();
    });

    expect(result.current).toMatchObject(mockExternal);
  })

  it("will apply select values", () => {
    const mockExternal = {
      foo: "foo",
      bar: "bar"
    }

    const { result } = renderHook(() => {
      return Test.uses(mockExternal, ["foo"]).export();
    });

    expect(result.current).toMatchObject({
      bar: undefined,
      foo: "foo"
    });
  })
})

describe("using", () => {
  class Test extends Model {
    foo?: string = undefined;
    bar?: string = undefined;
  }

  it("will apply values per-render", async () => {
    let instance!: Test;

    const Component = (props: any) => {
      ({ get: instance } = Test.using(props));
      return null;
    }

    const rendered = render(<Component />);

    expect(instance).toBeInstanceOf(Test);

    rendered.update(<Component foo="foo" bar="bar" />);

    const update = await instance.update();

    expect(update).toEqual(
      expect.arrayContaining(["foo", "bar"])
    );
  })

  it.skip("will not render twice for new props", async () => {
    const didRender = jest.fn();
    let instance!: Test;
    let update: false | readonly string[];

    const Component = (props: any) => {
      ({ get: instance } = Test.using(props));
      didRender();
      return null;
    }

    const rendered = render(<Component />);

    expect(instance).toBeInstanceOf(Test);

    rendered.update(<Component foo="foo" bar="bar" />);
    update = await instance.update();

    expect(didRender).toBeCalledTimes(2);
    expect(update).toEqual(
      expect.arrayContaining(["foo", "bar"])
    );

    rendered.update(<Component foo="bar" bar="foo" />);
    update = await instance.update();

    expect(didRender).toBeCalledTimes(3);

    await instance.update(false);
    expect(didRender).toBeCalledTimes(3);
  })
})

describe("get", () => {
  class Test extends Singleton {
    value = 1;
  }

  beforeEach(() => Test.reset());

  it("will get instance", () => {
    const instance = Test.create();
    const { result } = renderHook(() => Test.get());

    expect(result.current).toBe(instance);
    expect(result.current!.value).toBe(1);
  })

  it("will get instance value", () => {
    Test.create();
    const { result } = renderHook(() => {
      return Test.get("value");
    });

    expect(result.current).toBe(1);
  })

  it("will get value using selector", () => {
    Test.create();
    const { result } = renderHook(() => {
      return Test.get(x => x.value);
    });

    expect(result.current).toBe(1);
  })

  it("will complain if not-found in expect mode", () => {
    const { result } = renderHook(() => Test.get(true));
    const expected = Global.GlobalDoesNotExist(Test.name);

    expect(() => result.current).toThrowError(expected);
  })
})

describe("new", () => {
  class Test extends Model {
    value = 1;
    destroy = jest.fn();
  }

  it("will get instance value", () => {
    const { result } = renderHook(() => Test.new());

    expect(result.current).toBeInstanceOf(Test);
  });

  it("will run callback after creation", () => {
    const callback = jest.fn();
    renderHook(() => Test.new(callback));
    expect(callback).toHaveBeenCalledWith(expect.any(Test));
  })

  it("will destroy on unmount", () => {
    const { result, unmount } = renderHook(() => Test.new());
    const { destroy } = result.current!;

    expect(result.current).toBeInstanceOf(Test);
    unmount();

    expect(destroy).toBeCalled();
  })
})

describe("tap", () => {
  class Parent extends Model {
    value = "foo";
    empty = undefined;
    child = use(Child);
  }
  
  class Child extends Model {
    value = "foo"
    grandchild = new GrandChild();
  }
  
  class GrandChild extends Model {
    value = "bar"
  }

  it('will access subvalue directly', async () => {
    const parent = Parent.create();

    const { result, waitForNextUpdate } =
      renderHook(() => parent.tap("value"))
  
    expect(result.current).toBe("foo");
  
    parent.value = "bar";
    await waitForNextUpdate(opts);
    expect(result.current).toBe("bar");
  })
  
  it('will access child controller', async () => {
    const parent = Parent.create();
    const { result, waitForNextUpdate } = renderHook(() => {
      return parent.tap("child").value;
    })
  
    expect(result.current).toBe("foo");
  
    parent.child.value = "bar"
    await waitForNextUpdate(opts);
    expect(result.current).toBe("bar");
  
    parent.child = new Child();
    await waitForNextUpdate(opts);
    expect(result.current).toBe("foo");
  
    parent.child.value = "bar"
    await waitForNextUpdate(opts);
    expect(result.current).toBe("bar");
  })
})

describe("tap (computed)", () => {
  class Test extends Model {
    foo = 1;
    bar = 2;
    baz = 3;
  }

  it('will select and subscribe to subvalue', async () => {
    const parent = Test.create();

    const { result, waitForNextUpdate } = renderHook(() => {
      return parent.tap(x => x.foo);
    });

    expect(result.current).toBe(1)

    parent.foo = 2;
    await waitForNextUpdate();

    expect(result.current).toBe(2);
  })

  it('will compute output', async () => {
    const parent = Test.create();
    const { result, waitForNextUpdate } =
      renderHook(() => parent.tap(x => x.foo + x.bar));
  
    expect(result.current).toBe(3);

    parent.foo = 2;
    await waitForNextUpdate(opts);

    expect(result.current).toBe(4);
  })  

  it('will ignore updates with same result', async () => {
    const parent = Test.create();
    const compute = jest.fn();
    const render = jest.fn();

    const { result } = renderHook(() => {
      render();
      return parent.tap(x => {
        compute();
        void x.foo;
        return x.bar;
      });
    });

    expect(result.current).toBe(2);
    expect(compute).toBeCalled();

    parent.foo = 2;
    await parent.update();

    // did attempt a second compute
    expect(compute).toBeCalledTimes(2);

    // compute did not trigger a new render
    expect(render).toBeCalledTimes(1);
    expect(result.current).toBe(2);
  })
})

describe("tag", () => {
  class Test extends Model {
    value = "foo";
  }

  it("will subscribe to instance", async () => {
    const control = Test.create();

    const { result, waitForNextUpdate } =
      renderHook(() => control.tag("value"));

    expect(result.current.value).toBe("foo");
  
    control.value = "bar";
    await waitForNextUpdate(opts);
    expect(result.current.value).toBe("bar");
  })

  it("will subscribe from context", async () => {
    const mock = jest.fn();

    class Test extends Model {
      value = "foo";
      willMount = mock;
    }
    
    const Inner = () => {
      Test.tag("foobar");
      return null;
    }
    
    render(
      <Provider of={Test}>
        <Inner />
      </Provider>
    )

    expect(mock).toBeCalledWith("foobar");
  })
})

describe("meta", () => {
  class Child extends Model {
    value = "foo";
  }
  
  class Parent extends Model {
    static value = "foo";
    static value2 = "bar";
    static child = use(Child);
  }

  beforeEach(() => Parent.value = "foo");
  
  it('will track static values', async () => {
    const render = renderHook(() => {
      const meta = Parent.meta();
      return meta.value;
    });

    expect(render.result.current).toBe("foo");

    Parent.value = "bar";
    await render.waitForNextUpdate(opts);
    expect(render.result.current).toBe("bar");

    Parent.value = "baz";
    await render.waitForNextUpdate(opts);
    expect(render.result.current).toBe("baz");
  })
  
  it('will track specific value', async () => {
    const render = renderHook(() => {
      return Parent.meta(x => x.value2);
    });

    expect(render.result.current).toBe("bar");

    Parent.value2 = "foo";
    await render.waitForNextUpdate(opts);
    expect(render.result.current).toBe("foo");
  })

  it('will track child controller values', async () => {
    const { result: { current }, waitForNextUpdate } = renderHook(() => {
      const meta = Parent.meta();
      void meta.child.value;
      return meta;
    });
  
    expect(current.child.value).toBe("foo");
  
    // Will refresh on sub-value change.
    current.child.value = "bar";
    await waitForNextUpdate(opts);
    expect(current.child.value).toBe("bar");
  
    // Will refresh on repalcement.
    current.child = new Child();
    await waitForNextUpdate(opts);
    expect(current.child.value).toBe("foo");
  
    // Fresh subscription still works.
    current.child.value = "bar";
    await waitForNextUpdate(opts);
    expect(current.child.value).toBe("bar");
  })
})