export function Loading({ text = "Ачаалж байна..." }: { text?: string }) {
  return <div className="center-card"><div className="spinner" /><p>{text}</p></div>;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error-box">{message}</div>;
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return <div className="empty-state"><h3>{title}</h3>{text && <p>{text}</p>}</div>;
}
