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
        <span className="header-note">먼작귀 친구들의 말투로</span>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <h1 id="page-title">이 말을, 그 친구라면?</h1>
          <p>친구를 고르고 짧은 문장을 적어보세요.</p>
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
