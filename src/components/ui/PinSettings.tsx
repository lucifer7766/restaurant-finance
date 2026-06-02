"use client";

import { useState, useEffect } from "react";
import { getPin, setPin, removePin, isPinEnabled } from "@/lib/pin";

export function PinSettings() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEnabled(isPinEnabled());
  }, [open]);

  function handleSave() {
    if (newPin.length < 4) { setError("PIN ต้องมีอย่างน้อย 4 หลัก"); return; }
    if (newPin !== confirmPin) { setError("PIN ไม่ตรงกัน"); return; }
    setPin(newPin);
    setEnabled(true);
    setSaved(true);
    setNewPin(""); setConfirmPin(""); setError("");
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  function handleDisable() {
    removePin();
    setEnabled(false);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-surface-container-high rounded-xl transition-colors"
      >
        <span className={`material-symbols-outlined text-[20px] ${enabled ? "text-primary" : "text-on-surface-variant"}`}>
          {enabled ? "lock" : "lock_open"}
        </span>
        <div className="flex-1 text-left">
          <p className="font-body-md text-on-surface">PIN ผู้จัดการ</p>
          <p className="font-label-caps text-label-caps text-on-surface-variant">
            {enabled ? "เปิดใช้งาน · ป้องกันการลบ/แก้ไข" : "ปิดอยู่ · ทุกคนแก้ไขได้"}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-label-caps ${enabled ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"}`}>
          {enabled ? "ON" : "OFF"}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-surface-variant flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-[20px]">lock</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">ตั้งค่า PIN</h3>
              </div>
              <button onClick={() => setOpen(false)} className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">close</button>
            </div>

            <div className="p-6 space-y-4">
              {saved && (
                <div className="flex items-center gap-2 p-3 bg-primary-container rounded-xl">
                  <span className="material-symbols-outlined text-on-primary-container text-[16px]">check_circle</span>
                  <p className="font-body-sm text-on-primary-container">บันทึก PIN เรียบร้อย</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-container rounded-xl">
                  <span className="material-symbols-outlined text-error text-[16px]">error</span>
                  <p className="font-body-sm text-on-error-container">{error}</p>
                </div>
              )}
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">PIN ใหม่ (4-8 หลัก)</label>
                <input
                  type="password" inputMode="numeric" maxLength={8}
                  value={newPin}
                  onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="••••"
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">ยืนยัน PIN</label>
                <input
                  type="password" inputMode="numeric" maxLength={8}
                  value={confirmPin}
                  onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="••••"
                  className="w-full bg-secondary-container rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-6 border-t border-surface-variant space-y-2">
              <button onClick={handleSave} disabled={newPin.length < 4} className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all disabled:opacity-40">
                บันทึก PIN
              </button>
              {enabled && (
                <button onClick={handleDisable} className="w-full py-2.5 rounded-xl font-body-md text-error hover:bg-error-container transition-colors">
                  ปิดการใช้งาน PIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
