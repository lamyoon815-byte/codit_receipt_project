import {
  BusFront, Camera, Coffee, Ellipsis, FileCheck2, Hospital, ImageUp, LoaderCircle,
  Pencil, ReceiptText, RefreshCw, ShoppingBag, ShoppingBasket, Theater, Utensils, X,
} from 'lucide-react';
import { type ChangeEvent, type CSSProperties, type DragEvent, useEffect, useRef, useState } from 'react';
import { CATEGORY_API_CODE, CATEGORY_META, normalizeCategory } from '../constants/categories';
import { analyzeReceipt, createReceipt } from '../services/receiptApi';
import type { ReceiptCreateRequest } from '../types/api';
import type { ExpenseCategory } from '../types/expense';
import { formatWon } from '../utils/currency';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

const CATEGORY_OPTIONS: Array<{ id: ExpenseCategory; icon: typeof Utensils }> = [
  { id: 'food', icon: Utensils },
  { id: 'cafe', icon: Coffee },
  { id: 'shopping', icon: ShoppingBag },
  { id: 'transport', icon: BusFront },
  { id: 'living', icon: ShoppingBasket },
  { id: 'medical', icon: Hospital },
  { id: 'culture', icon: Theater },
  { id: 'other', icon: Ellipsis },
];

interface EditableReceipt {
  storeName: string;
  date: string;
  totalAmount: number;
  items: Array<{ name: string; price: number }>;
  category: ExpenseCategory;
}

