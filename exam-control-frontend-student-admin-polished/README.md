# Exam Control Frontend

React + TypeScript + Vite frontend for the website-only controlled exam platform.

## Improved features in this version

- Student available exams page: `/student/exams`
- Auto-refreshing student exam list every 5 seconds
- Clear waiting-room flow before the admin starts an exam
- Cleaner exam-taking section with one question, timer, warning count, and watermark
- Timer starts after the question is displayed, not while loading
- Admin dashboard now explains the creation workflow
- Admin exam cards show next recommended action
- Exam control page includes a readiness checklist
- Excel upload now uses preview → edit → confirm flow
- Teachers can edit uploaded/manual questions after creation
- Results page includes individual student detail and violation timeline

## Local run

```bash
cd exam-control-frontend
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

Admin login page:

```txt
http://localhost:5173/admin/login
```

Student available exams page:

```txt
http://localhost:5173/student/exams
```

## Environment

`.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_DEV_STUDENT_NAME=Demo Student
VITE_DEV_STUDENT_EMAIL=student@example.com
```

## Student result behavior

After finishing the exam, the student sees only:

- submission message;
- number of correct answers, for example `42 / 60`;
- raw score;
- converted score out of 30;
- submission status.

The student does not see the answer key, correct answers, wrong answers, or explanations.

## Teams SSO

Set this in frontend `.env` when the project is configured as a Microsoft Teams tab app:

```env
VITE_ENABLE_TEAMS_SSO=true
```

For local development, keep:

```env
VITE_ENABLE_TEAMS_SSO=false
VITE_ALLOW_DEV_STUDENT_LOGIN=true
```
