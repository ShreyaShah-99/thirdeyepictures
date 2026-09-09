# Third Eye Photography Management — Frontend

Frontend-only React + TypeScript prototype for the Third Eye Pictures shoot-management system.

## Stack

- React
- TypeScript
- Vite
- React Router
- Lucide React
- CSS design system
- Mock data

## Run

```bash
npm install
npm run dev
```

Then open the URL shown by Vite, normally:

`http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Main routes

- `/` — Dashboard
- `/shoots` — Shoot list
- `/shoots/s1` — Shoot details
- `/calendar` — Calendar
- `/team` — Team
- `/equipment` — Equipment
- `/sd-cards` — SD cards
- `/hard-drives` — Hard drives
- `/hard-drives/hd1` — Hard drive details
- `/notifications` — Notifications
- `/activity` — Activity

## Notes

This version intentionally uses mock data. The service layer and data model can later be separated into API calls when the Node/PostgreSQL backend is implemented.

The primary workflow is:

Inquiry → Confirm → Schedule → Crew Assign → Shoot Day Notes → Cards Assign → Wrapped → Data Copy → Sorting → Editing → Delivered