function getDominantCategory(data: ReceiptCreateRequest): ExpenseCategory {
  const totals = new Map<ExpenseCategory, number>();
  data.items.forEach((item) => {
    const category = normalizeCategory(item.category);
    totals.set(category, (totals.get(category) ?? 0) + Number(item.price));
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

export function ReceiptUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<EditableReceipt | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream, isCameraOpen]);
  useEffect(() => () => cameraStream?.getTracks().forEach((track) => track.stop()), [cameraStream]);

  async function runAnalysis(imageFile: File) {
    setIsAnalyzing(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await analyzeReceipt(imageFile);
      setReceipt({
        storeName: data.store_name,
        date: data.date,
        totalAmount: Number(data.total_amount),
        items: data.items.map((item) => ({ name: item.name, price: Number(item.price) })),
        category: getDominantCategory(data),
      });
    } catch (analysisError) {
      setReceipt(null);
      setError(analysisError instanceof Error ? analysisError.message : '영수증을 분석하지 못했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function selectFile(imageFile?: File) {
    if (!imageFile) return;
    if (!ACCEPTED_TYPES.includes(imageFile.type)) {
      setError('JPG 또는 PNG 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (imageFile.size > MAX_FILE_SIZE) {
      setError('이미지 크기는 최대 10MB까지 가능합니다.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(imageFile);
    setPreviewUrl(URL.createObjectURL(imageFile));
    void runAnalysis(imageFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function openCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저에서는 카메라 촬영을 지원하지 않습니다.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch {
      setError('카메라를 열 수 없습니다. 브라우저의 카메라 권한을 허용해 주세요.');
    }
  }

  function closeCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('카메라 화면이 준비되지 않았습니다. 잠시 후 다시 촬영해 주세요.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('촬영한 이미지를 생성하지 못했습니다.');
        return;
      }
      const capturedFile = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeCamera();
      selectFile(capturedFile);
    }, 'image/jpeg', 0.92);
  }

  function updateItem(index: number, field: 'name' | 'price', value: string) {
    setReceipt((current) => current && ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index
        ? { ...item, [field]: field === 'price' ? Number(value) : value }
        : item),
    }));
  }

  async function handleSave() {
    if (!receipt || receipt.items.length === 0) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createReceipt({
        store_name: receipt.storeName,
        date: receipt.date,
        total_amount: Number(receipt.totalAmount),
        items: receipt.items.map((item) => ({
          name: item.name,
          price: Number(item.price),
          category: CATEGORY_API_CODE[receipt.category],
        })),
      });
      setSuccess('소비 내역에 영수증을 등록했습니다.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '영수증을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`receipt-page ${file ? 'has-receipt' : 'is-empty'}`}>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleFileChange} />

      <section className="receipt-upload-panel">
        <div
          className={`receipt-drop-zone ${previewUrl ? 'has-preview' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="업로드한 영수증 미리보기" />
              <button className="change-image-button" type="button" onClick={() => fileInputRef.current?.click()}>
                <ImageUp size={17} /> 이미지 변경
              </button>
            </>
          ) : (
            <div className="upload-prompt">
              <span className="receipt-upload-icon"><ReceiptText size={48} /></span>
              <h1>영수증 이미지를 업로드하세요</h1>
              <p>JPG, PNG 파일 (최대 10MB)</p>
              <button className="primary-upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
                <ImageUp size={20} /> 이미지 선택
              </button>
            </div>
          )}
        </div>
        <div className="upload-divider"><span>또는</span></div>
        <button className="camera-button" type="button" onClick={() => void openCamera()}>
          <Camera size={20} /> 카메라로 촬영하기
        </button>
      </section>

      <section className="receipt-result-panel">
        <header className="receipt-result-header">
          <h1>추출된 정보</h1>
          <button type="button" disabled={!file || isAnalyzing} onClick={() => file && void runAnalysis(file)}>
            <RefreshCw size={17} className={isAnalyzing ? 'spin' : ''} /> 다시 인식하기
          </button>
        </header>

        {isAnalyzing ? (
          <div className="receipt-result-state"><LoaderCircle className="spin" size={36} /><strong>AI가 영수증을 분석하고 있어요</strong><span>잠시만 기다려 주세요.</span></div>
        ) : receipt ? (
          <>
            <div className="receipt-fields-grid">
              <label><span>상호명</span><div><input value={receipt.storeName} onChange={(event) => setReceipt({ ...receipt, storeName: event.target.value })} /><Pencil size={16} /></div></label>
              <label><span>날짜</span><div><input type="date" value={receipt.date} onChange={(event) => setReceipt({ ...receipt, date: event.target.value })} /><Pencil size={16} /></div></label>
              <label><span>총 금액</span><div><input type="number" min="0" value={receipt.totalAmount} onChange={(event) => setReceipt({ ...receipt, totalAmount: Number(event.target.value) })} /><Pencil size={16} /></div></label>
            </div>

            <div className="receipt-items-box">
              <h2>품목 정보</h2>
              {receipt.items.map((item, index) => (
                <div className="receipt-item-row" key={`${index}-${item.name}`}>
                  <input aria-label={`품목 ${index + 1} 이름`} value={item.name} onChange={(event) => updateItem(index, 'name', event.target.value)} />
                  <input aria-label={`품목 ${index + 1} 금액`} type="number" min="0" value={item.price} onChange={(event) => updateItem(index, 'price', event.target.value)} />
                  <span>{formatWon(item.price)}</span>
                </div>
              ))}
            </div>

            <div className="receipt-category-section">
              <h2>카테고리</h2>
              <div className="receipt-category-list">
                {CATEGORY_OPTIONS.map(({ id, icon: Icon }) => {
                  const meta = CATEGORY_META[id];
                  const selected = receipt.category === id;
                  return (
                    <button
                      key={id} type="button" className={selected ? 'selected' : ''}
                      style={{ '--category-color': meta.chart, '--category-bg': meta.background } as CSSProperties}
                      onClick={() => setReceipt({ ...receipt, category: id })}
                    >
                      <span><Icon size={25} /></span><strong>{meta.label}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="receipt-message error" role="alert">{error}</p>}
            {success && <p className="receipt-message success" role="status">{success}</p>}
            <button className="register-receipt-button" type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? <LoaderCircle className="spin" size={20} /> : <FileCheck2 size={20} />}
              {isSaving ? '등록 중...' : '등록하기'}
            </button>
          </>
        ) : (
          <div className="receipt-result-state"><ReceiptText size={38} /><strong>영수증을 업로드해 주세요</strong><span>분석된 정보가 이곳에 표시됩니다.</span>{error && <p className="receipt-message error" role="alert">{error}</p>}</div>
        )}
      </section>

      {isCameraOpen && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="영수증 카메라 촬영">
          <div className="camera-dialog">
            <header><div><strong>영수증 촬영</strong><span>영수증 전체가 화면 안에 들어오도록 맞춰주세요.</span></div><button type="button" onClick={closeCamera} aria-label="카메라 닫기"><X size={22} /></button></header>
            <div className="camera-viewport"><video ref={videoRef} autoPlay playsInline muted /><div className="camera-guide" /></div>
            <footer><button type="button" className="camera-cancel" onClick={closeCamera}>취소</button><button type="button" className="camera-capture" onClick={capturePhoto}><Camera size={20} /> 촬영하기</button></footer>
          </div>
        </div>
      )}
    </div>
  );
}
