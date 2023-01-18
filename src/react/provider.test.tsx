import React from 'react';
import { act } from 'react-test-renderer';

import { render } from '../helper/testing';
import { Model } from '../model';
import { Consumer } from './consumer';
import { Global } from './global';
import { MVC } from './mvc';
import { Oops, Provider } from './provider';

class Foo extends MVC {
  value?: string = undefined;
}
class Bar extends MVC {}

it("will create instance of given model", () => {
  render(
    <Provider for={Foo}>
      <Consumer for={Foo} get={i => expect(i).toBeInstanceOf(Foo)} />
    </Provider>
  );
})

it("will destroy instance of given model", async () => {
  const willDestroy = jest.fn();
  class Test extends MVC {
    end(){
      willDestroy();
      super.end();
    }
  };

  const element = render(
    <Provider for={Test} />
  );

  element.unmount();
  expect(willDestroy).toBeCalledTimes(1);
});

it("will accept render function when model given", () => {
  render(
    <Provider for={Foo}>
      {(instance) => {
        return <Consumer for={Foo} get={i => {
          // instance injected should be a subscribe-clone.
          expect(instance).not.toBe(i);
          // get actual instance via circular-get property.
          expect(instance.is).toBe(i);
        }} />
      }}
    </Provider>
  );
})

it("will pass undefined to render function if multiple", () => {
  render(
    <Provider for={{ Foo, Bar }}>
      {(instance) => {
        expect(instance).toBeUndefined();
        return null;
      }}
    </Provider>
  );
})

it("will refresh render function as a subscriber", async () => {
  const didRender = jest.fn();
  const test = Foo.new();

  render(
    <Provider for={test}>
      {({ value }) => {
        didRender(value);
        return null;
      }}
    </Provider>
  );

  expect(didRender).toBeCalledWith(undefined);

  await act(async () => {
    test.value = "foobar";
    await test.on(true);
  })

  expect(didRender).toBeCalledWith("foobar");
})

it("will assign props to instance", () => {
  render(
    <Provider for={Foo} and={{ value: "foobar" }}>
      <Consumer for={Foo} has={i => expect(i.value).toBe("foobar")} />
    </Provider>
  );
})

it("will assign props to muliple controllers", () => {
  class Bar extends Model {
    value = "";
  }

  render(
    <Provider for={{ Foo, Bar }} and={{ value: "foobar" }}>
      <Consumer for={Foo} has={i => expect(i.value).toBe("foobar")} />
      <Consumer for={Bar} has={i => expect(i.value).toBe("foobar")} />
    </Provider>
  );
});

it("will not assign foreign props to controller", () => {
  render(
    /// @ts-ignore - type-checking warns against this
    <Provider for={Foo} and={{ nonValue: "foobar" }}>
      <Consumer for={Foo} has={i => {
        // @ts-ignore
        expect(i.nonValue).toBeUndefined();
      }} />
    </Provider>
  );
})

it("will create all models in given object", () => {
  render(
    <Provider for={{ Foo, Bar }}>
      <Consumer for={Foo} get={i => expect(i).toBeInstanceOf(Foo)} />
      <Consumer for={Bar} get={i => expect(i).toBeInstanceOf(Bar)} />
    </Provider>
  )
})

it("will destroy created model on unmount", () => {
  const willDestroy = jest.fn();

  class Test extends Model {}

  const rendered = render(
    <Provider for={{ Test }}>
      <Consumer for={Test} has={i => {
        expect(i).toBeInstanceOf(Test)
        i.on(() => willDestroy, []);
      }} />
    </Provider>
  );

  rendered.unmount();
  expect(willDestroy).toBeCalled();
})

it("will destroy multiple created on unmount", () => {
  const willDestroy = jest.fn();

  class Foo extends Model {}
  class Bar extends Model {}

  const rendered = render(
    <Provider for={{ Foo, Bar }}>
      <Consumer for={Foo} has={i => {
        i.on(() => willDestroy, []);
      }} />
      <Consumer for={Bar} has={i => {
        i.on(() => willDestroy, []);
      }} />
    </Provider>
  );

  rendered.unmount();
  expect(willDestroy).toBeCalledTimes(2);
})

it("will not destroy given instance on unmount", () => {
  const didUnmount = jest.fn();

  class Test extends Model {}

  const instance = Test.new();

  const rendered = render(
    <Provider for={{ instance }}>
      <Consumer for={Test} has={i => {
        i.on(() => didUnmount, []);
      }} />
    </Provider>
  );

  rendered.unmount();
  expect(didUnmount).not.toBeCalled();
})

it("will create all models in given array", () => {
  render(
    <Provider for={[ Foo, Bar ]}>
      <Consumer for={Foo} get={i => expect(i).toBeInstanceOf(Foo)} />
      <Consumer for={Bar} get={i => expect(i).toBeInstanceOf(Bar)} />
    </Provider>
  )
})

it("will provide a mix of state and models", () => {
  const foo = Foo.new();

  render(
    <Provider for={{ foo, Bar }}>
      <Consumer for={Foo} get={i => expect(i).toBe(foo)} />
      <Consumer for={Bar} get={i => expect(i).toBeInstanceOf(Bar)} />
    </Provider>
  )
})

it("will throw if missing `for` prop", () => {
  // @ts-ignore
  const test = () => render(<Provider />);

  expect(test).toThrow(Oops.NoType());
})

describe("global", () => {
  it("will create but not destroy instance", () => {
    class Test extends Global {}

    expect(Test.get(false)).toBeUndefined();

    const element = render(<Provider for={Test} />);
    const test = Test.get();

    expect(test).toBeInstanceOf(Test);

    element.unmount();

    expect(Test.get()).toBe(test);

    render(<Provider for={Test} />).unmount();

    test.end(true);
  })
})