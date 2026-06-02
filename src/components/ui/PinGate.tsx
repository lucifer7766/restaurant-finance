"use client";

import { useState, useEffect, useRef } from "react";
import { verifyPin, isSessionActive, isPinEnabled, refreshSession } from "@/lib/pin";

type Props = {
  onUnlock: () => void;
  onCancel: () => void;
  /** true = ถามทุกครั้งไม่ข้าม session (ใช้กับ action ทำลาย เช่น ลบ) */
  forcePrompt?: boolean;
  title?: string;
  subtitle?: string;
};

export function PinGate({ onUnlock, onCancel, forcePrompt = false, title = "ยืนยันตัวตน", subtitle = "ใส่ PIN ผู้จัดการ" }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // ข้าม session ได้เฉพาะเมื่อ forcePrompt=false
    if (!isPinEnabled()) { onUnlock(); return; }
    if (!forcePrompt && isSessionActive()) { refreshSession(); onUnlock(); return; }
    inputRef.current?.focus();
  }, [onUnlock, forcePrompt]);

  function handleSubmit() {
    if (verifyPin(pin)) {
      onUnlock();
    } else {
      setError("PIN ไม่ถูกต้อง");
      setPin("");
      inputRef.current?.focus();
    }
  }

  if (!isPinEnabled()) return null;
  if (!forcePrompt && isSessionActive()) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-surface-variant flex items-center gap-3">
          <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-[20px]">lock</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container rounded-xl">
              <span className="material-symbols-outlined text-error text-[16px]">error</span>
              <p className="font-body-sm text-on-error-container">{error}</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="••••"
            className="w-full bg-secondary-container rounded-xl px-4 py-4 text-center text-2xl tracking-widest font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="p-6 border-t border-surface-variant flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-variant transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSubmit} disabled={pin.length < 4} className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all disabled:opacity-40">
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
