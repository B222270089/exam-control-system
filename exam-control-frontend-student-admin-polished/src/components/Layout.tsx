import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Exam Control</div>
        <nav>
          <Link to="/admin/dashboard">Шалгалтууд</Link>
        </nav>
        <button className="ghost" onClick={() => { logout(); navigate('/admin/login'); }}>Гарах</button>
      </aside>
      <main className="main-panel"><Outlet /></main>
    </div>
  );
}

export function CleanStudentLayout() {
  return <main className="student-shell"><Outlet /></main>;
}
