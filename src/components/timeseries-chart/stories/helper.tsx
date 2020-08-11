import { AxisDisplayMode } from '@cognite/griff-react';
import {
  DatapointAggregates,
  DoubleDatapoints,
  StringDatapoints,
  DatapointsMultiQuery,
  Timeseries,
} from '@cognite/sdk';
import { Button, DatePicker, Row, Tag } from 'antd';
import { Moment } from 'moment';
import React, { FC, SyntheticEvent, useState } from 'react';
import {
  generateDatapoints,
  generateTimeseriesList,
  sleep,
  MockCogniteClient,
} from '../../../mocks';
import { DataLoader } from '../data-loader';
import { TimeseriesChartProps, TimeseriesChartSeries } from '../interfaces';
import { TimeseriesChart } from '../timeseries-chart';
import CogniteClient from '@cognite/sdk/dist/src/cogniteClient';

type DatapointsArray = (
  | DatapointAggregates
  | StringDatapoints
  | DoubleDatapoints
)[];

const timeseriesList = generateTimeseriesList({ prefix: 'storybook-ts' });

const MockTimeseriesClientObject = {
  retrieve: async (): Promise<Timeseries[]> => {
    await sleep(1000);
    return [timeseriesList[0]];
  },
};

const MockDatapointsClientObject = {
  retrieve: async (query: DatapointsMultiQuery): Promise<DatapointsArray> => {
    const { start, end } = query.items[0];
    const datapoints = generateDatapoints({
      limit: 100,
      start: (start && +start) || undefined,
      end: (end && +end) || undefined,
    });
    return [
      {
        id: 1337,
        isStep: false,
        isString: false,
        datapoints,
      },
    ];
  },
};

class TimeseriesMockClient extends MockCogniteClient {
  timeseries: any = MockTimeseriesClientObject;
  datapoints: any = MockDatapointsClientObject;
}

class FakeZoomableClient extends MockCogniteClient {
  timeseries: any = {
    retrieve: async (): Promise<Timeseries[]> => {
      await sleep(1000);
      return [timeseriesList[0]];
    },
  };
  datapoints: any = {
    retrieve: async (query: DatapointsMultiQuery): Promise<DatapointsArray> => {
      const { granularity = '', start, end } = query.items[0];
      const n = granularity === 's' ? 2 : granularity.includes('s') ? 10 : 250;
      const datapoints = generateDatapoints({
        limit: n,
        start: (start && +start) || undefined,
        end: (end && +end) || undefined,
      });
      return [{ id: 1337, isString: false, isStep: false, datapoints }];
    },
  };
}

export const client = new TimeseriesMockClient({ appId: 'gearbox test' });
export const zoomableClient = new FakeZoomableClient({ appId: 'gearbox test' });
export const customContainerStyle = {
  container: { height: '300px', backgroundColor: 'lightblue' },
};
export const timeSeriesColors = { 123: 'red', 456: '#00ff00' };
export const rulerProp = {
  visible: true,
  yLabel: (point: any) => `${Number.parseFloat(point.value).toFixed(3)}`,
  timeLabel: (point: any) => point.timestamp.toString(),
};
export const handleMouseMove = (e: any) => console.log('onMouseMove', e);
export const handleMouseOut = (e: any) => console.log('onMouseOut', e);
export const handleBlur = (e: any) => console.log('onBlur', e);
export const series = [
  {
    id: 123,
    color: 'green',
    yAxisDisplayMode: AxisDisplayMode.ALL,
    hidden: false,
    y0Accessor: DataLoader.y0Accessor,
    y1Accessor: DataLoader.y1Accessor,
    yAccessor: DataLoader.yAccessor,
  },
  {
    id: 456,
    color: 'red',
    y0Accessor: DataLoader.y0Accessor,
    y1Accessor: DataLoader.y1Accessor,
    yAccessor: DataLoader.yAccessor,
  },
];
export const seriesWithCustomYDomain = [
  {
    id: 123,
    color: 'green',
    yAxisDisplayMode: AxisDisplayMode.ALL,
    hidden: false,
    ySubDomain: [-150, 150],
  },
  {
    id: 456,
    color: 'red',
    ySubDomain: [-120, 120],
  },
];
export const ySubDomains = { 123: [-130, 130] };
export const TimeseriesComponent: FC<TimeseriesChartProps> = () => <></>;

const { RangePicker } = DatePicker;
const { CheckableTag } = Tag;

type EventValue<T> = T | null;
type RangeValue<T> = [EventValue<T>, EventValue<T>] | null;

export const DynamicSeries: FC<{ client: CogniteClient }> = ({
  client,
}: {
  client: CogniteClient;
}) => {
  const [series, setSeries] = useState<TimeseriesChartSeries[]>([]);
  const [end, setEnd] = useState<number>(Date.now());
  const [start, setStart] = useState<number>(end - 60 * 60 * 1000);
  const ruler = { visible: true };

  const onTimeRangeChanged = (range: RangeValue<Moment>) => {
    const [start, end] = range;
    if (start) {
      setStart(+start);
    }
    if (end) {
      setEnd(+end);
    }
  };

  const toggleSeries = (index: number) => {
    series[index].hidden = !series[index].hidden;
    setSeries([...series]);
  };

  const pushSeries = (e: SyntheticEvent) => {
    e.preventDefault();

    setSeries([...series.concat({ id: series.length })]);
  };

  const popSeries = (e: SyntheticEvent) => {
    e.preventDefault();

    setSeries([...series.slice(0, -1)]);
  };

  return (
    <div style={{ width: '100%' }}>
      <Row>
        <RangePicker onChange={onTimeRangeChanged} />
        <Button onClick={pushSeries}>Push Series</Button>
        <Button onClick={popSeries}>Pop Series</Button>
      </Row>
      <Row style={{ marginTop: '5px' }}>
        <span>Series to render (hide/show on click):</span>
        {series.map((s, i) => (
          <CheckableTag
            key={s.id}
            onChange={() => toggleSeries(i)}
            checked={!s.hidden}
          >
            {s.id}
          </CheckableTag>
        ))}
      </Row>
      <div>
        <TimeseriesChart
          client={client}
          series={series}
          start={start}
          end={end}
          ruler={ruler}
          zoomable={true}
          contextChart={true}
        />
      </div>
    </div>
  );
};
