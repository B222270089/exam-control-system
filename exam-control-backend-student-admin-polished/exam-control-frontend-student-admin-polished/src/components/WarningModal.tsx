interface Props {
  title: string;
  message: string;
  onContinue: () => void;
  danger?: boolean;
}

export function WarningModal({ title, message, onContinue, danger }: Props) {
  return (
    <div className="modal-backdrop">
      <div className={`modal-card ${danger ? "danger" : ""}`}>
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onContinue}>Ойлголоо, үргэлжлүүлэх</button>
      </div>
    </div>
  );
}
