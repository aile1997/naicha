import { useState, useEffect, lazy, Suspense } from "react";
import FormSection from "./components/FormSection";
import type { ModalType } from "./components/ResultModal";
import bgFull from "./assets/bg-full.webp";
import rulesImg from "./assets/rules-section.webp";
import "./App.css";

const ResultModal = lazy(() => import("./components/ResultModal"));

const DEMO_CODE = "ABCD-1234-EFGH-5678-IJKL";

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

  // Demo 链路：提交 → 审核中弹窗
  function handleFormSubmit() {
    setModal("reviewing");
  }

  // Demo 链路：查询 → 输入手机号弹窗
  function handleOpenQuery() {
    setModal("query");
  }

  // Demo 链路：手机号查询 → 中奖弹窗
  function handleQuery(_phone: string) {
    setPrizeCode(DEMO_CODE);
    setModal("won");
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
            onClose={() => setModal(null)}
            onQuery={handleQuery}
          />
        )}
      </Suspense>
    </>
  );
}
