import { CogniteClient, DatapointAggregate, Timeseries } from '@cognite/sdk';

export const generateDatapoints = ({
  limit = 300,
  start = 1552726800000,
  end = 1552726800000 + 60 * 1000 * 300,
  granularity,
}: {
  limit?: number;
  start?: number;
  end?: number;
  granularity?: number;
}): DatapointAggregate[] => {
  const useGranularity = granularity || (end - start) / limit;
  return new Array(limit).fill(0).map((_, index) => {
    const average = Math.random() * 10;
    const min = average - 1;
    const max = average + 1;
    const count = 100;
    return {
      timestamp: new Date(start + index * useGranularity),
      average,
      min,
      max,
      count,
    };
  });
};

export const generateTimeseriesList = ({
  prefix = 'timeseries',
  limit = 10,
}): Timeseries[] =>
  new Array(limit).fill(0).map((_, index) => ({
    id: index + 1,
    name: `${prefix}-${index}`,
    isString: false,
    unit: 'bar',
    metadata: {
      tag: `${prefix}-${index}`,
    },
    assetId: index,
    isStep: false,
    description: `${prefix}: description here`,
    createdTime: new Date(0),
    lastUpdatedTime: new Date(0),
  }));

export class MockCogniteClient extends CogniteClient {
  constructor(options: any) {
    super(options);
    const endpoints = [
      'assets',
      'timeseries',
      'datapoints',
      'events',
      'files',
      'raw',
      'projects',
      'groups',
      'securityCategories',
      'serviceAccounts',
      'models3D',
      'revisions3D',
      'files3D',
      'assetMappings3D',
      'viewer3D',
      'apiKeys',
    ];
    endpoints.forEach((endpoint) =>
      Object.defineProperty(this, endpoint, {
        writable: true,
        enumerable: true,
        configurable: true,
        value: {},
      })
    );
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
