[![Build Status](https://github.com/cognitedata/react-timeseries-chart/workflows/Lint%20&%20Build%20&%20Test%20&%20Deploy/badge.svg)](https://github.com/cognitedata/react-timeseries-chart/actions?query=branch:master)
[![Storybook](https://cdn.jsdelivr.net/gh/storybookjs/brand@master/badge/badge-storybook.svg)](https://cognitedata.github.io/react-timeseries-chart/?path=/docs/time-series-timeserieschart--basic-usage)

# react-timeseries-chart
React timeseries chart implementation based on @cognite/griff-react

## How to use
You can add package to your application via yarn:
```
yarn add @cognite/react-timeseries-chart
```

Then you can add component to you code importing it:
```typescript jsx
import React from 'react';
import { TimeseriesChart } from '@cognite/react-timeseries-chart';
import { CogniteClient } from '@cognite/sdk';

const client = new CogniteClient({appId: 'example'});

// ...

const Component = () => {
  return <TimeseriesChart client={client} series={[123]}/>
}
``` 

You can check [storybook](https://cognitedata.github.io/react-timeseries-chart/?path=/docs/time-series-timeserieschart--basic-usage) for more examples.
