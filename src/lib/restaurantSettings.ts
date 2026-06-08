"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "slipless_restaurant_name_v1";
export const DEFAULT_RESTAURANT_NAME = "ร้านอาหารของฉัน";

export function getRestaurantName(): string {
  if (typeof window === "undefined") return DEFAULT_RESTAURANT_NAME;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_RESTAURANT_NAME;
}

export function setRestaurantName(name: string): void {
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useRestaurantName(): [string, (name: string) => void] {
  const [name, setNameState] = useState(DEFAULT_RESTAURANT_NAME);

  useEffect(() => {
    setNameState(getRestaurantName());
  }, []);

  const setName = useCallback((newName: string) => {
    setRestaurantName(newName);
    setNameState(newName.trim() || DEFAULT_RESTAURANT_NAME);
  }, []);

  return [name, setName];
}
