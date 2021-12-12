import { Oops } from '../src/util';
import { Model, from } from './adapter';

describe("on method", () => {
  class Subject extends Model {
    seconds = 0;
    hours = 0;

    minutes = from(this, state => {
      return Math.floor(state.seconds / 60)
    })
  }
  
  it('will watch for updated value', async () => {
    const state = Subject.create();
    const callback = jest.fn();
  
    state.on("seconds", callback);

    state.seconds = 30;
    await state.update();
  
    expect(callback).toBeCalledWith(30, "seconds");
  })
  
  it('will watch for computed value', async () => {
    const state = Subject.create();
    const callback = jest.fn();
  
    state.on("minutes", callback);

    state.seconds = 60;
    await state.update();
  
    expect(callback).toBeCalledWith(1, "minutes");
  })

  it('will compute pending value early', async () => {
    const state = Subject.create();
    const callback = jest.fn();
  
    state.on("minutes", callback);

    state.seconds = 60;
    await state.update();
  
    expect(callback).toBeCalledWith(1, "minutes");
  })

  it('will watch values with selector', async () => {
    const state = Subject.create();
    const callback = jest.fn();
  
    state.on(x => x.seconds, callback);

    state.seconds = 30;
    await state.update();
  
    expect(callback).toBeCalledWith(30, "seconds");
  })

  it('will watch multiple keys', async () => {
    const state = Subject.create();
    const callback = jest.fn();

    state.on(x => x.seconds.hours, callback);

    state.seconds = 30;
    await state.update();

    expect(callback).toBeCalledTimes(1);
    expect(callback).toBeCalledWith(30, "seconds");

    state.hours = 2;
    await state.update();

    expect(callback).toBeCalledWith(2, "hours");
  })

  it('will call for all simultaneous', async () => {
    const state = Subject.create();
    const callback = jest.fn();

    state.on(x => x.minutes.seconds, callback);

    state.seconds = 60;
    await state.update();

    expect(callback).toBeCalledWith(60, "seconds");
    expect(callback).toBeCalledWith(1, "minutes");
  })

  it('will call once for simultaneous in squash-mode', async () => {
    const state = Subject.create();
    const callback = jest.fn();

    state.on(x => x.seconds.minutes, callback, true);

    state.seconds = 60;
    await state.update();

    expect(callback).toBeCalledWith(["seconds", "minutes"]);
  })
})

describe("once method", () => {
  class Subject extends Model {
    seconds = 0;
    hours = 0;

    minutes = from(this, state => {
      return Math.floor(state.seconds / 60)
    })
  }

  it('will ignore subsequent events', async () => {
    const state = Subject.create();
    const callback = jest.fn();

    state.once(x => x.seconds, callback);

    state.seconds = 30;
    await state.update();

    expect(callback).toBeCalledWith(30, "seconds");

    state.seconds = 45;
    await state.update();

    expect(callback).not.toBeCalledWith(45, "seconds");
  })

  it('will return promise with update keys', async () => {
    const state = Subject.create();
    const pending = state.once(x => x.seconds);

    state.seconds = 30;

    const updated = await pending;

    expect(updated).toMatchObject(["seconds"]);
  })

  it('will call for all simultaneous', async () => {
    const state = Subject.create();
    const callback = jest.fn();

    state.once(x => x.seconds.minutes, callback);

    state.seconds = 60;
    await state.update();

    expect(callback).toBeCalledWith(60, "seconds");
    expect(callback).toBeCalledWith(1, "minutes");

    state.seconds = 61;
    await state.update();

    expect(callback).not.toBeCalledWith(61, "seconds");
  })
})

