import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout, CleanStudentLayout } from "./components/Layout";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { QuestionBuilderPage } from "./pages/admin/QuestionBuilderPage";
import { ExamControlPage } from "./pages/admin/ExamControlPage";
import { LiveMonitoringPage } from "./pages/admin/LiveMonitoringPage";
import { ResultsPage } from "./pages/admin/ResultsPage";
import { StudentEntryPage } from "./pages/student/StudentEntryPage";
import { StudentExamListPage } from "./pages/student/StudentExamListPage";
import { AccessDeniedPage } from "./pages/student/AccessDeniedPage";
import { RulesPage } from "./pages/student/RulesPage";
import { WaitingRoomPage } from "./pages/student/WaitingRoomPage";
import { ExamTakingPage } from "./pages/student/ExamTakingPage";
import { ConclusionPage } from "./pages/student/ConclusionPage";
import { BannedPage } from "./pages/student/BannedPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="exams/:examId/questions" element={<QuestionBuilderPage />} />
        <Route path="exams/:examId/control" element={<ExamControlPage />} />
        <Route path="exams/:examId/live" element={<LiveMonitoringPage />} />
        <Route path="exams/:examId/results" element={<ResultsPage />} />
      </Route>
      <Route path="/student" element={<CleanStudentLayout />}>
        <Route path="exams" element={<StudentExamListPage />} />
        <Route path="entry/:examId" element={<StudentEntryPage />} />
        <Route path="access-denied" element={<AccessDeniedPage />} />
        <Route path="rules/:examId" element={<RulesPage />} />
        <Route path="waiting/:examId" element={<WaitingRoomPage />} />
        <Route path="exam/:sessionId" element={<ExamTakingPage />} />
        <Route path="conclusion/:sessionId" element={<ConclusionPage />} />
        <Route path="banned/:sessionId" element={<BannedPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
