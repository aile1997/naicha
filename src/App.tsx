import { useState, useEffect, lazy, Suspense } from "react";
import FormSection from "./components/FormSection";
import type { ModalType } from "./components/ResultModal";
import bgFull from "./assets/bg-full.webp";
import rulesImg from "./assets/rules-section.webp";
import "./App.css";

const ResultModal = lazy(() => import("./components/ResultModal"));

// 活动时间：3月28日-4月6日，每日 9:00-18:00（北京时间 UTC+8）
function isActivityOpen(): boolean {
  // 获取北京时间
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijing = new Date(utc + 8 * 3600000);

  const year = beijing.getFullYear();
  const month = beijing.getMonth() + 1; // 1-indexed
  const day = beijing.getDate();
  const hour = beijing.getHours();

  // 日期范围：2026年3月25日 ~ 2026年4月6日
  const dateNum = year * 10000 + month * 100 + day;
  if (dateNum < 20260325 || dateNum > 20260406) return false;

  // 时间范围：9:00 ~ 18:00
  if (hour < 9 || hour >= 18) return false;

  return true;
}

export default function App() {
  const [modal, setModal] = useState<ModalType | null>(null);
  const [prizeCode, setPrizeCode] = useState("");
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = bgFull;
    img.onload = () => {
      setBgLoaded(true);
      const el = document.getElementById("loading");
      if (el) el.classList.add("hide");
      setTimeout(() => el?.remove(), 500);

    };
  }, []);

  function handleFormSubmit() {
    if (!isActivityOpen()) {
      setModal("closed");
      return;
    }
    setModal("reviewing");
  }

  function handleOpenQuery() {
    setModal("query");
  }

  async function handleQuery(phone: string) {
    try {
      const res = await fetch(`/milk_tea/api/query?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();

      if (!data.found) {
        alert("未找到提交记录，请确认手机号是否正确");
        return;
      }

      if (data.status === "won") {
        setPrizeCode(data.code);
      }
      setModal(data.status as ModalType);
    } catch {
      alert("查询失败，请稍后重试");
    }
  }

  function handleClose() {
    setModal(null);
  }

  return (
    <>
      <div
        className={`page ${bgLoaded ? "page--loaded" : ""}`}
        style={{ backgroundImage: `url(${bgFull})` }}
      >
        <div className="hero-spacer" />

        <FormSection onSubmit={handleFormSubmit} onOpenQuery={handleOpenQuery} />

        <img
          className="rules-img"
          src={rulesImg}
          alt="活动规则"
          loading="lazy"
        />
      </div>

      <Suspense>
        {modal && (
          <ResultModal
            type={modal}
            code={prizeCode}
            onClose={handleClose}
            onQuery={handleQuery}
          />
        )}
      </Suspense>
    </>
  );
}
