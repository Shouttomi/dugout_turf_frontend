'use client';

import { useState, useEffect } from 'react';
import { store } from './store';

// Subscribe a component to the store. Returns the store; read with store.get().
export function useStore() {
  const [, bump] = useState(0);
  useEffect(() => {
    const un = store.subscribe(() => bump((n) => n + 1));
    store.hydrate();
    return un;
  }, []);
  return store;
}
