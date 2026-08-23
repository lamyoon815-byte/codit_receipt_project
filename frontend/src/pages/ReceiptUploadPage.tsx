import { UploadCloud } from 'lucide-react';
import { Card } from '../components/common/Card';

export function ReceiptUploadPage() {
  return <div className="page"><h1>영수증 등록</h1><Card><div className="upload-zone"><UploadCloud size={44} /><h2>영수증 이미지를 업로드해 주세요</h2><p>AI가 상호명, 금액, 품목과 소비 카테고리를 자동으로 분석합니다.</p><button type="button">이미지 선택</button></div></Card></div>;
}
