# Exam Control Backend

Node.js + Express + TypeScript + MongoDB Atlas backend for the website-only controlled exam platform.

## Improved features in this version

- Student available exams endpoint: `GET /api/student/exams`
- Exam list checks Teams/member access rules before returning exams
- Excel upload preview endpoint: `POST /api/admin/exams/:examId/questions/import-excel-preview`
- Excel import confirm endpoint: `POST /api/admin/exams/:examId/questions/import-excel-confirm`
- Existing direct Excel import remains available
- Safer rules acceptance: submitted/banned sessions are not reset to waiting
- Structured question support remains flexible per exam
- Current question is still delivered one at a time
- Timer starts only after frontend calls `question-displayed`
- Major violation skips the current question
- 4th major violation creates `banned_provisional` result

## Local run

```bash
cd exam-control-backend
npm config set registry https://registry.npmjs.org/
npm install
npm run seed:admin
npm run dev
```

Health check:

```bash
curl http://localhost:5000/health
```

Admin seed default:

```txt
admin@example.com
Admin12345!
```

## Important

The `.env` file contains your MongoDB Atlas connection string. Do not push it to a public repository.

## Strategic Management Seed Exam

This project includes a ready-made 60-question Mongolian Strategic Management exam.

Run:

```bash
npm run seed:all
```

or separately:

```bash
npm run seed:admin
npm run seed:strategic
```

Seeded exam details:

- Title: `Стратегийн менежмент — 60 сонголттой дасгал`
- Questions: 60
- Time: 60 seconds per question
- Raw score: calculated from actual question points
- Converted score: 30
- Fallback code: `STRAT-60`
- Status: `ready`

Students can enter from `/student/exams` using Teams SSO or the fallback code if code access is enabled.

## Microsoft Teams SSO

The backend includes a real Teams SSO token exchange path using MSAL On-Behalf-Of flow and Microsoft Graph.

Required backend `.env` values:

```env
MS_CLIENT_ID=
MS_TENANT_ID=
MS_CLIENT_SECRET=
MS_ALLOWED_TEAM_ID=
ENFORCE_TEAMS_ACCESS=true
```

Required frontend `.env` value:

```env
VITE_ENABLE_TEAMS_SSO=true
```

You still need Azure App Registration, Teams App Manifest, Microsoft Graph delegated permissions (`User.Read`, `Team.ReadBasic.All`), and admin consent before live Teams SSO works.
