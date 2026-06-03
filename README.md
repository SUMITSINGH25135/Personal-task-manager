# Personal Task Manager

A simple full-stack task manager built with Express, Node.js, and React (Vite).

## Features

- Add tasks with a required title and optional description and due date
- View tasks sorted by newest first
- Toggle tasks complete/incomplete
- Edit task title, description, and due date
- Delete tasks with confirmation
- Filter tasks by All, Active, or Completed
- Search tasks by title
- Active/completed task counts
- Drag-and-drop task reordering
- Overdue task styling
- Persistent storage in `tasks.json`

## Tech stack

- Backend: Node.js + Express
- Frontend: React + Vite
- Storage: JSON file (`tasks.json`)
- Styling: plain CSS

## Setup

1. Install dependencies for the backend:
   ```bash
   cd c:\Users\Sumit\Personal_Task_Manager
   npm install
   ```
2. Install dependencies for the frontend:
   ```bash
   cd c:\Users\Sumit\Personal_Task_Manager\client
   npm install
   ```

## Run

### Development

From the project root:

```bash
cd c:\Users\Sumit\Personal_Task_Manager
npm run dev
```

- Backend runs on `http://localhost:4000`
- Frontend runs on `http://localhost:5173`

### Production build

Build the frontend and serve the static files from Express:

```bash
cd c:\Users\Sumit\Personal_Task_Manager\client
npm run build
cd c:\Users\Sumit\Personal_Task_Manager
npm start
```

Then open `http://localhost:4000`.

## Project structure

- `server.js` - Express API and static file server
- `tasks.json` - persisted tasks storage
- `client/` - React frontend
- `client/src/App.jsx` - main app UI and logic
- `client/src/App.css` - styling

## Notes

- No user authentication is included.
- Tasks persist across server restarts via `tasks.json`.
- Delete prompts confirm before removing a task.
