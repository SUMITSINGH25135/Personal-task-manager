const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const DB_PATH = path.join(__dirname, 'tasks.json');

async function readTasks() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(DB_PATH, JSON.stringify(tasks, null, 2), 'utf8');
}

function makeTask({ title, description, dueDate }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(),
    description: description?.trim() || '',
    dueDate: dueDate || '',
    completed: false,
    createdAt: new Date().toISOString()
  };
}

app.use(cors());
app.use(express.json());

app.get('/api/tasks', async (req, res) => {
  const tasks = await readTasks();
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { title, description, dueDate } = req.body;
  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const tasks = await readTasks();
  const task = makeTask({ title, description, dueDate });
  tasks.unshift(task);
  await writeTasks(tasks);
  res.status(201).json(task);
});

app.put('/api/tasks/order', async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array' });
  }

  const tasks = await readTasks();
  if (
    orderedIds.length !== tasks.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    !orderedIds.every((id) => tasks.some((task) => task.id === id))
  ) {
    return res.status(400).json({ error: 'orderedIds must contain each task id exactly once' });
  }

  const reordered = orderedIds.map((id) => tasks.find((task) => task.id === id));
  await writeTasks(reordered);
  res.status(204).end();
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, completed } = req.body;
  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = tasks[index];

  if (title !== undefined) {
    task.title = title.trim();
  }
  if (description !== undefined) {
    task.description = description.trim();
  }
  if (dueDate !== undefined) {
    task.dueDate = dueDate;
  }
  if (completed !== undefined) {
    task.completed = !!completed;
  }

  tasks[index] = task;
  await writeTasks(tasks);
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const tasks = await readTasks();
  const next = tasks.filter((task) => task.id !== req.params.id);

  if (next.length === tasks.length) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await writeTasks(next);
  res.status(204).end();
});

app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
