import { ToneConverter } from "@/components/tone-converter";
import Link from "next/link";

export default function Home() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#converter">문장 변환으로 건너뛰기</a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="치이톡 홈">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>치이톡<span className="brand-english">chiitalk</span></span>
        </Link>
        <span className="header-note">한마디에 담는 작은 즐거움</span>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <h1 id="page-title">먼작귀 친구들의 말로 바꿔서,<br className="intro-break" /> 친구들과 재밌게 소통해 보세요.</h1>
            <p>수고했어, 고마워, 같이 놀자!<br className="mobile-break" /> 평범한 한마디에도 작은 재미를 담아요.</p>
          </div>
          <div className="intro-bubbles" aria-hidden="true"><span>와아…!</span><span>야하—!</span></div>
        </section>

        <ToneConverter />
      </main>

      <footer className="site-footer">
        <p>치이카와를 좋아하는 마음으로 만든 비공식 팬 프로젝트예요.<br />캐릭터와 원작의 권리는 원저작자에게 있어요.</p>
        <a href="https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/notion/DESIGN.md" target="_blank" rel="noreferrer">디자인 참고</a>
      </footer>
    </div>
  );
}
