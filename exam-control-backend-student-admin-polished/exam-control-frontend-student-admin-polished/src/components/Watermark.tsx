export function Watermark({ text }: { text: string }) {
  return <div className="watermark" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <span key={i}>{text}</span>)}</div>;
}
