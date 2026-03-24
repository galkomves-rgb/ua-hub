import { useEffect, useState } from "react";

const CITY_KEY = "uahub-global-city";
const CITY_EVENT = "uahub:city-change";
const DEFAULT_CITY = "All Spain";

export function getGlobalCity(): string {
  if (typeof window === "undefined") {
    return DEFAULT_CITY;
  }

  return window.localStorage.getItem(CITY_KEY) ?? DEFAULT_CITY;
}

export function setGlobalCity(city: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CITY_KEY, city);
  window.dispatchEvent(new CustomEvent(CITY_EVENT, { detail: city }));
}

export function useGlobalCity() {
  const [city, setCityState] = useState<string>(() => getGlobalCity());

  useEffect(() => {
    const sync = (event?: Event) => {
      const customEvent = event as CustomEvent<string> | undefined;
      setCityState(customEvent?.detail ?? getGlobalCity());
    };

    window.addEventListener(CITY_EVENT, sync as EventListener);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(CITY_EVENT, sync as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    city,
    setCity: (nextCity: string) => {
      setCityState(nextCity);
      setGlobalCity(nextCity);
    },
  };
}
