export function clearBrokenStudentSession() {
  localStorage.removeItem("studentToken");
  localStorage.removeItem("student");
  localStorage.removeItem("studentName");
  localStorage.removeItem("studentCode");
  localStorage.removeItem("examCode");

  Object.keys(localStorage)
    .filter((key) => key.startsWith("examCode:"))
    .forEach((key) => localStorage.removeItem(key));

  sessionStorage.clear();
}
