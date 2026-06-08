"use client";

import { useState, useEffect } from "react";
import { setPin, removePin, isPinEnabled, verifyPin } from "@/lib/pin";

type Phase = "menu" | "verify_old" | "set_new" | "set_first";
type PinAction = "change" | "disable";

export function PinSettings() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<Phase>("set_first");
  const [action, setAction] = useState<PinAction | null>(null);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (open) {
      const pinExists = isPinEnabled();
      setEnabled(pinExists);
      setPhase(pinExists ? "menu" : "set_first");
      setAction(null);
      setOldPin(""); setNewPin(""); setConfirmPin("");
      setError(""); setSaved(false);
    }
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  function startAction(act: PinAction) {
    setAction(act);
    setPhase("verify_old");
    setOldPin(""); setError("");
  }

  function handleVerifyOld() {
    if (oldPin.length < 4) { setError("กรุณากรอก PIN เดิม"); return; }
    if (!verifyPin(oldPin)) {
      setError("รหัส PIN เดิมไม่ถูกต้อง");
      setOldPin("");
      return;
    }
    setError("");
    if (action === "disable") {
      removePin();
      setEnabled(false);
      setSavedMsg("ปิด PIN เรียบร้อย");
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
    } else {
      setPhase("set_new");
      setNewPin(""); setConfirmPin("");
    }
  }

  function handleSavePin() {
    if (newPin.length < 4) { setError("PIN ต้องมีอย่างน้อย 4 หลัก"); return; }
    if (newPin.length > 8) { setError("PIN ต้องไม่เกิน 8 หลัก"); return; }
    if (newPin !== confirmPin) { setError("PIN ไม่ตรงกัน"); return; }
    setPin(newPin);
    setEnabled(true);
    setSavedMsg("บันทึก PIN เรียบร้อย");
    setSaved(true);
    setNewPin(""); setConfirmPin(""); setError("");
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  const modalTitle =
    phase === "set_first" ? "ตั้ง PIN ครั้งแรก" :
    phase === "menu" ? "PIN ผู้จัดการ" :
    phase === "verify_old" ? (action === "disable" ? "ปิด PIN" : "เปลี่ยน PIN") :
    "กำหนด PIN ใหม่";

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

            {/* Header */}
            <div className="p-6 border-b border-surface-variant flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-[20px]">lock</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">{modalTitle}</h3>
              </div>
              <button onClick={handleClose} className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">close</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {saved && (
                <div className="flex items-center gap-2 p-3 bg-primary-container rounded-xl">
                  <span className="material-symbols-outlined text-on-primary-container text-[16px]">check_circle</span>
                  <p className="font-body-sm text-on-primary-container">{savedMsg}</p>
                </div>
              )}

              {/* menu: PIN enabled — choose action */}
              {phase === "menu" && (
                <p className="font-body-md text-on-surface-variant text-sm">
                  PIN ถูกตั้งค่าไว้แล้ว เลือกการดำเนินการ
                </p>
              )}

              {/* verify_old: enter current PIN */}
              {phase === "verify_old" && (
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    ยืนยัน PIN เดิม
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={oldPin}
                    onChange={(e) => { setOldPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOld(); }}
                    placeholder="••••"
                    autoFocus
                    className="w-full bg-secondary-container rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  />
                  {error && (
                    <p className="mt-1.5 text-xs text-error font-label-caps flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {error}
                    </p>
                  )}
                </div>
              )}

              {/* set_first or set_new: enter new PIN */}
              {(phase === "set_first" || phase === "set_new") && (
                <>
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                      PIN ใหม่ (4–8 หลัก)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={newPin}
                      onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                      placeholder="••••"
                      autoFocus
                      className="w-full bg-secondary-container rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                      ยืนยัน PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSavePin(); }}
                      placeholder="••••"
                      className="w-full bg-secondary-container rounded-xl px-4 py-3 text-center text-xl tracking-widest font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                    {error && (
                      <p className="mt-1.5 text-xs text-error font-label-caps flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {error}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-surface-variant space-y-2">
              {phase === "menu" && (
                <>
                  <button
                    onClick={() => startAction("change")}
                    className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all"
                  >
                    เปลี่ยน PIN
                  </button>
                  <button
                    onClick={() => startAction("disable")}
                    className="w-full py-2.5 rounded-xl font-body-md text-error hover:bg-error-container transition-colors"
                  >
                    ปิด PIN
                  </button>
                </>
              )}

              {phase === "verify_old" && (
                <>
                  <button
                    onClick={handleVerifyOld}
                    disabled={oldPin.length < 4}
                    className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {action === "disable" ? "ยืนยันและปิด PIN" : "ยืนยัน PIN เดิม"}
                  </button>
                  <button
                    onClick={() => setPhase("menu")}
                    className="w-full py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    ย้อนกลับ
                  </button>
                </>
              )}

              {(phase === "set_first" || phase === "set_new") && (
                <>
                  <button
                    onClick={handleSavePin}
                    disabled={newPin.length < 4}
                    className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-body-md hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {phase === "set_first" ? "ตั้ง PIN" : "บันทึก PIN ใหม่"}
                  </button>
                  {phase === "set_new" && (
                    <button
                      onClick={() => setPhase("menu")}
                      className="w-full py-2.5 rounded-xl font-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      ย้อนกลับ
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
