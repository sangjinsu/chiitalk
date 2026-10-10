import { ToneConverter } from "@/components/tone-converter";
import Link from "next/link";

export default function Home() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#converter">문장 변환으로 건너뛰기</a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="치이톡 홈">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>치이톡<span className="brand-english">chiitalk</span></span>
        </Link>
        <span className="header-note">조금 다른 말투, 같은 마음</span>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <h1 id="page-title">내 문장에<br />작은 성격 하나.</h1>
            <p>하고 싶은 말은 그대로.<br className="mobile-break" /> 말투는 치이카와 친구들처럼 바꿔봐요.</p>
          </div>
          <div className="intro-sticker" aria-hidden="true">
            <span className="sticker-spark spark-one">✦</span>
            <span className="sticker-spark spark-two">✧</span>
            <div className="sticker-face"><span /><span /><i /></div>
            <span className="sticker-note">마음을 담아<br />톡!</span>
          </div>
        </section>

        <ToneConverter />
      </main>

      <footer className="site-footer">
        <p>치이카와를 좋아하는 마음으로 만든 비공식 팬 프로젝트예요.<br />캐릭터와 원작의 권리는 원저작자에게 있어요.</p>
        <a href="https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/notion/DESIGN.md" target="_blank" rel="noreferrer">디자인 참고: Notion</a>
      </footer>
    </div>
  );
}
