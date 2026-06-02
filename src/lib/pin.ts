const PIN_KEY = "plu_manager_pin_v1";
const SESSION_KEY = "plu_pin_session_v1";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 นาที

export function getPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PIN_KEY);
}

export function setPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}

export function removePin(): void {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function isPinEnabled(): boolean {
  return !!getPin();
}

export function verifyPin(input: string): boolean {
  const pin = getPin();
  if (!pin) return true;
  if (pin === input) {
    localStorage.setItem(SESSION_KEY, String(Date.now()));
    return true;
  }
  return false;
}

export function isSessionActive(): boolean {
  const ts = localStorage.getItem(SESSION_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < SESSION_TIMEOUT_MS;
}

export function refreshSession(): void {
  if (localStorage.getItem(SESSION_KEY)) {
    localStorage.setItem(SESSION_KEY, String(Date.now()));
  }
}
