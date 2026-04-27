import { createContext, useCallback, useContext, useState } from 'react';

const LoadingContext = createContext({ isLoading: false, track: (fn) => fn() });

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0);

  // Wrap any async read with track() to register it with the global loading bar.
  const track = useCallback(async (fn) => {
    setCount(c => c + 1);
    try {
      return await fn();
    } finally {
      setCount(c => c - 1);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading: count > 0, track }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  return useContext(LoadingContext);
}
