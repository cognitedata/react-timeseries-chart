import { version } from '../constants';
import { MockCogniteClient } from '../mocks';
import { wrapInLogProxy } from './client-sdk-log-proxy';

class CogniteClient extends MockCogniteClient {
  assets: any = {
    retrieve: async (ids: number[]) => ids,
  };
}

describe('log proxy for cognite client', () => {
  let client: CogniteClient;
  let retrieve: typeof client.assets.retrieve;

  beforeAll(() => {
    client = wrapInLogProxy(new CogniteClient({ appId: 'test' }), 'test')!;
    retrieve = client.assets.retrieve;
  });

  beforeEach(() => {
    client.setOneTimeSdkHeader = jest.fn();
  });

  it('calls', async () => {
    expect(await retrieve([1])).toEqual([1]);
  });

  it("don't mess up with non-api members", () => {
    expect(() => client.project).not.toThrowError();
  });

  it("don't set sdk header on accessor", () => {
    client.assets.retrieve;
    expect(client.setOneTimeSdkHeader).toBeCalledTimes(0);
  });

  it('set sdk header twice', async () => {
    await retrieve();
    await retrieve();
    expect(client.setOneTimeSdkHeader).toBeCalledTimes(2);
  });

  it('set correct sdk header', () => {
    retrieve();
    const header = `ReactTimeseriesChart:${version}/test`;
    expect(client.setOneTimeSdkHeader).toHaveBeenLastCalledWith(header);
  });
});