describe("effect method", () => {
  class TestValues extends Model {
    invoked = jest.fn();

    value1 = 1;
    value2 = 2;
    value3 = 3;

    value4 = from(this, state => {
      return state.value3 + 1;
    });
  }

  it('will watch values', async () => {
    const state = TestValues.create();
  
    state.effect(state.invoked, [
      "value1",
      "value2",
      "value3",
      "value4",
    ]);
  
    state.value1 = 2;

    // wait for update event, thus queue flushed
    await state.update()
    
    state.value2 = 3;
    state.value3 = 4;

    // wait for update event to flush queue
    await state.update()
    
    // expect two syncronous groups of updates.
    expect(state.invoked).toBeCalledTimes(3)
  })

  it('will watch values with selector', async () => {
    const state = TestValues.create();
  
    state.effect(state.invoked,
      $ => $.value1.value2.value3.value4
    );
  
    state.value1 = 2;
    state.value2 = 3;

    await state.update();

    state.value3 = 4;

    // expect value4, which relies on 3.
    await state.update();
    
    expect(state.invoked).toBeCalledTimes(3);
  })

  it('will watch values with subscriber', async () => {
    const state = TestValues.create();
  
    state.effect(self => {
      // destructure values to indicate access.
      const { value1, value2, value3 } = self;
      void value1, value2, value3;
      self.invoked();
    });
  
    state.value1 = 2;
    await state.update();

    state.value2 = 3;
    await state.update();

    state.value2 = 4;
    state.value3 = 4;
    await state.update();
  
    /**
     * must invoke once to detect subscription
     * 
     * invokes three more times:
     * - value 1
     * - value 2
     * - value 2 & 3 (squashed)
     */
    expect(state.invoked).toBeCalledTimes(4);
  })

  it('will watch values with method subscriber', async () => {
    class Test extends TestValues {
      testEffect(){
        // destructure values to indicate access.
        const { value1, value2, value3 } = this;
        void value1, value2, value3;
        this.invoked();
      }
    }

    const state = Test.create();
  
    state.effect(state.testEffect);
  
    state.value1 = 2;
    await state.update();

    state.value2 = 3;
    await state.update();

    state.value2 = 4;
    state.value3 = 4;
    await state.update();

    expect(state.invoked).toBeCalledTimes(4);
  })

  it("will call function effect returns on subsequent update", async () => {
    class Test extends TestValues {
      testEffect(){
        return this.invoked;
      }
    }

    const state = Test.create();
    
    state.effect(state.testEffect, ["value1"]);

    expect(state.invoked).not.toBeCalled();

    state.value1 = 2;
    await state.update();

    expect(state.invoked).toBeCalled();
  })

  it("will throw if effect returns non-function", () => {
    const state = TestValues.create();
    const expected = Oops.BadEffectCallback();
    const attempt = () => {
      // @ts-ignore
      state.effect(() => "foobar");
    }

    expect(attempt).toThrowError(expected);
  })

  it("will not throw if effect returns promise", () => {
    const state = TestValues.create();
    const attempt = () => {
      state.effect(async () => {});
    }

    expect(attempt).not.toThrowError();
  })
});

describe("update method", () => {
  class Test extends Model {
    foo = "foo";
    bar = "bar";

    method = jest.fn();
    methodString = jest.fn((argument: string) => {
      this.foo = argument;
    });
  }
  
  it("will send synthetic event", async () => {
    const test = Test.create();
    test.update("foo");
    
    const update = await test.update(true);
    expect(update).toContain("foo");
  })
  
  it("will send synthetic event using selector", async () => {
    const test = Test.create();
    test.update(x => x.foo);
    
    const update = await test.update(true);
    expect(update).toContain("foo");
  })
  
  it("will resolve after event is handled", async () => {
    const test = Test.create();
    const update = await test.update(x => x.foo);

    expect(update).toContain("foo");
  })
  
  it("will resolve with keys already in frame", async () => {
    const test = Test.create();
    test.bar = "foo";

    const update = await test.update(x => x.foo);
    expect(update).toMatchObject(["bar", "foo"]);
  })

  it("will call function of same name", async () => {
    const test = Test.create();
    await test.update("method", true);
    expect(test.method).toBeCalled();
  })

  it("will call function via selector", async () => {
    const test = Test.create();
    await test.update(x => x.method, true);
    expect(test.method).toBeCalled();
  })

  it("will not call function if false", async () => {
    const test = Test.create();
    await test.update("method", false);
    expect(test.method).not.toBeCalled();
  })

  it("will call function with argument", async () => {
    const test = Test.create();
    await test.update("methodString", "foobar");
    expect(test.methodString).toBeCalledWith("foobar");
  })

  it("will call function via selector with argument", async () => {
    const test = Test.create();
    await test.update(x => x.methodString, "foobar");
    expect(test.methodString).toBeCalledWith("foobar");
  })

  it.todo("will set value to argument if not a function");

  it("will throw if callback is undefined", async () => {
    const test = Test.create();
    const attempt = () => {
      // @ts-ignore
      test.update("foo").then();
    }

    expect(attempt).toThrowError();
  })

  it("will include caused-by-method updates", async () => {
    const test = Test.create();
    const updates = await test.update("methodString", "foobar");

    expect(test.methodString).toBeCalledWith("foobar");
    expect(test.foo).toBe("foobar");
    expect(updates).toMatchObject(["methodString", "foo"])
  })
})

