import {
  DataLoaderProps,
  DataProviderSeriesWithDatapoints,
} from '@cognite/griff-react';
import {
  Aggregate,
  CogniteClient,
  DatapointsQueryId,
  DatapointAggregate,
  DoubleDatapoint,
  Timeseries,
} from '@cognite/sdk';
import {
  AccessorFunction,
  DataLoaderCallReasons,
  DataLoaderDatapoint,
  DataLoaderFetchedDatapointsList,
  FetchedSeries,
  FilterFetchedSeriesFunc,
} from './interfaces';

interface SeriesState {
  firstSeries: DatapointAggregate[];
  subDomain: number[];
  granularity: string;
}

interface GetTimeseriesParams {
  id: number;
  start: number;
  end: number;
  granularity: string;
}

const noOpFilter: FilterFetchedSeriesFunc = (_, id) => id;

export class DataLoader {
  static yAccessor = (dp: DataLoaderDatapoint): number => {
    if ((dp as DoubleDatapoint).value !== undefined) {
      return Number((dp as DoubleDatapoint).value!);
    }
    if ((dp as DatapointAggregate).stepInterpolation !== undefined) {
      return Number((dp as DatapointAggregate).stepInterpolation);
    }
    if ((dp as DatapointAggregate).average !== undefined) {
      return Number((dp as DatapointAggregate).average);
    }
    // We can get here if we ask for a stepInterpolation
    // and there's no points in the range [0, t1]
    // where the domain asked for is [t0, t1]
    return 0;
  };

  static y0Accessor = (dp: DatapointAggregate): number =>
    dp.min ? dp.min : DataLoader.yAccessor(dp);

  static y1Accessor = (dp: DatapointAggregate): number =>
    dp.max ? dp.max : DataLoader.yAccessor(dp);

  static xAccessor = (dp: DataLoaderDatapoint): number =>
    dp.timestamp.getTime();

  static calculateGranularity = (domain: number[], limit: number) => {
    const diff = domain[1] - domain[0];
    for (let i = 1; i <= 60; i += 1) {
      const points = diff / (1000 * i);
      if (points < limit) {
        return `${i === 1 ? '' : i}s`;
      }
    }
    for (let i = 1; i <= 60; i += 1) {
      const points = diff / (1000 * 60 * i);
      if (points < limit) {
        return `${i === 1 ? '' : i}m`;
      }
    }
    for (let i = 1; i < 24; i += 1) {
      const points = diff / (1000 * 60 * 60 * i);
      if (points < limit) {
        return `${i === 1 ? '' : i}h`;
      }
    }
    for (let i = 1; i < 100; i += 1) {
      const points = diff / (1000 * 60 * 60 * 24 * i);
      if (points < limit) {
        return `${i === 1 ? '' : i}day`;
      }
    }
    return 'day';
  };

  static isRawDataPossible = (
    points: DatapointAggregate[],
    pointsPerSeries: number
  ): boolean => {
    const numberOfPoints = points.reduce(
      (result: number, point: DatapointAggregate) => {
        return result + (point.count || 0);
      },
      0
    );

    return numberOfPoints < pointsPerSeries / 2;
  };

  static mergeInsert = (
    base: DatapointAggregate[],
    toInsert: DatapointAggregate[],
    xAccessor: AccessorFunction,
    subDomain: number[]
  ) => {
    if (toInsert.length === 0) {
      return base;
    }

    const strippedBase: DatapointAggregate[] = base.filter(
      (point) =>
        xAccessor(point) < subDomain[0] || xAccessor(point) > subDomain[1]
    );
    return [...strippedBase, ...toInsert].sort(
      (a, b) => xAccessor(a) - xAccessor(b)
    );
  };

  timeseries = {
    results: new Map<number, Promise<Timeseries>>(),
    requests: new Map<number, Promise<Timeseries>>(),
  };

  SERIES_GETTERS: Map<number, SeriesState> = new Map<number, SeriesState>();

  ongoingRequest: { [id: string]: boolean } = {};
  constructor(private sdkClient: CogniteClient) {}

  getSubdomain = (id: number) =>
    id
      ? (this.SERIES_GETTERS.get(id) || { subDomain: [0, 1] }).subDomain
      : [0, 1];

  getGranularity = (id: number) =>
    id
      ? (this.SERIES_GETTERS.get(id) || { granularity: '1d' }).granularity
      : '1d';

  getTimeSeries = (id: number): Promise<Timeseries> => {
    if (this.timeseries.requests.has(id)) {
      return this.timeseries.requests.get(id)!;
    }
    if (this.timeseries.results.has(id)) {
      return this.timeseries.results.get(id)!;
    }
    const promise = this.sdkClient.timeseries
      .retrieve([{ id }])
      .then((timeseriesList: Timeseries[]) => {
        this.timeseries.results = this.timeseries.results.set(
          id,
          Promise.resolve(timeseriesList[0])
        );
        this.timeseries.requests.delete(id);
        return timeseriesList[0];
      });
    this.timeseries.requests = this.timeseries.requests.set(id, promise);

    return promise;
  };

  retrieveDatapoints = ({
    id,
    start,
    end,
    aggregates,
    granularity,
    limit,
  }: DatapointsQueryId): Promise<DataLoaderFetchedDatapointsList> => {
    const aggregatesProps = aggregates
      ? {
          aggregates: [...aggregates, 'min', 'max', 'count'] as Aggregate[],
          granularity,
        }
      : {};

    return this.sdkClient.datapoints.retrieve({
      items: [
        {
          id,
          start,
          end,
          limit,
          ...aggregatesProps,
        },
      ],
    });
  };

