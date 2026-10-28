// ============================================================
// Todo-лист: состояние, localStorage, рендер и события
// ============================================================

const STORAGE_KEY = 'todo-tasks-v1';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const formError = document.getElementById('form-error');
const list = document.getElementById('task-list');
const emptyState = document.getElementById('empty');
const counter = document.getElementById('counter');
const clearButton = document.getElementById('clear-completed');
const filterButtons = [...document.querySelectorAll('.filter')];
const template = document.getElementById('task-template');
const yearElement = document.getElementById('year');

let tasks = [];
let currentFilter = 'all';

// ---------- Вспомогательные функции ----------

/**
 * Создаёт уникальный id для задачи.
 * crypto.randomUUID есть в современных браузерах и на HTTPS/localhost.
 * Если его нет — используем время и случайное число.
 */
function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Читает задачи из localStorage и проверяет их структуру.
 * Если данные повреждены — возвращает пустой массив, а не падает.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((task) => task && typeof task.text === 'string' && task.text.trim())
      .map((task) => ({
        id: String(task.id || createId()),
        text: task.text.trim().slice(0, 200),
        completed: Boolean(task.completed),
        createdAt: Number(task.createdAt) || Date.now(),
      }));
  } catch (error) {
    console.warn('Не удалось прочитать задачи из localStorage:', error);
    return [];
  }
}

/**
 * Сохраняет текущий массив задач в localStorage.
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn('Не удалось сохранить задачи в localStorage:', error);
    showFormError('Не удалось сохранить задачи в браузере. Проверь настройки приватности.');
  }
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function hideFormError() {
  formError.textContent = '';
  formError.hidden = true;
}

function getVisibleTasks() {
  if (currentFilter === 'active') {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === 'completed') {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

// ---------- Рендер ----------

/**
 * Клонирует <template> и заполняет его данными задачи.
 * Текст вставляется через textContent, поэтому HTML из задачи
 * не выполнится, а покажется как обычный текст.
 */
function createTaskElement(task) {
  const fragment = template.content.cloneNode(true);
  const item = fragment.querySelector('.task');
  const checkbox = fragment.querySelector('.task__checkbox');
  const text = fragment.querySelector('.task__text');
  const deleteButton = fragment.querySelector('.task__delete');

  const checkboxId = `task-${task.id}`;

  item.dataset.id = task.id;
  item.classList.toggle('task--done', task.completed);

  checkbox.id = checkboxId;
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    'aria-label',
    task.completed
      ? `Отметить «${task.text}» как активную`
      : `Отметить «${task.text}» как выполненную`
  );

  text.htmlFor = checkboxId;
  text.textContent = task.text;

  deleteButton.setAttribute('aria-label', `Удалить задачу: ${task.text}`);

  return fragment;
}

/**
 * Перерисовывает список, счётчик, фильтры и пустое состояние.
 */
function render() {
  const visibleTasks = getVisibleTasks();

  const fragment = document.createDocumentFragment();
  visibleTasks.forEach((task) => {
    fragment.appendChild(createTaskElement(task));
  });
  list.replaceChildren(fragment);

  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.length - activeCount;

  counter.textContent = `Осталось: ${activeCount}`;

  emptyState.hidden = visibleTasks.length > 0;

  if (visibleTasks.length === 0) {
    if (tasks.length === 0) {
      emptyState.textContent = 'Пока нет задач. Добавь первую — и начнём.';
    } else if (currentFilter === 'active') {
      emptyState.textContent = 'Все задачи выполнены. Отличная работа!';
    } else if (currentFilter === 'completed') {
      emptyState.textContent = 'Пока нет выполненных задач.';
    } else {
      emptyState.textContent = 'Задач нет.';
    }
  }

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  clearButton.hidden = completedCount === 0;
  clearButton.textContent = `Удалить выполненные (${completedCount})`;
}

// ---------- События ----------

// Добавление задачи
form.addEventListener('submit', (event) => {
  event.preventDefault();
  hideFormError();

  const text = input.value.trim();

  if (!text) {
    showFormError('Напиши задачу перед добавлением.');
    input.focus();
    return;
  }

  if (text.length > 200) {
    showFormError('Задача слишком длинная. Максимум 200 символов.');
    input.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    text,
    completed: false,
    createdAt: Date.now(),
  });

  input.value = '';

  // Если открыт фильтр «Выполненные», новая задача была бы не видна.
  if (currentFilter === 'completed') {
    currentFilter = 'all';
  }

  saveTasks();
  render();
  input.focus();
});

// Убираем ошибку, как только пользователь начал печатать
input.addEventListener('input', hideFormError);

// Отметка задачи выполненной / активной
list.addEventListener('change', (event) => {
  const checkbox = event.target.closest('.task__checkbox');
  if (!checkbox) return;

  const item = checkbox.closest('.task');
  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  task.completed = checkbox.checked;
  saveTasks();
  render();
});

// Удаление задачи
list.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.task__delete');
  if (!deleteButton) return;

  const item = deleteButton.closest('.task');
  const taskId = item.dataset.id;

  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  render();
});

// Переключение фильтров
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

// Удаление всех выполненных задач
clearButton.addEventListener('click', () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

// Синхронизация между вкладками: если задачу изменили в другой вкладке
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;

  tasks = loadTasks();
  render();
});

// ---------- Старт ----------

tasks = loadTasks();
yearElement.textContent = new Date().getFullYear();
render();