describe("will accept before ready", () => {
  class TestValues extends Model {
    value1 = 1;
    value2 = 2;

    value3 = from(this, state => {
      return state.value2 + 1;
    });
  }

  it('on method', async () => {
    class Test extends TestValues {
      constructor(){
        super();
        this.on("value1", mock);
      }
    }

    const mock = jest.fn();
    const state = Test.create();

    state.value1++;
    await state.update();

    expect(mock).toBeCalled();
  })

  it('on method with getter', async () => {
    class Test extends TestValues {
      constructor(){
        super();
        this.on("value3", mock);
      }
    }
    
    const mock = jest.fn();
    const state = Test.create();

    state.value2++;
    await state.update();

    expect(mock).toBeCalled();
  })

  it('on method with selector', async () => {
    class Test extends TestValues {
      constructor(){
        super();
        this.on(x => x.value1, mock);
      }
    }
    
    const mock = jest.fn();
    const state = Test.create();

    state.value1++;
    await state.update();

    expect(mock).toBeCalled();
  })

  it('on method using cancel', async () => {
    class Test extends TestValues {
      cancel = this.on("value1", mock);
    }

    const mock = jest.fn();
    const state = Test.create();

    state.value1++;
    await state.update(true);
    expect(mock).toBeCalledTimes(1);

    state.value1++;
    await state.update(true);
    expect(mock).toBeCalledTimes(2);

    state.cancel();

    state.value1++;
    await state.update(true);
    expect(mock).toBeCalledTimes(2);
  })

  it('effect method', async () => {
    class Test extends TestValues {
      constructor(){
        super();
        this.effect(mock, ["value1", "value3"]);
      }
    }

    const mock = jest.fn();
    const state = Test.create();

    state.value1++;
    await state.update();

    expect(mock).toBeCalled();

    state.value2++;
    await state.update();

    // expect pre-existing listener to hit
    expect(mock).toBeCalledTimes(3);
  })

  it('effect method with selector', async () => {
    class Test extends TestValues {
      constructor(){
        super();
        // @ts-ignore
        this.effect(mock, x => x.value1.value3);
      }
    }

    const mock = jest.fn();
    const state = Test.create();

    state.value1++;
    await state.update();

    expect(mock).toBeCalled();

    state.value2++;
    await state.update();

    // expect pre-existing listener to hit
    expect(mock).toBeCalledTimes(3);
  })

  it('effect method with subscriber', async () => {
    class Test extends TestValues {
      constructor(){
        super();
        this.effect(this.test);
      }

      test(){
        void this.value1;
        void this.value3;
        mock();
      }
    }

    const mock = jest.fn();
    const state = Test.create();

    // runs immediately to aquire subscription
    expect(mock).toBeCalled();

    state.value1++;
    await state.update();

    expect(mock).toBeCalledTimes(2);

    state.value2++;
    await state.update();

    expect(mock).toBeCalledTimes(3);
  })
});