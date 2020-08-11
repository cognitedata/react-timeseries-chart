import { CogniteClient } from '@cognite/sdk';
import { version, SDK_EXCLUDE_FROM_TRACKING_METHODS } from '../constants';
import { ClientApiKeys, ClientApiTypes, ExcludeMethods } from './types';

const GearboxHeader = `ReactTimeseriesChart:${version}`;

function getComponentHeader(component: string) {
  return `${GearboxHeader}/${component}`;
}

export function wrapInLogProxy(
  client: CogniteClient,
  componentName: string
): CogniteClient {
  const clientHandler: ProxyHandler<CogniteClient> = {
    get(target, name: ClientApiKeys) {
      if (
        target[name] &&
        !SDK_EXCLUDE_FROM_TRACKING_METHODS.includes(name as ExcludeMethods)
      ) {
        return new Proxy(target[name], createApiHandler<ClientApiTypes>());
      } else {
        return target[name];
      }
    },
  };

  const createApiHandler = <T extends ClientApiTypes>(): ProxyHandler<T> => ({
    get(target: T, propKey: keyof T) {
      const originalProperty = target[propKey];
      if (typeof originalProperty === 'function') {
        return <Args>(...args: Args[]) => {
          client!.setOneTimeSdkHeader(getComponentHeader(componentName));

          return originalProperty(...args);
        };
      } else {
        return originalProperty;
      }
    },
  });

  return client ? new Proxy(client, clientHandler) : client;
}
