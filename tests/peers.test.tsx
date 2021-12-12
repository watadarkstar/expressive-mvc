import React from 'react';

import { Oops } from '../src/peer';
import { Consumer, Model, Provider, render, Singleton, subscribeTo, tap } from './adapter';

describe("tap instruction", () => {
  class Foo extends Model {
    bar = tap(Bar);
  }

  class Bar extends Model {
    value = "bar";
  }

  it("will attach peer from context", () => {
    const bar = Bar.create();

    const Test = () => {
      const { bar } = Foo.use();
      expect(bar).toBe(bar);
      return null;
    }

    render(
      <Provider of={bar}>
        <Test />
      </Provider>
    );
  })

  it("will subscribe peer from context", async () => {
    class Foo extends Model {
      bar = tap(Bar, true);
    }

    const bar = Bar.create();
    let foo!: Foo;

    const Child = () => {
      foo = Foo.use();
      return null;
    }

    render(
      <Provider of={bar}>
        <Child />
      </Provider>
    )

    const update = subscribeTo(foo, it => it.bar.value);

    bar.value = "foo";
    await update();
  })

  it("will return undefined if instance not found", () => {
    const Test = () => {
      const foo = Foo.use();
      expect(foo.bar).toBeUndefined();
      return null;
    }

    render(<Test />);
  })

  it("will throw if strict tap is undefined", () => {
    class Foo extends Model {
      bar = tap(Bar, true);
    }

    const expected = Oops.AmbientRequired(Bar.name, Foo.name, "bar");
    const useStrictFooBar = () => Foo.use().bar;

    const TestComponent = () => {
      expect(useStrictFooBar).toThrowError(expected);
      return null;
    }

    render(<TestComponent />);
  })
})

describe("callback", () => {
  class Foo extends Model {}
  class Bar extends Model {
    didTap = jest.fn();
    foo = tap(Foo, this.didTap);
  }

  it("will run on attachment of model", () => {
    render(
      <Provider of={Foo}>
        <Provider of={Bar}>
          <Consumer of={Bar} has={bar => {
            expect(bar.didTap).toBeCalledWith(expect.any(Foo));
          }}/>
        </Provider>
      </Provider>
    )
  })

  it("will pass undefined if not found", () => {
    render(
      <Provider of={Bar}>
        <Consumer of={Bar} has={bar => {
          expect(bar.didTap).toHaveBeenCalledWith(undefined);
        }}/>
      </Provider>
    )
  })

  it("will force undefined if returns false", () => {
    class Bar extends Model {
      foo = tap(Foo, () => false);
    }

    render(
      <Provider of={Foo}>
        <Provider of={Bar}>
          <Consumer of={Bar} has={bar => {
            expect(bar.foo).toBe(undefined);
          }}/>
        </Provider>
      </Provider>
    )
  })

  it("will not run before didCreate", () => {
    class Bar extends Model {
      didCreate = jest.fn();

      foo = tap(Foo, () => {
        expect(this.didCreate).toHaveBeenCalled();
      });
    }

    render(
      <Provider of={Foo}>
        <Provider of={Bar}>
          {null}
        </Provider>
      </Provider>
    )
  })
})

describe("singleton", () => {
  it("will attach to model", () => {
    class Foo extends Model {
      global = tap(Global);
    }

    class Global extends Singleton {
      value = "bar";
    }

    Global.create();

    const Test = () => {
      const { global } = Foo.use();
      expect(global.value).toBe("bar");
      return null;
    }

    render(<Test />);
  })

  it("will attach to another singleton", () => {
    class Peer extends Singleton {}
    class Global extends Singleton {
      peer = tap(Peer);
    }
    
    const peer = Peer.create();
    const global = Global.create();    

    expect(global.peer).toBe(peer);
  })

  it("will throw if tries to attach Model", () => {
    class Normal extends Model {}
    class Global extends Singleton {
      notPossible = tap(Normal);
    }

    const attempt = () => Global.create();
    const issue = Oops.CantAttachGlobal(Global.name, Normal.name);

    expect(attempt).toThrowError(issue);
  })
})

describe("context", () => {
  class Foo extends Model {
    bar = tap(Bar, true);
  };

  class Bar extends Model {
    value = 1;
  };

  it("will assign multiple peers", async () => {
    class Foo extends Model {
      value = 2;
    };

    class Multi extends Model {
      bar = tap(Bar);
      foo = tap(Foo);
    };

    const Inner = () => {
      const { bar, foo } = Multi.use();

      expect(bar).toBeInstanceOf(Bar);
      expect(foo).toBeInstanceOf(Foo);

      return null;
    }

    render(
      <Provider of={{ Foo, Bar }}>
        <Inner />
      </Provider>
    );
  })

  it("will still access when created by provider", () => {
    render(
      <Provider of={Bar}>
        <Provider of={Foo}>
          <Consumer of={Foo} has={i => expect(i.bar).toBeInstanceOf(Bar)} />
        </Provider>
      </Provider>
    );
  })

  it("will access peers sharing same provider", () => {
    class Foo extends Model {
      bar = tap(Bar, true);
    }
    class Bar extends Model {
      foo = tap(Foo, true);
    }

    render(
      <Provider of={{ Foo, Bar }}>
        <Consumer of={Bar} has={i => expect(i.foo.bar).toBe(i)} />
        <Consumer of={Foo} has={i => expect(i.bar.foo).toBe(i)} />
      </Provider>
    );
  });

  it("will maintain hook", async () => {
    const didRender = jest.fn();

    const Inner = () => {
      Foo.use();
      didRender();
      return null;
    }

    const x = render(
      <Provider of={Bar}>
        <Inner />
      </Provider>
    );

    x.update(
      <Provider of={Bar}>
        <Inner />
      </Provider>
    );

    expect(didRender).toBeCalledTimes(2);
  })
})