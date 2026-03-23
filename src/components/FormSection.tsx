import { useState, useRef, useMemo, type ChangeEvent } from "react";
import Picker from "./Picker";
import dealerData from "../data/dealers.json";
import formBg from "../assets/form-bg.webp";
import uploadIconOrder from "../assets/upload-icon-order.png";
import uploadIconSelfie from "../assets/upload-icon-selfie.png";
import "./FormSection.css";

interface FormSectionProps {
  onSubmit: () => void;
  onOpenQuery: () => void;
}

interface FormState {
  name: string;
  phone: string;
  province: string;
  city: string;
  dealer: string;
  orderPhoto: File | null;
  selfiePhoto: File | null;
  agreed: boolean;
}

const dealers = dealerData as Record<string, Record<string, string[]>>;
const PROVINCES = Object.keys(dealers).sort();

type PickerTarget = "province" | "city" | "dealer" | null;

export default function FormSection({ onSubmit, onOpenQuery }: FormSectionProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    province: "",
    city: "",
    dealer: "",
    orderPhoto: null,
    selfiePhoto: null,
    agreed: false,
  });
  const [orderPreview, setOrderPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [dealerSearch, setDealerSearch] = useState("");
  const orderInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // 联动：省份 → 城市列表
  const cityOptions = useMemo(() => {
    if (!form.province || !dealers[form.province]) return [];
    return Object.keys(dealers[form.province]).sort();
  }, [form.province]);

  // 联动：省份 + 城市 → 经销商列表（支持搜索）
  const dealerOptions = useMemo(() => {
    const list: string[] = [];
    if (form.province && dealers[form.province]) {
      if (form.city && dealers[form.province][form.city]) {
        list.push(...dealers[form.province][form.city]);
      } else {
        // 未选城市时显示该省所有经销商
        Object.values(dealers[form.province]).forEach((arr) => list.push(...arr));
      }
    }
    if (dealerSearch) {
      const kw = dealerSearch.toLowerCase();
      return list.filter((d) => d.toLowerCase().includes(kw));
    }
    return list;
  }, [form.province, form.city, dealerSearch]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(
    field: "orderPhoto" | "selfiePhoto",
    e: ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, [field]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      if (field === "orderPhoto") setOrderPreview(url);
      else setSelfiePreview(url);
    }
  }

  function handleSubmit() {
    if (!form.agreed) return;
    onSubmit();
  }

  function openPicker(target: PickerTarget) {
    if (target === "dealer") setDealerSearch("");
    setPickerTarget(target);
  }

  function getPickerOptions(): string[] {
    if (pickerTarget === "province") return PROVINCES;
    if (pickerTarget === "city") return cityOptions;
    if (pickerTarget === "dealer") return dealerOptions;
    return [];
  }

  function getPickerTitle(): string {
    if (pickerTarget === "province") return "选择省份";
    if (pickerTarget === "city") return "选择城市";
    if (pickerTarget === "dealer") return "选择经销商";
    return "";
  }

  function handlePickerConfirm(value: string) {
    if (!pickerTarget) return;
    setForm((prev) => {
      const next = { ...prev, [pickerTarget]: value };
      // 省份变更时清空城市和经销商
      if (pickerTarget === "province" && value !== prev.province) {
        next.city = "";
        next.dealer = "";
      }
      // 城市变更时清空经销商
      if (pickerTarget === "city" && value !== prev.city) {
        next.dealer = "";
      }
      return next;
    });
    setPickerTarget(null);
  }

  return (
    <section className="form-section">
      <img className="form-card-bg" src={formBg} alt="" />

      <div className="form-body">
        <input
          className="form-input"
          name="name"
          placeholder="请输入姓名"
          value={form.name}
          onChange={handleChange}
        />

        <input
          className="form-input"
          name="phone"
          type="tel"
          placeholder="请输入电话"
          value={form.phone}
          onChange={handleChange}
        />

        <div className="form-row">
          <div
            className="fake-select"
            onClick={() => openPicker("province")}
          >
            <span className={form.province ? "fake-select-value" : "fake-select-placeholder"}>
              {form.province || "请选择省"}
            </span>
            <span className="select-arrow" />
          </div>
          <div
            className="fake-select"
            onClick={() => openPicker("city")}
          >
            <span className={form.city ? "fake-select-value" : "fake-select-placeholder"}>
              {form.city || "请选择市"}
            </span>
            <span className="select-arrow" />
          </div>
        </div>

        <div
          className="fake-select"
          onClick={() => openPicker("dealer")}
        >
          <span className={form.dealer ? "fake-select-value" : "fake-select-placeholder"}>
            {form.dealer || "请选择经销商"}
          </span>
          <span className="select-arrow" />
        </div>

        <div className="form-model-row">
          <span className="model-label">购车车系：HR-V</span>
        </div>

        <label className="privacy-row">
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, agreed: e.target.checked }))
            }
          />
          <span className="privacy-check" />
          <span className="privacy-text">
            我已阅读并同意
            <a href="#privacy" className="privacy-link">
              《个人信息保护政策》
            </a>
          </span>
        </label>

        <div
          className="upload-area"
          onClick={() => orderInputRef.current?.click()}
        >
          {orderPreview ? (
            <img className="upload-preview" src={orderPreview} alt="订单照片" />
          ) : (
            <img className="upload-icon" src={uploadIconOrder} alt="上传4S店门头照片" />
          )}
          <input
            ref={orderInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFileChange("orderPhoto", e)}
          />
        </div>

        <div
          className="upload-area"
          onClick={() => selfieInputRef.current?.click()}
        >
          {selfiePreview ? (
            <img className="upload-preview" src={selfiePreview} alt="合影照片" />
          ) : (
            <img className="upload-icon" src={uploadIconSelfie} alt="上传本人和HR-V的合影" />
          )}
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFileChange("selfiePhoto", e)}
          />
        </div>

        <button
          className="submit-btn"
          disabled={!form.agreed}
          onClick={handleSubmit}
        >
          提交打卡
        </button>

        {/* 演示入口：查询中奖信息 */}
        <p className="query-link-row">
          已提交，点击此处
          <span className="query-link" onClick={onOpenQuery}>查询中奖信息</span>
        </p>
      </div>

      <Picker
        key={pickerTarget}
        visible={pickerTarget !== null}
        title={getPickerTitle()}
        options={getPickerOptions()}
        value={pickerTarget ? form[pickerTarget] : ""}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerTarget(null)}
        searchable={pickerTarget === "dealer"}
        searchValue={dealerSearch}
        onSearchChange={setDealerSearch}
      />
    </section>
  );
}
