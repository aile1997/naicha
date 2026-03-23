import { useState, useRef, type ChangeEvent } from "react";
import formBg from "../assets/form-bg.webp";
import uploadIconOrder from "../assets/upload-icon-order.png";
import uploadIconSelfie from "../assets/upload-icon-selfie.png";
import "./FormSection.css";

interface FormSectionProps {
  onSubmit: (data: FormData) => void;
}

interface FormData {
  name: string;
  phone: string;
  province: string;
  city: string;
  dealer: string;
  remark: string;
  orderPhoto: File | null;
  selfiePhoto: File | null;
  agreed: boolean;
}

const PROVINCES = [
  "北京", "上海", "天津", "重庆", "河北", "山西", "辽宁", "吉林",
  "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
  "湖北", "湖南", "广东", "海南", "四川", "贵州", "云南", "陕西",
  "甘肃", "青海", "台湾", "内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门",
];

export default function FormSection({ onSubmit }: FormSectionProps) {
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    province: "",
    city: "",
    dealer: "",
    remark: "",
    orderPhoto: null,
    selfiePhoto: null,
    agreed: false,
  });
  const [orderPreview, setOrderPreview] = useState<string>("");
  const [selfiePreview, setSelfiePreview] = useState<string>("");
  const orderInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const MAX_REMARK = 200;

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    if (name === "remark" && value.length > MAX_REMARK) return;
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
    onSubmit(form);
  }

  return (
    <section className="form-section">
      <img className="form-card-bg" src={formBg} alt="" />

      <div className="form-body">
        <input
          className="form-input form-item"
          name="name"
          placeholder="请输入姓名"
          value={form.name}
          onChange={handleChange}
        />

        <input
          className="form-input form-item"
          name="phone"
          type="tel"
          placeholder="请输入电话"
          value={form.phone}
          onChange={handleChange}
        />

        <div className="form-row form-item">
          <div className="form-select-wrap">
            <select
              className="form-select"
              name="province"
              value={form.province}
              onChange={handleChange}
            >
              <option value="" disabled>
                请选择省
              </option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span className="select-arrow" />
          </div>
          <div className="form-select-wrap">
            <select
              className="form-select"
              name="city"
              value={form.city}
              onChange={handleChange}
            >
              <option value="" disabled>
                请选择市
              </option>
            </select>
            <span className="select-arrow" />
          </div>
        </div>

        <div className="form-select-wrap full form-item">
          <select
            className="form-select"
            name="dealer"
            value={form.dealer}
            onChange={handleChange}
          >
            <option value="" disabled>
              请选择经销商
            </option>
          </select>
          <span className="select-arrow" />
        </div>

        <div className="form-model-row form-item">
          <span className="model-label">购车车系：HR-V</span>
          <span className="model-counter">
            {form.remark.length} / {MAX_REMARK}
          </span>
        </div>

        {/* 隐私协议（设计稿位于车系行与上传区域之间） */}
        <label className="privacy-row form-item">
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

        {/* 上传区域 */}
        <div
          className="upload-area form-item"
          onClick={() => orderInputRef.current?.click()}
        >
          {orderPreview ? (
            <img className="upload-preview" src={orderPreview} alt="订单照片" />
          ) : (
            <img
              className="upload-icon"
              src={uploadIconOrder}
              alt="上传4S店门头照片"
            />
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
          className="upload-area form-item"
          onClick={() => selfieInputRef.current?.click()}
        >
          {selfiePreview ? (
            <img className="upload-preview" src={selfiePreview} alt="合影照片" />
          ) : (
            <img
              className="upload-icon"
              src={uploadIconSelfie}
              alt="上传本人和HR-V的合影"
            />
          )}
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFileChange("selfiePhoto", e)}
          />
        </div>

        {/* 提交按钮 */}
        <button
          className="submit-btn form-item"
          disabled={!form.agreed}
          onClick={handleSubmit}
        >
          提交打卡
        </button>
      </div>
    </section>
  );
}
