import { configure, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {
  generateDatapoints,
  sleep,
  generateTimeseriesList,
  MockCogniteClient,
} from '../../mocks';
import { CursorOverview } from './components/cursor-overview';
import { TimeseriesChart } from './timeseries-chart';
import { TimeseriesChartSizeProvider } from './components/timeseries-chart-size-provider';

configure({ adapter: new Adapter() });

class Client extends MockCogniteClient {
  timeseries: any = {
    retrieve: jest.fn(),
  };
  datapoints: any = {
    retrieve: jest.fn(),
  };
}

const sdk = new Client({ appId: 'gearbox test' });
const timeseriesList = generateTimeseriesList({});
const datapoints = generateDatapoints({});

beforeEach(() => {
  sdk.timeseries.retrieve.mockResolvedValue([timeseriesList[0]]);
  sdk.datapoints.retrieve.mockResolvedValue([
    { name: 'datapoints list', datapoints },
  ]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('TimeseriesChart', () => {
  it('calls the sdk', async () => {
    const id = 123;
    const props = {
      client: sdk,
      series: [id],
    };
    const wrapper = mount(<TimeseriesChart {...props} />);
    await sleep(300);
    wrapper.update();
    expect(sdk.timeseries.retrieve).toHaveBeenCalledTimes(1);
    expect(sdk.timeseries.retrieve).toHaveBeenCalledWith([{ id }]);
    expect(sdk.datapoints.retrieve).toHaveBeenCalledTimes(1);
    expect(sdk.datapoints.retrieve).toHaveBeenCalledWith({
      items: [expect.objectContaining({ id })],
    });
    expect(wrapper.find(CursorOverview).exists()).toBeFalsy();
  });

  it('renders correctly when ids are specified', async () => {
    const props = {
      client: sdk,
      series: [timeseriesList[0].id],
    };

    const wrapper = mount(
      <TimeseriesChartSizeProvider width={500} height={300}>
        <TimeseriesChart {...props} />
      </TimeseriesChartSizeProvider>
    );
    await sleep(300);
    wrapper.update();
    expect(wrapper.find('.line').exists()).toBeTruthy();
  });

  it('renders correctly when series are specified', async () => {
    const props = {
      client: sdk,
      series: [
        {
          id: 123,
          color: 'green',
        },
      ],
    };
    const wrapper = mount(
      <TimeseriesChartSizeProvider width={500} height={300}>
        <TimeseriesChart {...props} />
      </TimeseriesChartSizeProvider>
    );
    await sleep(300);
    wrapper.update();
    expect(wrapper.find('.line').exists()).toBeTruthy();
  });

  it('renders context chart', async () => {
    const props = {
      client: sdk,
      series: [timeseriesList[0].id],
      contextChart: true,
    };
    const wrapper = mount(
      <TimeseriesChartSizeProvider width={500} height={300}>
        <TimeseriesChart {...props} />
      </TimeseriesChartSizeProvider>
    );
    await sleep(300);
    wrapper.update();
    expect(wrapper.find('.context-container').exists()).toBeTruthy();
  });
});
