"use client"
import { createContext, useContext, useState } from "react";

export const LoadingContext = createContext({
  show: false,
  setShow: (v: boolean) => {},
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <LoadingContext.Provider value={{ show, setShow }}>
      {children}
    </LoadingContext.Provider>
  );
} 