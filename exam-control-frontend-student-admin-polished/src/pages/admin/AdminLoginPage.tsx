import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function AdminLoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin12345!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setRole } = useAuth();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(email, password);
      setRole("admin");
      navigate("/admin/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Админ нэвтрэх</h1>
        <p>Шалгалт үүсгэх, эхлүүлэх, үр дүн харах хэсэг.</p>
        {error && <div className="error-box">{error}</div>}
        <label>Имэйл</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Нууц үг</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading}>{loading ? "Нэвтэрч байна..." : "Нэвтрэх"}</button>
      </form>
    </div>
  );
}