  private getSeriesUpdatingInterval = async (
    { id, start, end, granularity }: GetTimeseriesParams,
    oldSeries: DataProviderSeriesWithDatapoints
  ) => {
    const { data: oldData, drawPoints, step } = oldSeries;
    const aggregates = [step ? 'stepInterpolation' : 'average'] as Aggregate[];

    if (this.ongoingRequest[id]) {
      return oldSeries;
    }

    this.ongoingRequest[id] = true;
    // Note: this pulls from the xDomain -- *not* the fetchDomain -- in
    // order to prevent the aggregate granularity from shifting while the data
    // is streaming in. If it was set to the fetchDomain, then it would change
    // constantly as the fetchDomain slides backwards.
    const params = drawPoints
      ? { id, start, end }
      : { id, start, end, granularity, aggregates };

    const [{ datapoints: data = [] }] = await this.retrieveDatapoints(params);

    this.ongoingRequest[id] = false;

    return oldData
      ? { ...oldSeries, data: [...oldData, ...data] }
      : { ...oldSeries, data: data };
  };

  cogniteloader = (
    filterSeries: FilterFetchedSeriesFunc = noOpFilter
  ) => async (
    loaderProps: DataLoaderProps
  ): Promise<DataProviderSeriesWithDatapoints> => {
    const {
      id,
      timeDomain: baseDomain,
      timeSubDomain: subDomain,
      pointsPerSeries,
      oldSeries,
      reason,
    } = loaderProps;

    const fetchDomain = (reason === 'MOUNTED' ? baseDomain : subDomain).map(
      Math.round
    );
    const granularity = DataLoader.calculateGranularity(
      fetchDomain,
      pointsPerSeries
    );
    const tsId = Number(id);
    const { xAccessor = DataLoader.xAccessor, data: oldData } = oldSeries;

    switch (reason) {
      case DataLoaderCallReasons.INTERVAL: {
        // Note: this pulls from the xDomain -- *not* the fetchDomain -- in
        // order to prevent the aggregate granularity from shifting while the data
        // is streaming in. If it was set to the fetchDomain, then it would change
        // constantly as the fetchDomain slides backwards.
        const start =
          oldData && oldData.length
            ? xAccessor(oldData[oldData.length - 1]) + 1
            : baseDomain[0];
        const end = Date.now();

        return this.getSeriesUpdatingInterval(
          { id: tsId, start, end, granularity },
          oldSeries
        );
      }
      case DataLoaderCallReasons.MOUNTED:
      case DataLoaderCallReasons.UPDATE_SUBDOMAIN:
      default: {
        const seriesInfo = this.SERIES_GETTERS.get(tsId) || {
          firstSeries: [],
          subDomain,
          granularity,
        };
        const [start, end] = fetchDomain;

        if (end - start < 1000) {
          // Zooming REALLY far in (1 ms end to end)
          return oldSeries;
        }

        const tsResponse = await this.getTimeSeries(id);
        const { isStep } = tsResponse;
        const aggregates = [
          isStep ? 'stepInterpolation' : 'average',
        ] as Aggregate[];
        const params = {
          id: tsId,
          start,
          end,
          granularity,
          aggregates,
          limit: pointsPerSeries,
        };
        const [
          { datapoints: points },
        ]: DataLoaderFetchedDatapointsList = await this.retrieveDatapoints(
          params
        );
        const isRawDataNeeded = DataLoader.isRawDataPossible(
          points as DatapointAggregate[],
          pointsPerSeries
        );
        let fetchedSeries: FetchedSeries;

        if (isRawDataNeeded) {
          let [{ datapoints: data }] = await this.retrieveDatapoints({
            id: tsId,
            start,
            end,
            limit: pointsPerSeries,
          });
          if (isStep && points.length) {
            // Use the last-known value from step-interpolation to create a fake point at the left-boundary
            if (data.length && points[0].timestamp < data[0].timestamp) {
              data = [points[0], ...data];
            } else if (!data.length) {
              data = [points[0]];
            }
          }
          fetchedSeries = {
            data,
            drawPoints: true,
            step: isStep,
          };
        } else {
          fetchedSeries = {
            data: points,
            drawPoints: false,
            step: isStep,
          };
        }

        if (reason === 'UPDATE_SUBDOMAIN') {
          const { firstSeries } = seriesInfo;
          const seriesById = this.SERIES_GETTERS.get(tsId);
          this.SERIES_GETTERS.set(tsId, {
            ...seriesById,
            firstSeries: seriesById ? seriesById.firstSeries : [],
            subDomain,
            granularity,
          });
          const data = DataLoader.mergeInsert(
            firstSeries,
            fetchedSeries.data,
            xAccessor,
            subDomain
          );
          fetchedSeries = { ...fetchedSeries, data };
        }

        if (reason === 'MOUNTED') {
          const val = this.SERIES_GETTERS.get(tsId) || {};
          this.SERIES_GETTERS.set(tsId, {
            ...val,
            firstSeries: fetchedSeries.data,
            subDomain,
            granularity,
          });
        }

        return { ...oldSeries, ...filterSeries(loaderProps, fetchedSeries) };
      }
    }
  };
}
