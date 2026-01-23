// Server-side localStorage polyfill for Next.js
// This prevents "localStorage.getItem is not a function" errors during SSR

if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {};

  (globalThis as any).localStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
    key: (index: number) => Object.keys(storage)[index] ?? null,
    get length() { return Object.keys(storage).length; }
  };
}

// Also handle case where localStorage exists but methods are not functions
if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
  const ls = globalThis.localStorage;
  if (typeof ls.getItem !== 'function') {
    const storage: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
      key: (index: number) => Object.keys(storage)[index] ?? null,
      get length() { return Object.keys(storage).length; }
    };
  }
}

export {};
