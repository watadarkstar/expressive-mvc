import { Model, on, subscribeTo } from './adapter';

describe("subscriber", () => {
  class Subject extends Model {
    value = 1;
    value2 = 2;
  }

  it('will detect change to properties accessed', async () => {
    const state = Subject.create();
    const update = subscribeTo(state, it => {
      void it.value;
      void it.value2;
    })

    state.value = 2;
    await update();

    state.value2 = 3;
    await update();
  })

  it('will ignore change to property not accessed', async () => {
    const state = Subject.create();
    const update = subscribeTo(state, it => {
      void it.value;
    })

    state.value = 2;
    await update();

    /**
     * we did not access value2 in above accessor,
     * subscriber assumes we don't care about updates
     * to this property, so it'l drop relevant events
     **/ 
    state.value2 = 3;
    await update(false);
  });

  it('will ignore properties accessed through get', async () => {
    const state = Subject.create();
    const update = subscribeTo(state, it => {
      void it.value;
      void it.get.value2;
    })

    state.value = 2;
    await update();

    state.value2 = 3;
    await update(false);
  })

  it('will not obstruct set-behavior', () => {
    class Test extends Model {
      didSet = jest.fn();
      value = on("foo", this.didSet);
    }

    const state = Test.create();

    expect(state.value).toBe("foo");

    subscribeTo(state, it => {
      it.value = "bar";
    })

    expect(state.value).toBe("bar");
    expect(state.didSet).toBeCalledWith("bar");
  })

  it.skip("will not trigger twice from import", async () => {
    const state = Subject.create();
    const invoke = jest.fn();

    state.effect(it => {
      it.import({ value: 2 });
      invoke(it.value);
    })

    expect(invoke).toBeCalledWith(2);

    state.value = 3;
    const d = await state.update();

    void d;

    expect(invoke).toBeCalledTimes(2);
  })
})