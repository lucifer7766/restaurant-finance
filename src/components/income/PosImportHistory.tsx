"use client";

import { useState } from "react";

/* ── Types ── */

export interface ImportTransaction {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string; // full note string
}

export interface ImportBatch {
  batchId: string;
  importedAt: Date;
  transactions: ImportTransaction[];
  totalAmount: number;
  isLegacy?: boolean; // import เก่าก่อนมี batch ID
}

interface Props {
  batches: ImportBatch[];
  onDelete: (batchId: string) => Promise<void>;
  onEdit: (batchId: string, updates: { id: string; date: string; category: string; amount: number }[]) => Promise<void>;
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH")}`;
}

function formatImportDate(d: Date) {
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Edit Modal ── */

interface EditRow {
  id: string;
  date: string;
  category: string;
  amount: string;
}

function EditBatchModal({
  batch,
  onClose,
  onSave,
}: {
  batch: ImportBatch;
  onClose: () => void;
  onSave: (updates: { id: string; date: string; category: string; amount: number }[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<EditRow[]>(
    batch.transactions.map((t) => ({
      id: t.id,
      date: t.date,
      category: t.category,
      amount: String(t.amount),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(i: number, field: keyof EditRow, value: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    for (const r of rows) {
      if (!r.category.trim()) { setError("กรุณากรอกชื่อหมวดหมู่"); return; }
      if (isNaN(Number(r.amount)) || Number(r.amount) <= 0) { setError("ยอดเงินไม่ถูกต้อง"); return; }
    }
    setSaving(true);
    try {
      await onSave(rows.map((r) => ({ id: r.id, date: r.date, category: r.category.trim(), amount: Number(r.amount) })));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="w-full sm:max-w-lg bg-surface sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh]">

        <div className="px-6 pt-6 pb-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">edit</span>
          </div>
          <div className="flex-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">แก้ไขรายงาน POS</h3>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              นำเข้าเมื่อ {formatImportDate(batch.importedAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4 space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-error-container flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[16px]">error</span>
              <p className="text-sm text-on-surface">{error}</p>
            </div>
          )}
          {rows.map((row, i) => (
            <div key={row.id} className="metric-card p-4 rounded-xl space-y-2">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">หมวดหมู่</label>
                <input
                  className="w-full bg-surface-container rounded-xl px-3 py-2 text-sm text-on-surface border border-outline-variant focus:border-primary outline-none"
                  value={row.category}
                  onChange={(e) => updateRow(i, "category", e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-on-surface-variant mb-1">วันที่</label>
                  <input
                    type="date"
                    className="w-full bg-surface-container rounded-xl px-3 py-2 text-sm text-on-surface border border-outline-variant focus:border-primary outline-none"
                    value={row.date}
                    onChange={(e) => updateRow(i, "date", e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-on-surface-variant mb-1">ยอดเงิน (บาท)</label>
                  <input
                    type="number"
                    className="w-full bg-surface-container rounded-xl px-3 py-2 text-sm text-on-surface border border-outline-variant focus:border-primary outline-none"
                    value={row.amount}
                    onChange={(e) => updateRow(i, "amount", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-3 flex gap-3 shrink-0 border-t border-surface-container-low">
          <button onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 disabled:opacity-40">
            <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_top" : "save"}</span>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── Delete Confirm Modal ── */

function DeleteConfirmModal({
  batch,
  onClose,
  onConfirm,
}: {
  batch: ImportBatch;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
      <div className="w-full sm:max-w-sm bg-surface sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col">
        <div className="px-6 pt-6 pb-4">
          <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-error text-[20px]">delete</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">ลบรายงาน POS</h3>
          <p className="font-body-md text-on-surface-variant text-sm">
            {batch.isLegacy ? "รายการนำเข้าเก่า (ไม่พบ Batch ID)" : `นำเข้าเมื่อ ${formatImportDate(batch.importedAt)}`}
          </p>
          <div className="mt-3 p-3 rounded-xl bg-surface-container">
            <p className="text-sm text-on-surface">{batch.transactions.length} หมวดหมู่ · ยอดรวม {fmt(batch.totalAmount)}</p>
          </div>
          {batch.isLegacy ? (
            <div className="mt-3 p-3 rounded-xl bg-tertiary-container">
              <p className="text-sm text-on-surface">รายการนี้เป็นข้อมูลเก่าก่อนมีระบบ Batch ID การลบจะลบเฉพาะรายการที่ตรวจพบว่าเป็น POS เท่านั้น ไม่กระทบรายรับที่เพิ่มเอง</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-error">รายรับทั้งหมดที่นำเข้าจาก batch นี้จะถูกลบออกจากระบบ</p>
          )}
          {error && (
            <div className="mt-2 p-3 rounded-xl bg-error-container">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-error text-on-error font-medium text-sm disabled:opacity-40 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">{deleting ? "hourglass_top" : "delete"}</span>
            {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main History Component ── */

export function PosImportHistory({ batches, onDelete, onEdit }: Props) {
  const [editingBatch, setEditingBatch] = useState<ImportBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<ImportBatch | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (batches.length === 0) return null;

  const shown = expanded ? batches : batches.slice(0, 5);

  return (
    <div className="space-y-3">

      {shown.map((batch) => (
        <div key={batch.batchId} className="metric-card p-5 rounded-2xl">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-on-surface-variant mb-0.5">
                {batch.isLegacy ? "🗂 POS Import เก่า (ไม่พบ Batch ID)" : `นำเข้าเมื่อ ${formatImportDate(batch.importedAt)}`}
              </p>
              <div className="flex items-baseline gap-1 text-primary">
                <span className="text-base font-bold opacity-50">฿</span>
                <span className="text-2xl font-bold font-headline-md tracking-tight">
                  {batch.totalAmount.toLocaleString("th-TH")}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditingBatch(batch)}
                className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onClick={() => setDeletingBatch(batch)}
                className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {batch.transactions.map((t) => (
              <div key={t.id} className="bg-surface-container rounded-lg px-2 py-1 flex items-center gap-1.5">
                <span className="text-xs text-on-surface-variant">{t.category}</span>
                <span className="text-xs font-medium text-primary">{fmt(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {batches.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-2 text-sm font-medium text-primary hover:underline transition-colors"
        >
          {expanded ? "แสดงน้อยลง" : `ดูทั้งหมด ${batches.length} รายงาน`}
        </button>
      )}

      {editingBatch && (
        <EditBatchModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onSave={async (updates) => {
            await onEdit(editingBatch.batchId, updates);
            setEditingBatch(null);
          }}
        />
      )}

      {deletingBatch && (
        <DeleteConfirmModal
          batch={deletingBatch}
          onClose={() => setDeletingBatch(null)}
          onConfirm={async () => {
            await onDelete(deletingBatch.batchId);
            setDeletingBatch(null);
          }}
        />
      )}
    </div>
  );
}
