import {
  DatapointAggregate,
  DoubleDatapoint,
  StringDatapoint,
} from '@cognite/sdk';
import {
  generateDatapoints,
  generateTimeseriesList,
  MockCogniteClient,
} from '../../mocks';
import { DataLoader } from './data-loader';
import { DataLoaderDatapoint, FilterFetchedSeriesFunc } from './interfaces';

const mockTimeseriesRetrieve = jest.fn();
const mockDatapointsRetrieve = jest.fn();
const timeseriesList = generateTimeseriesList({});
const datapoints = generateDatapoints({});
const datapointsList = { name: 'datapoints list', datapoints };

class CogniteClient extends MockCogniteClient {
  timeseries: any = {
    retrieve: mockTimeseriesRetrieve,
  };
  datapoints: any = {
    retrieve: mockDatapointsRetrieve,
  };
}

const sdk = new CogniteClient({ appId: 'gearbox test' });

const toPoints = (arr: number[], from: string): DatapointAggregate[] =>
  arr.map((d: number) => ({ timestamp: new Date(d), value: from }));

const dataLoader = new DataLoader(sdk);

describe('dataLoader', () => {
  describe('MergeInsert', () => {
    it('[base[0] <= toInsert[0] <= toInsert[1] <= base[1]]', () => {
      const base = toPoints([1, 5, 10, 15], 'base');
      const toInsert = toPoints([6, 7, 8], 'insert');
      const expectedOutput: StringDatapoint[] = [
        {
          timestamp: new Date(1),
          value: 'base',
        },
        {
          timestamp: new Date(6),
          value: 'insert',
        },
        {
          timestamp: new Date(7),
          value: 'insert',
        },
        {
          timestamp: new Date(8),
          value: 'insert',
        },
        {
          timestamp: new Date(10),
          value: 'base',
        },
        {
          timestamp: new Date(15),
          value: 'base',
        },
      ];
      const merged = DataLoader.mergeInsert(
        base,
        toInsert,
        DataLoader.xAccessor,
        [5, 8]
      );
      expect(merged).toEqual(expectedOutput);
    });

    it('Merge insert [empty base]', () => {
      const base = toPoints([], 'base');
      const toInsert = toPoints([1, 5], 'insert');
      const expectedOutput: StringDatapoint[] = [
        { timestamp: new Date(1), value: 'insert' },
        { timestamp: new Date(5), value: 'insert' },
      ];
      const merged = DataLoader.mergeInsert(
        base,
        toInsert,
        DataLoader.xAccessor,
        [0, 5]
      );
      expect(merged).toEqual(expectedOutput);
    });

    it('Merge insert [One insert point]', () => {
      const base = toPoints([1, 5], 'base');
      const toInsert = toPoints([5], 'insert');
      const expectedOutput: StringDatapoint[] = [
        { timestamp: new Date(1), value: 'base' },
        { timestamp: new Date(5), value: 'insert' },
      ];
      const merged = DataLoader.mergeInsert(
        base,
        toInsert,
        DataLoader.xAccessor,
        [3, 5]
      );
      expect(merged).toEqual(expectedOutput);
    });
  });

  describe('cogniteloader', () => {
    beforeEach(() => {
      // @ts-ignore
      mockTimeseriesRetrieve.mockResolvedValue([timeseriesList[0]]);
      // @ts-ignore
      mockDatapointsRetrieve.mockResolvedValue([
        { name: 'data points list', datapoints },
      ]);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });
    describe('reason MOUNTED', () => {
      test.each`
        pps      | expectedGranularity
        ${1}     | ${'2day'}
        ${10}    | ${'3h'}
        ${100}   | ${'15m'}
        ${1000}  | ${'2m'}
        ${10000} | ${'9s'}
      `(
        'Requests $expectedGranularity granularity when pointsPerSeries is $pps',
        async ({
          pps,
          expectedGranularity,
        }: {
          pps: number;
          expectedGranularity: string;
        }) => {
          const result = await dataLoader.cogniteloader(undefined)({
            id: 123,
            timeDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
            timeSubDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
            pointsPerSeries: pps,
            oldSeries: {
              id: 123,
              data: [],
              xAccessor: DataLoader.xAccessor,
              yAccessor: DataLoader.yAccessor,
              y0Accessor: DataLoader.y0Accessor,
              y1Accessor: DataLoader.y1Accessor,
            },
            reason: 'MOUNTED',
          });
          expect(sdk.datapoints.retrieve).toHaveBeenCalledTimes(1);
          expect(sdk.datapoints.retrieve).toHaveBeenCalledWith({
            items: [
              expect.objectContaining({
                granularity: expectedGranularity,
              }),
            ],
          });
          expect(result.drawPoints).toBeFalsy();
          expect(result.data).toEqual(datapoints);
        }
      );

      it('should draw raw data points if total number of points is less than half of pointsPerSeries', async () => {
        const datapoints: DoubleDatapoint[] = [
          {
            timestamp: new Date(1552726800000),
            value: 36.26105251209135,
          },
          {
            timestamp: new Date(1552734000000),
            value: 36.2421327365039,
          },
        ];
        mockDatapointsRetrieve.mockResolvedValue([{ name: 'abc', datapoints }]);

        const startTime = Date.now() - 24 * 60 * 60 * 1000;
        const result = await dataLoader.cogniteloader(undefined)({
          id: 123,
          timeDomain: [startTime, Date.now()],
          timeSubDomain: [startTime, Date.now()],
          pointsPerSeries: 2000000,
          oldSeries: {
            id: 123,
            data: [],
            xAccessor: DataLoader.xAccessor,
            yAccessor: DataLoader.yAccessor,
            y0Accessor: DataLoader.y0Accessor,
            y1Accessor: DataLoader.y1Accessor,
          },
          reason: 'MOUNTED',
        });

        const expectedDatapoints: DataLoaderDatapoint[] = [
          {
            timestamp: new Date(1552726800000),
            value: 36.26105251209135,
          },
          {
            timestamp: new Date(1552734000000),
            value: 36.2421327365039,
          },
        ];

        expect(result.data).toEqual(expectedDatapoints);
        expect(result.drawPoints).toBeTruthy();
      });
    });

    describe('reason INTERVAL', () => {
      test.each`
        pps      | expectedGranularity
        ${1}     | ${'2day'}
        ${10}    | ${'3h'}
        ${100}   | ${'15m'}
        ${1000}  | ${'2m'}
        ${10000} | ${'9s'}
      `(
        'Requests $expectedGranularity granularity when pointsPerSeries is $pps',
        async ({
          pps,
          expectedGranularity,
        }: {
          pps: number;
          expectedGranularity: string;
        }) => {
          const filterSeries: FilterFetchedSeriesFunc = (_, series) => series;
          const result = await dataLoader.cogniteloader(filterSeries)({
            id: 123,
            timeDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
            timeSubDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
            pointsPerSeries: pps,
            oldSeries: {
              id: 123,
              data: [],
              xAccessor: DataLoader.xAccessor,
              yAccessor: DataLoader.yAccessor,
              y0Accessor: DataLoader.y0Accessor,
              y1Accessor: DataLoader.y1Accessor,
            },
            reason: 'INTERVAL',
          });
          expect(sdk.datapoints.retrieve).toHaveBeenCalledTimes(1);
          expect(sdk.datapoints.retrieve).toHaveBeenCalledWith({
            items: [
              expect.objectContaining({ granularity: expectedGranularity }),
            ],
          });
          expect(result.drawPoints).toBeFalsy();
          expect(result.data).toEqual(datapoints);
        }
      );

      it('should fetch raw data when old series fetched raw data', async () => {
        const datapoints: DoubleDatapoint[] = [
          {
            timestamp: new Date(1552726800000),
            value: 36.26105251209135,
          },
          {
            timestamp: new Date(1552734000000),
            value: 36.2421327365039,
          },
        ];
        sdk.datapoints.retrieve.mockResolvedValue([
          {
            name: 'abc',
            datapoints,
          },
        ]);

        const result = await dataLoader.cogniteloader(undefined)({
          id: 123,
          timeDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
          timeSubDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
          pointsPerSeries: 200,
          oldSeries: {
            id: 123,
            data: [],
            xAccessor: DataLoader.xAccessor,
            yAccessor: DataLoader.yAccessor,
            y0Accessor: DataLoader.y0Accessor,
            y1Accessor: DataLoader.y1Accessor,
            drawPoints: true,
          },
          reason: 'INTERVAL',
        });

        const expectedDatapoints = [
          {
            timestamp: new Date(1552726800000),
            value: 36.26105251209135,
          },
          {
            timestamp: new Date(1552734000000),
            value: 36.2421327365039,
          },
        ];

        expect(result.data).toEqual(expectedDatapoints);
        expect(result.drawPoints).toBeTruthy();
      });
    });

    describe('reason UPDATE_SUBDOMAIN', () => {
      it('should merge subdomain points', async () => {
        const mergeInsertImpl = DataLoader.mergeInsert;
        // @ts-ignore
        DataLoader.mergeInsert = jest.fn();
        // @ts-ignore
        DataLoader.mergeInsert.mockReturnValue(datapointsList.datapoints);

        const result = await dataLoader.cogniteloader(undefined)({
          id: 123,
          timeDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
          timeSubDomain: [Date.now() - 24 * 60 * 60 * 1000, Date.now()],
          pointsPerSeries: 200,
          oldSeries: {
            id: 123,
            data: [],
            xAccessor: DataLoader.xAccessor,
            yAccessor: DataLoader.yAccessor,
            y0Accessor: DataLoader.y0Accessor,
            y1Accessor: DataLoader.y1Accessor,
          },
          reason: 'UPDATE_SUBDOMAIN',
        });

        expect(sdk.datapoints.retrieve).toHaveBeenCalledTimes(1);
        expect(result.drawPoints).toBeFalsy();
        expect(result.data).toEqual(datapoints);
        expect(DataLoader.mergeInsert).toHaveBeenCalledTimes(1);

        // @ts-ignore
        DataLoader.mergeInsert = mergeInsertImpl;
      });
    });
  });
});
