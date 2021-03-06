import { CogniteClient } from '@cognite/sdk';
import { SDK_EXCLUDE_FROM_TRACKING_METHODS } from '../constants';

export type ExcludeMethods = typeof SDK_EXCLUDE_FROM_TRACKING_METHODS[number];
export type ClientApiKeys = Exclude<keyof CogniteClient, ExcludeMethods>;
export type ClientApiTypes = CogniteClient[ClientApiKeys];
