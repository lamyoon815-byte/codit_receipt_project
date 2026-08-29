import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <section className="landing-page">
      <div className="landing-hero">
        <h1 className="landing-title">
          <span>See beyond the receipt,</span>
          <strong>discover your spending story</strong>
        </h1>
        <p>한 장의 영수증부터 시작되는 나의 소비 이야기</p>
        <Link to="/dashboard" className="get-started-button">Get Started <span aria-hidden="true">→</span></Link>
      </div>
      <div className="landing-showcase">
        <img src="/images/dashboard-preview.png" alt="Spendly 홈 대시보드 미리보기" />
      </div>
    </section>
  );
}
