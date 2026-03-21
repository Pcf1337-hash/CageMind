// WeakRef polyfill for Hermes compatibility
if (typeof WeakRef === 'undefined') {
  (global as unknown as Record<string, unknown>).WeakRef = class WeakRefPolyfill<T extends object> {
    private _ref: T;
    constructor(target: T) { this._ref = target; }
    deref(): T | undefined { return this._ref; }
  };
}

import { LogBox } from 'react-native';

// Suppress known library warnings (gifted-chat internal key prop spread)
LogBox.ignoreLogs([
  'A props object containing a "key" prop is being spread into JSX',
]);

import 'expo-router/entry';
