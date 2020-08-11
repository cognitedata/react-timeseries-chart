import { ColorList } from '../constants';
import ms from 'ms';

export const decimalTickFormatter = (tick: number, ticks: number[]) =>
  tick.toFixed(findMaxDecimals(ticks));

export const getColorByString = (value: string) =>
  ColorList[
    ((hashCode(value) % ColorList.length) + ColorList.length) % ColorList.length
  ];

const hashCode = (a: string) =>
  String(a)
    .split('')
    .map((c) => c.charCodeAt(0))
    .reduce((hash, char) => (31 * hash + char) | 0, 0);

const countDecimals = (num: number) => {
  if (!Number.isNaN(num) && Math.floor(num) !== num) {
    return num.toString().split('.')[1].length || 0;
  }
  return 0;
};

const findMaxDecimals = (array: number[]) =>
  array.reduce((max, current) => Math.max(max, countDecimals(current)), 0);

export function getGranularityInMS(granularity: string): number {
  return ms(granularity);
}
