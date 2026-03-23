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
    img.onload = () => setBgLoaded(true);
  }, []);

  function handleFormSubmit() {
    setModal("reviewing");
  }

  function handleQuery(phone: string) {
    console.log("查询电话:", phone);
  }

  function openDemo(type: ModalType) {
    if (type === "won") setPrizeCode(DEMO_CODE);
    setModal(type);
  }

  return (
    <>
      <div
        className={`page ${bgLoaded ? "page--loaded" : ""}`}
        style={{ backgroundImage: `url(${bgFull})` }}
      >
        <div className="hero-spacer" />

        <FormSection onSubmit={handleFormSubmit} />

        <img
          className="rules-img"
          src={rulesImg}
          alt="活动规则"
          loading="lazy"
        />

        {/* 弹窗演示入口（仅开发环境，紧跟活动规则下方） */}
        {import.meta.env.DEV && (
          <div className="demo-links">
            <span onClick={() => openDemo("thanks")}>未中奖</span>
            <span onClick={() => openDemo("reviewing")}>审核中</span>
            <span onClick={() => openDemo("won")}>中奖</span>
            <span onClick={() => openDemo("query")}>查询</span>
          </div>
        )}
      </div>

      {/* 弹窗放在 .page 外部，避免 filter 影响 position:fixed */}
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
