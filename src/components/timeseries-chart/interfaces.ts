import {
  AxisDisplayMode,
  AxisPlacement,
  DataLoaderProps,
} from '@cognite/griff-react';
import {
  DatapointAggregates,
  Datapoints,
  DatapointAggregate,
  DoubleDatapoint,
  StringDatapoint,
} from '@cognite/sdk';
import React from 'react';
import CogniteClient from '@cognite/sdk/dist/src/cogniteClient';

export type AxisDisplayModeKeys = keyof typeof AxisDisplayMode;
export type AxisPlacementKeys = keyof typeof AxisPlacement;
export type DataLoaderDatapoint =
  | DatapointAggregate
  | DoubleDatapoint
  | StringDatapoint;
export type DataLoaderDatapoints =
  | DatapointAggregate[]
  | DoubleDatapoint[]
  | StringDatapoint[];
export type DataLoaderFetchedDatapointsList =
  | DatapointAggregates[]
  | Datapoints[];
export type AccessorFunction = (
  datapoint: DataLoaderDatapoint,
  index?: number,
  arr?: DataLoaderDatapoint[]
) => number;

export interface FetchedSeries {
  step?: boolean;
  data: DatapointAggregate[];
  drawPoints: boolean;
}

export type FilterFetchedSeriesFunc = (
  props: DataLoaderProps,
  fetchedSeries: FetchedSeries
) => FetchedSeries;

export interface SeriesProps {
  color?: string;
  hidden?: boolean;
  step?: boolean;
  zoomable?: boolean;
  name?: string;
  timeAccessor?: AccessorFunction;
  xAccessor?: AccessorFunction;
  x0Accessor?: AccessorFunction;
  x1Accessor?: AccessorFunction;
  yAccessor?: AccessorFunction;
  y0Accessor?: AccessorFunction;
  y1Accessor?: AccessorFunction;
  yDomain?: [number, number];
  ySubDomain?: [number, number];
  yAxisPlacement?: AxisPlacementKeys;
  yAxisDisplayMode?: AxisDisplayModeKeys;
  opacity?: number;
}

export interface Annotation {
  id: number;
  data: number[];
  color: string;
  height?: number;
  fillOpacity?: number;
}

export interface TimeseriesChartSeries extends SeriesProps {
  id: number;
  collectionId?: number;
}

export interface TimeseriesChartRulerPoint {
  id: number;
  name: string;
  value: number;
  color: string;
  timestamp: number;
  x: number;
  y: number;
  hidden?: boolean;
}

export interface TimeseriesChartRuler {
  visible: boolean;
  timeFormatter?: (timestamp: number) => string;
  valueFormatter?: (value: number) => string;
}

export interface TimeseriesChartStyles {
  container?: React.CSSProperties;
}

export interface TimeseriesChartCollection extends SeriesProps {
  id: number;
}

export interface TimeseriesChartDomainUpdate {
  x: [number, number];
  y: [number, number];
  time: [number, number];
}

export interface TimeseriesChartProps {
  /**
   * Cognite SDK client for interaction with CDF
   */
  client: CogniteClient;
  /**
   * Series array defined by timeseries ids or series objects
   */
  series: number[] | TimeseriesChartSeries[];
  /**
   * Time which timeseries should start and end. Should be UNIX timestamps or Dates.
   */
  timeDomain?: [number | Date, number | Date];
  /**
   * Time which timeseries should be focused onto by default. Should be UNIX timestamps or Dates.
   */
  timeSubDomain?: [number | Date, number | Date];
  /**
   * Whether the context chart should be showed
   */
  contextChart?: boolean;
  /**
   * Custom styles for the component
   */
  styles?: TimeseriesChartStyles;
  /**
   * The number of aggregated datapoints to show
   */
  pointsPerSeries?: number;
  /**
   * Whether zooming on the chart is enabled
   */
  zoomable?: boolean;
  /**
   * Whether live update of chart is enabled
   */
  liveUpdate?: boolean;
  /**
   * The update interval when live update is enabled
   */
  updateInterval?: number;
  /**
   * Display the ruler and configure custom label formatters
   */
  ruler?: TimeseriesChartRuler;
  /**
   * Height of x-axis container in pixels. 0 will hide it completely
   */
  xAxisHeight?: number;
  /**
   * Default display mode of the y-axis
   */
  yAxisDisplayMode?: AxisDisplayModeKeys;
  /**
   * Default placement of the y-axis
   */
  yAxisPlacement?: AxisPlacementKeys;
  /**
   * Height of the chart
   */
  height?: number;
  /**
   * Width of the chart
   */
  width?: number;
  /**
   * Mouse move callback
   */
  onMouseMove?: (e: any) => void;
  /**
   * On blur event callback
   */
  onBlur?: (e: any) => void;
  /**
   * On mouseout event callback
   */
  onMouseOut?: (e: any) => void;
  /**
   * Callback for failed data request
   */
  onFetchDataError?: (e: Error) => void;
  /**
   * Callback for domain update
   * @param e
   */
  onDomainsUpdate?: (e: {
    [seriesId: number]: TimeseriesChartDomainUpdate;
  }) => void;
  /**
   * Configuration to group few series into one collection
   * represented with single Y-axis
   */
  collections?: TimeseriesChartCollection[];
  /**
   * @ignore
   */
  annotations?: Annotation[];
  /**
   * Callback to be triggered on Annotation click
   */
  onClickAnnotation?: (annotation: Annotation, x: number, y: number) => void;
  /**
   * function to run after the loader has completed.
   * Useful for changing yDomains etc.
   */
  filterSeries?: FilterFetchedSeriesFunc;
}

export enum DataLoaderCallReasons {
  MOUNTED = 'MOUNTED',
  INTERVAL = 'INTERVAL',
  UPDATE_SUBDOMAIN = 'UPDATE_SUBDOMAIN',
}
