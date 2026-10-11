import type { CharacterId } from "@/lib/characters";

// Original small illustrations, drawn for this interface rather than traced artwork.
export function CharacterFace({ id }: { id: CharacterId }) {
  const bunny = id === "usagi";
  const cat = id === "hachiware" || id === "momonga";
  return (
    <svg className={`friend-face face-${id}`} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="#514741" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        {bunny ? <><path d="M20 29C14 6 18 2 23 5c4 3 4 15 5 21" fill="#fff9d9" /><path d="M36 26c1-12 2-23 7-23 6 0 5 15 1 26" fill="#fff9d9" /></> : cat ? <><path d="m13 30 1-18 14 9M37 21l14-9 1 20" fill={id === "momonga" ? "#e2ddf2" : "#d3e8f7"} /></> : <><path d="M14 29c-11-9-4-20 4-12l5 8" fill={id === "kurimanju" ? "#b79076" : "#fffdf6"} /><path d="M43 25c5-14 18-9 9 4" fill={id === "kurimanju" ? "#b79076" : "#fffdf6"} /></>}
        {id === "shisa" && <><path d="M12 28c-7-6-10 4-5 7-6 4-3 11 3 10-2 7 6 8 8 3" fill="#f4d49e" /><path d="M52 28c7-6 10 4 5 7 6 4 3 11-3 10 2 7-6 8-8 3" fill="#f4d49e" /></>}
        <path d="M12 37c0-13 8-19 20-19 14 0 21 8 21 21 0 13-9 20-22 19C17 58 10 50 12 37Z" fill={bunny ? "#fff9dc" : "#fffdf8"} />
        {id === "hachiware" && <path d="M14 30c2-9 9-12 18-12 10 0 17 5 19 13l-11-4-8 9-8-9-10 3Z" fill="#b6d8ef" stroke="none" />}
        {id === "kurimanju" && <path d="M13 31c3-10 9-13 19-13 10 0 17 5 19 14-9 3-27 3-38-1Z" fill="#ac846a" stroke="none" />}
        {id === "rakko" && <path d="m27 19 5-6 2 6 5-3-1 5M16 35l4 3-4 3" />}
        {id === "shisa" && <path d="M19 26c-1-5 5-7 7-2 1-6 8-6 10-1 4-4 9 0 7 4" />}
        <ellipse cx="23" cy="40" rx={id === "momonga" ? 3 : 2.2} ry={id === "momonga" ? 4 : 3} fill="#514741" stroke="none" />
        <ellipse cx="41" cy="40" rx={id === "momonga" ? 3 : 2.2} ry={id === "momonga" ? 4 : 3} fill="#514741" stroke="none" />
        <ellipse cx="18" cy="46" rx="4" ry="2.5" fill="#f3b8bf" stroke="none" />
        <ellipse cx="46" cy="46" rx="4" ry="2.5" fill="#f3b8bf" stroke="none" />
        {id === "usagi" ? <path d="M28 45h8c0 9-8 9-8 0Z" fill="#f2c1b9" /> : id === "kurimanju" ? <ellipse cx="32" cy="46" rx="2.5" ry="2" fill="#514741" stroke="none" /> : <path d="m28 45 4 3 4-3" />}
        {id === "furuhonya" && <><path d="m24 21 8 4-8 4v-8Zm16 0-8 4 8 4v-8Z" fill="#b9d8eb" /><path d="m20 34 5 1m14 0 5-1" /></>}
      </g>
    </svg>
  );
}
