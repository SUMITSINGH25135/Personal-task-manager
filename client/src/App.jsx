import { useEffect, useMemo, useState } from 'react';
import './App.css';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' }
];

const SORT_OPTIONS = [
  { key: 'created-newest', label: 'Created: newest first' },
  { key: 'created-oldest', label: 'Created: oldest first' },
  { key: 'due-soonest', label: 'Due date: soonest first' },
  { key: 'due-latest', label: 'Due date: latest first' }
];

function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('created-newest');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ title: '', description: '', dueDate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.filter((task) => task.completed).length;

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (filter === 'active' && task.completed) return false;
        if (filter === 'completed' && !task.completed) return false;
        if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [tasks, filter, search]
  );

  const sortedTasks = useMemo(() => {
    const tasksToSort = [...filteredTasks];

    const dueValue = (task) => (task.dueDate ? new Date(task.dueDate).getTime() : null);
    const createdValue = (task) => new Date(task.createdAt).getTime();

    if (sortKey === 'created-newest') {
      return tasksToSort.sort((a, b) => createdValue(b) - createdValue(a));
    }
    if (sortKey === 'created-oldest') {
      return tasksToSort.sort((a, b) => createdValue(a) - createdValue(b));
    }
    if (sortKey === 'due-soonest') {
      return tasksToSort.sort((a, b) => {
        const aDue = dueValue(a);
        const bDue = dueValue(b);
        if (aDue === null && bDue === null) return 0;
        if (aDue === null) return 1;
        if (bDue === null) return -1;
        return aDue - bDue;
      });
    }
    if (sortKey === 'due-latest') {
      return tasksToSort.sort((a, b) => {
        const aDue = dueValue(a);
        const bDue = dueValue(b);
        if (aDue === null && bDue === null) return 0;
        if (aDue === null) return 1;
        if (bDue === null) return -1;
        return bDue - aDue;
      });
    }

    return tasksToSort;
  }, [filteredTasks, sortKey]);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await request('/api/tasks');
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getReorderedTasks(fromId, toId) {
    const visibleIds = filteredTasks.map((task) => task.id);
    const currentIndex = visibleIds.indexOf(fromId);
    const targetIndex = visibleIds.indexOf(toId);
    if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) {
      return tasks;
    }

    const nextVisible = [...filteredTasks];
    const [moved] = nextVisible.splice(currentIndex, 1);
    nextVisible.splice(targetIndex, 0, moved);

    const visibleSet = new Set(visibleIds);
    const updatedTasks = [];
    let visiblePointer = 0;

    for (const task of tasks) {
      if (visibleSet.has(task.id)) {
        updatedTasks.push(nextVisible[visiblePointer++]);
      } else {
        updatedTasks.push(task);
      }
    }

    return updatedTasks;
  }

  async function saveOrder(orderedTasks) {
    setTasks(orderedTasks);
    try {
      await request('/api/tasks/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: orderedTasks.map((task) => task.id) })
      });
    } catch (err) {
      setError(err.message);
      await loadTasks();
    }
  }

  function handleDragStart(event, taskId) {
    setDraggedId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  }

  function handleDragOver(event, taskId) {
    event.preventDefault();
    setDragOverId(taskId);
  }

  function handleDrop(event, taskId) {
    event.preventDefault();
    const fromId = draggedId || event.dataTransfer.getData('text/plain');
    if (!fromId || fromId === taskId) {
      setDragOverId(null);
      return;
    }

    const reordered = getReorderedTasks(fromId, taskId);
    setDragOverId(null);
    setDraggedId(null);
    saveOrder(reordered);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  async function createTask(event) {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    try {
      const task = await request('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, dueDate })
      });
      setTasks((current) => [task, ...current]);
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTask(id, changes) {
    try {
      const updated = await request(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditValues({ title: task.title, description: task.description, dueDate: task.dueDate || '' });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({ title: '', description: '', dueDate: '' });
  }

  async function saveEdit(id) {
    if (!editValues.title.trim()) {
      setError('Please enter a title.');
      return;
    }

    await updateTask(id, editValues);
    cancelEdit();
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Task Manager</p>
          <h1>Personal tasks, done right.</h1>
          <p>Quickly add, update, complete, and delete tasks with persistent storage.</p>
        </div>
        <div className="stats-card">
          <p>{activeCount} active</p>
          <p>{completedCount} completed</p>
        </div>
      </header>

      <section className="panel">
        <form className="task-form" onSubmit={createTask}>
          <div className="field-row">
            <label>
              Title <span className="required">*</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a new task" />
            </label>
            <label>
              Due date
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional details" />
          </label>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="primary-button">
            Add task
          </button>
        </form>
      </section>

      <section className="panel controls-row">
        <div className="filter-buttons">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={filter === option.key ? 'selected' : ''}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="search-box">
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles..." />
        </label>

        <label className="sort-box">
          Sort by
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        {loading ? (
          <p className="empty-state">Loading tasks…</p>
        ) : sortedTasks.length === 0 ? (
          <div className="empty-state">
            <h2>No tasks yet</h2>
            <p>Add your first task to get started.</p>
          </div>
        ) : (
          <ul className="task-list">
            {sortedTasks.map((task) => {
              const overdue = isOverdue(task);
              const isDragging = draggedId === task.id;
              const isDragOver = dragOverId === task.id;
              return (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, task.id)}
                  onDragOver={(event) => handleDragOver(event, task.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => handleDrop(event, task.id)}
                  onDragEnd={handleDragEnd}
                  className={`task-card ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                >
                  <div className="task-head">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => updateTask(task.id, { completed: !task.completed })}
                      />
                      <span>{task.completed ? 'Completed' : 'Active'}</span>
                    </label>
                    <div className="task-actions">
                      <button type="button" onClick={() => startEdit(task)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => deleteTask(task)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingId === task.id ? (
                    <div className="edit-form">
                      <input
                        value={editValues.title}
                        onChange={(event) => setEditValues((curr) => ({ ...curr, title: event.target.value }))}
                      />
                      <textarea
                        value={editValues.description}
                        onChange={(event) => setEditValues((curr) => ({ ...curr, description: event.target.value }))}
                      />
                      <input
                        type="date"
                        value={editValues.dueDate}
                        onChange={(event) => setEditValues((curr) => ({ ...curr, dueDate: event.target.value }))}
                      />
                      <div className="edit-buttons">
                        <button type="button" onClick={() => saveEdit(task.id)}>
                          Save
                        </button>
                        <button type="button" className="secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="task-main">
                        <h3>{task.title}</h3>
                        {task.description && <p>{task.description}</p>}
                      </div>
                      <div className="task-meta">
                        <span>Created {formatDate(task.createdAt)}</span>
                        {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
