import { useState } from "react";
import "./ResultModal.css";

export type ModalType = "thanks" | "reviewing" | "won" | "query";

interface ResultModalProps {
  type: ModalType;
  code?: string;
  onClose: () => void;
  onQuery?: (phone: string) => void;
}

export default function ResultModal({
  type,
  code = "",
  onClose,
  onQuery,
}: ResultModalProps) {
  const [phone, setPhone] = useState("");

  function handleCopy() {
    if (code) navigator.clipboard.writeText(code);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#2d2d2d" />
            <path
              d="M8 8L16 16M16 8L8 16"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {type === "thanks" && (
          <div className="modal-body center">
            <p className="modal-title">很遗憾</p>
            <p className="modal-subtitle">感谢您的参与</p>
          </div>
        )}

        {type === "reviewing" && (
          <div className="modal-body center">
            <p className="modal-title">正在人工审核中</p>
            <p className="modal-subtitle">请稍后查看</p>
          </div>
        )}

        {type === "won" && (
          <div className="modal-body center">
            <p className="modal-title">恭喜您中奖啦</p>
            <div className="won-code-section">
              <p className="won-code-label">获取兑换券码</p>
              <p className="won-code">{code}</p>
            </div>
            <button className="modal-btn" onClick={handleCopy}>
              复制兑换券码
            </button>
          </div>
        )}

        {type === "query" && (
          <div className="modal-body center">
            <p className="modal-title">已提交</p>
            <p className="modal-subtitle">输入电话号码查看中奖信息</p>
            <input
              className="modal-input"
              type="tel"
              placeholder="请输入电话"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              className="modal-btn"
              onClick={() => onQuery?.(phone)}
            >
              提交查看
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
