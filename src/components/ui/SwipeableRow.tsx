"use client";

/**
 * SwipeableRow
 *
 * Mobile  → swipe left to reveal Edit / Delete action buttons (iOS-Mail style)
 * Desktop → buttons appear on hover via CSS (existing behaviour preserved)
 *
 * Usage:
 *   <SwipeableRow onEdit={...} onDelete={...}>
 *     {/* row content * /}
 *   </SwipeableRow>
 */

import { useRef, useState, useCallback } from "react";

const ACTION_WIDTH = 112; // px — width of the revealed action panel
const SWIPE_THRESHOLD = 56; // px — minimum drag to snap open

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  /** Extra className applied to the outer wrapper */
  className?: string;
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  className = "",
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0); // current translateX of the row content
  const [isOpen, setIsOpen] = useState(false);

  const startXRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);

  /* ── Touch handlers ─────────────────────────────────────────────────────── */

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      startOffsetRef.current = offset;
      isDraggingRef.current = false;
    },
    [offset]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null) return;

    const dx = e.touches[0].clientX - startXRef.current;
    isDraggingRef.current = true;

    // Only allow swipe left (negative dx) up to ACTION_WIDTH
    const next = Math.max(-ACTION_WIDTH, Math.min(0, startOffsetRef.current + dx));
    setOffset(next);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;

    // Snap: if dragged past threshold → open; else close
    if (offset < -SWIPE_THRESHOLD) {
      setOffset(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setOffset(0);
      setIsOpen(false);
    }

    startXRef.current = null;
    isDraggingRef.current = false;
  }, [offset]);

  /* Close row when user taps the content while open */
  const handleContentClick = useCallback(() => {
    if (isOpen) {
      setOffset(0);
      setIsOpen(false);
    }
  }, [isOpen]);

  /* ── Edit / Delete with auto-close ─────────────────────────────────────── */

  const handleEdit = useCallback(() => {
    setOffset(0);
    setIsOpen(false);
    onEdit();
  }, [onEdit]);

  const handleDelete = useCallback(() => {
    setOffset(0);
    setIsOpen(false);
    onDelete();
  }, [onDelete]);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    /*
     * Outer wrapper:
     *  - `group` enables desktop hover reveal via Tailwind group-hover
     *  - `overflow-hidden` clips the sliding content
     *  - `relative` lets the action panel sit absolutely inside
     */
    <div
      className={`relative overflow-hidden group ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Action panel (always rendered behind the row) ── */}
      <div
        className={`
          absolute inset-y-0 right-0 flex items-center
          transition-opacity duration-200
          opacity-0 group-hover:opacity-100
          lg:z-10
          ${isOpen ? "opacity-100" : ""}
        `}
        style={{ width: ACTION_WIDTH }}
        aria-hidden={!isOpen}
      >
        <button
          onClick={handleEdit}
          aria-label="แก้ไข"
          className="
            flex-1 h-full flex flex-col items-center justify-center gap-0.5
            bg-primary-container text-on-primary-container
            hover:brightness-95 transition-colors
          "
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
          <span className="text-[10px] font-medium">แก้ไข</span>
        </button>
        <button
          onClick={handleDelete}
          aria-label="ลบ"
          className="
            flex-1 h-full flex flex-col items-center justify-center gap-0.5
            bg-error text-on-error
            hover:brightness-95 transition-colors
          "
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
          <span className="text-[10px] font-medium">ลบ</span>
        </button>
      </div>

      {/* ── Main row content (slides left on swipe) ── */}
      <div
        className="relative bg-surface transition-none"
        style={{
          transform: `translateX(${offset}px)`,
          /* Only animate when snapping (not while dragging) */
          transition:
            isDraggingRef.current ? "none" : "transform 0.2s ease",
        }}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}
