import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./Picker.css";

interface PickerProps {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
}

const ITEM_H = 44;
const VISIBLE_COUNT = 5;

export default function Picker({
  visible,
  title,
  options,
  value,
  onConfirm,
  onCancel,
  searchable,
  searchValue,
  onSearchChange,
}: PickerProps) {
  const initIdx = Math.max(0, options.indexOf(value));
  const [selectedIdx, setSelectedIdx] = useState(initIdx);
  const [offset, setOffset] = useState(-initIdx * ITEM_H);
  const trackRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (visible) {
      const idx = Math.max(0, options.indexOf(value));
      setSelectedIdx(idx);
      setOffset(-idx * ITEM_H);
    }
  }, [visible, value, options]);

  function clamp(val: number) {
    const max = 0;
    const min = -(Math.max(0, options.length - 1)) * ITEM_H;
    return Math.max(min, Math.min(max, val));
  }

  function snapTo(rawOffset: number) {
    const snapped = Math.round(rawOffset / ITEM_H) * ITEM_H;
    const clamped = clamp(snapped);
    setOffset(clamped);
    setSelectedIdx(Math.abs(clamped / ITEM_H));
  }

  function onTouchStart(e: React.TouchEvent) {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startOffset.current = offset;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    setOffset(clamp(startOffset.current + dy));
  }

  function onTouchEnd() {
    isDragging.current = false;
    snapTo(offset);
  }

  function handleConfirm() {
    onConfirm(options[selectedIdx] || "");
  }

  if (!visible) return null;

  return createPortal(
    <div className="picker-overlay" onClick={onCancel}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-toolbar">
          <button className="picker-cancel" onClick={onCancel}>
            取消
          </button>
          <span className="picker-title">{title}</span>
          <button className="picker-confirm" onClick={handleConfirm}>
            确定
          </button>
        </div>

        {searchable && (
          <div className="picker-search">
            <input
              className="picker-search-input"
              placeholder="搜索经销商..."
              value={searchValue || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        )}

        {options.length === 0 ? (
          <div className="picker-empty">
            {searchable && searchValue ? "无匹配结果" : "请先选择省份"}
          </div>
        ) : (
          <div
            className="picker-viewport"
            style={{ height: ITEM_H * VISIBLE_COUNT }}
          >
            <div className="picker-highlight" style={{ height: ITEM_H }} />
            <div
              ref={trackRef}
              className="picker-track"
              style={{
                transform: `translateY(${offset + ITEM_H * 2}px)`,
                transition: isDragging.current ? "none" : "transform 0.3s ease",
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {options.map((opt, i) => (
                <div
                  key={opt}
                  className={`picker-item ${i === selectedIdx ? "active" : ""}`}
                  style={{ height: ITEM_H }}
                  onClick={() => snapTo(-i * ITEM_H)}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
