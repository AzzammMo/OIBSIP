'use strict';

const STORAGE_KEY = 'daylist.tasks.v1';
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const pendingList = document.querySelector('#pending-list');
const completedList = document.querySelector('#completed-list');
const pendingCount = document.querySelector('#pending-count');
const completedCount = document.querySelector('#completed-count');
const pendingEmpty = document.querySelector('#pending-empty');
const completedEmpty = document.querySelector('#completed-empty');
const progressPercent = document.querySelector('#progress-percent');
const progressFill = document.querySelector('#progress-fill');
const progressCaption = document.querySelector('#progress-caption');
const toast = document.querySelector('#toast');
let tasks = loadTasks();
let toastTimeout;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
  } catch (error) {
    console.warn('Unable to load saved tasks:', error);
    return [];
  }
}

function isValidTask(task) {
  return task && typeof task.id === 'string' && typeof task.text === 'string'
    && typeof task.completed === 'boolean' && typeof task.createdAt === 'string';
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Unable to save tasks:', error);
    showToast('Your browser could not save this change.');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Added date unavailable';
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2300);
}

function createTask(text) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };
}

function makeIconButton(label, symbol, className, action, taskId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-button ${className}`.trim();
  button.setAttribute('aria-label', label);
  button.title = label;
  button.textContent = symbol;
  button.dataset.action = action;
  button.dataset.id = taskId;
  return button;
}

function renderTask(task) {
  const item = document.createElement('li');
  item.className = 'task-item';
  item.dataset.id = task.id;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'complete-toggle';
  toggle.dataset.action = 'toggle';
  toggle.dataset.id = task.id;
  toggle.setAttribute('aria-label', task.completed ? 'Mark as pending' : 'Mark as complete');
  toggle.textContent = task.completed ? '✓' : '';

  const content = document.createElement('div');
  content.className = 'task-content';
  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  const time = document.createElement('time');
  time.className = 'task-time';
  time.dateTime = task.createdAt;
  time.textContent = `Added ${formatDate(task.createdAt)}`;
  if (task.completed && task.completedAt) {
    time.textContent += ` · Completed ${formatDate(task.completedAt)}`;
  }
  content.append(text, time);

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  if (!task.completed) actions.append(makeIconButton('Edit task', '✎', '', 'edit', task.id));
  actions.append(makeIconButton('Delete task', '×', 'delete', 'delete', task.id));

  item.append(toggle, content, actions);
  return item;
}

function render() {
  const pending = tasks.filter(task => !task.completed);
  const completed = tasks.filter(task => task.completed);

  pendingList.replaceChildren(...pending.map(renderTask));
  completedList.replaceChildren(...completed.map(renderTask));

  pendingCount.textContent = `${pending.length} pending`;
  completedCount.textContent = `${completed.length} completed`;
  pendingEmpty.hidden = pending.length > 0;
  completedEmpty.hidden = completed.length > 0;

  const total = tasks.length;
  const percentage = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  progressPercent.textContent = `${percentage}%`;
  progressFill.style.width = `${percentage}%`;
  progressCaption.textContent = total === 0
    ? 'A fresh start. One task at a time.'
    : percentage === 100
      ? 'Everything is done. Great work!' 
      : `${completed.length} of ${total} tasks completed. Keep going!`;
}

function updateTask(id, changes) {
  tasks = tasks.map(task => task.id === id ? { ...task, ...changes } : task);
  saveTasks();
  render();
}

taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    showToast('Please enter a task first.');
    taskInput.focus();
    return;
  }
  if (text.length > 120) {
    showToast('Tasks must be 120 characters or fewer.');
    return;
  }
  tasks.unshift(createTask(text));
  saveTasks();
  render();
  taskForm.reset();
  taskInput.focus();
  showToast('Task added to your pending list.');
});

function startInlineEdit(taskId, item) {
  const task = tasks.find(entry => entry.id === taskId);
  if (!task) return;

  const content = item.querySelector('.task-content');
  const form = document.createElement('form');
  form.className = 'edit-form';
  const input = document.createElement('input');
  input.className = 'edit-input';
  input.type = 'text';
  input.maxLength = 120;
  input.value = task.text;
  input.setAttribute('aria-label', 'Edit task description');

  const save = document.createElement('button');
  save.className = 'edit-save';
  save.type = 'submit';
  save.textContent = 'Save';
  const cancel = document.createElement('button');
  cancel.className = 'edit-cancel';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';

  form.append(input, save, cancel);
  content.replaceChildren(form);
  input.focus();
  input.select();

  form.addEventListener('submit', event => {
    event.preventDefault();
    const updatedText = input.value.trim();
    if (!updatedText) {
      showToast('A task cannot be empty.');
      input.focus();
      return;
    }
    updateTask(taskId, { text: updatedText });
    showToast('Task updated.');
  });
  cancel.addEventListener('click', render);
}

function handleTaskAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  const task = tasks.find(entry => entry.id === id);
  if (!task) return;

  if (action === 'toggle') {
    const completed = !task.completed;
    updateTask(id, { completed, completedAt: completed ? new Date().toISOString() : null });
    showToast(completed ? 'Nice work! Task completed.' : 'Task moved back to pending.');
  } else if (action === 'delete') {
    tasks = tasks.filter(entry => entry.id !== id);
    saveTasks();
    render();
    showToast('Task deleted.');
  } else if (action === 'edit') {
    const item = button.closest('.task-item');
    startInlineEdit(id, item);
  }
}

pendingList.addEventListener('click', handleTaskAction);
completedList.addEventListener('click', handleTaskAction);

document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', {
  weekday: 'short', month: 'short', day: 'numeric'
}).format(new Date()).toUpperCase();

render();
