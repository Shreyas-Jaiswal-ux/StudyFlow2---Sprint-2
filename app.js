/* ========================================
   StudyFlow - app.js
   Application logic and behaviour
   Sprint 2: Added filter/sort manager (BL-09, BL-11, BL-12, BL-15)
   [SPRINT 2] markers indicate new additions
   ======================================== */
 
// ---- Utilities ----
 
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
 
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}
 
function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
 
function isOverdue(deadline) {
    return deadline < getTodayString();
}
 
function getDaysUntil(deadline) {
    const today = new Date(getTodayString() + 'T00:00:00');
    const due = new Date(deadline + 'T00:00:00');
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
}
 
function getDeadlineLabel(deadline) {
    const days = getDaysUntil(deadline);
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `${days} days left`;
    return formatDate(deadline);
}
 
// ---- [SPRINT 2] Week Range Utility (BL-09) ----
 
function getWeekRange() {
    const today = new Date(getTodayString() + 'T00:00:00');
    // Monday-based week: (dayOfWeek + 6) % 7 gives 0 for Mon, 6 for Sun
    const dayOfWeek = today.getDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
 
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
 
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
 
    function toYMD(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
 
    return { start: toYMD(monday), end: toYMD(sunday) };
}
 
// ---- Task Manager ----
 
let tasks = [];
let editingTaskId = null;
 
function loadTasks() {
    const stored = localStorage.getItem('studyflow-tasks');
    if (stored) {
        tasks = JSON.parse(stored);
    }
}
 
function saveTasks() {
    localStorage.setItem('studyflow-tasks', JSON.stringify(tasks));
}
 
function addTask(title, deadline, priority, module) {
    const task = {
        id: generateId(),
        title: title,
        deadline: deadline,
        priority: priority,
        module: module,
        completed: false
    };
    tasks.push(task);
    saveTasks();
    return task;
}
 
function updateTask(id, title, deadline, priority, module) {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index].title = title;
        tasks[index].deadline = deadline;
        tasks[index].priority = priority;
        tasks[index].module = module;
        saveTasks();
    }
}
 
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
}
 
function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
    }
}
 
// ---- [SPRINT 2] Filter & Sort Manager (BL-09, BL-11, BL-12) ----
 
let filterState = {
    view: 'all',        // 'all' | 'today' | 'week'
    priority: 'all',    // 'all' | 'High' | 'Medium' | 'Low'
    module: '',         // text search string
    sort: 'deadline'    // 'deadline' | 'priority'
};
 
function isFilterActive() {
    return filterState.view !== 'all' ||
           filterState.priority !== 'all' ||
           filterState.module.trim() !== '';
}
 
function getFilteredTasks() {
    let result = [...tasks];
    const today = getTodayString();
 
    // 1. View filter
    if (filterState.view === 'today') {
        result = result.filter(t => t.deadline === today);
    } else if (filterState.view === 'week') {
        const { start, end } = getWeekRange();
        result = result.filter(t => t.deadline >= start && t.deadline <= end);
    }
 
    // 2. Priority filter
    if (filterState.priority !== 'all') {
        result = result.filter(t => t.priority === filterState.priority);
    }
 
    // 3. Module search (case-insensitive)
    const moduleQuery = filterState.module.trim().toLowerCase();
    if (moduleQuery !== '') {
        result = result.filter(t => t.module.toLowerCase().includes(moduleQuery));
    }
 
    return result;
}
 
function sortTasks(taskArray) {
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
 
    return [...taskArray].sort((a, b) => {
        // Completed tasks always go to the bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
 
        if (!a.completed && !b.completed) {
            // Overdue tasks float to the top of the active section
            const aOverdue = isOverdue(a.deadline);
            const bOverdue = isOverdue(b.deadline);
            if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        }
 
        // Within group: apply selected sort mode
        if (filterState.sort === 'priority') {
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            // Secondary sort by deadline within same priority
            return a.deadline.localeCompare(b.deadline);
        }
 
        // Default: sort by deadline ascending
        return a.deadline.localeCompare(b.deadline);
    });
}
 
function getEmptyStateMessage() {
    if (filterState.view === 'today') return { title: 'No tasks due today', subtitle: 'Tasks with today\'s deadline will appear here.' };
    if (filterState.view === 'week') return { title: 'No tasks this week', subtitle: 'Tasks due this week will appear here.' };
    if (filterState.priority !== 'all') return { title: `No ${filterState.priority.toLowerCase()} priority tasks`, subtitle: 'Try a different priority filter.' };
    if (filterState.module.trim() !== '') return { title: 'No matching tasks', subtitle: 'Try a different module search.' };
    return { title: 'No tasks yet', subtitle: 'Add your first task to get started!' };
}
 
function updateFilterUI() {
    // View buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.toggle('filter-btn--active', btn.dataset.filter === filterState.view);
    });

   // Priority buttons
    document.querySelectorAll('[data-priority]').forEach(btn => {
        btn.classList.toggle('filter-btn--active', btn.dataset.priority === filterState.priority);
    });
 
    // Sort buttons
    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.classList.toggle('sort-btn--active', btn.dataset.sort === filterState.sort);
    });
 
    // Clear filters button visibility
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.style.display = isFilterActive() ? 'inline-flex' : 'none';
    }
}
 
// ---- Validation ----
 
function validateForm(title, deadline) {
    let isValid = true;
    const titleError = document.getElementById('title-error');
    const deadlineError = document.getElementById('deadline-error');
    const titleInput = document.getElementById('task-title');
    const deadlineInput = document.getElementById('task-deadline');
 
    titleError.textContent = '';
    deadlineError.textContent = '';
    titleInput.classList.remove('form-input--error');
    deadlineInput.classList.remove('form-input--error');
 
    if (!title || title.trim() === '') {
        titleError.textContent = 'Please enter a task title.';
        titleInput.classList.add('form-input--error');
        isValid = false;
    }
 
    if (!deadline) {
        deadlineError.textContent = 'Please select a deadline.';
        deadlineInput.classList.add('form-input--error');
        isValid = false;
    } else if (!editingTaskId && deadline < getTodayString()) {
        deadlineError.textContent = 'Deadline cannot be in the past.';
        deadlineInput.classList.add('form-input--error');
        isValid = false;
    }
 
    return isValid;
}
 
function clearErrors() {
    document.getElementById('title-error').textContent = '';
    document.getElementById('deadline-error').textContent = '';
    document.getElementById('task-title').classList.remove('form-input--error');
    document.getElementById('task-deadline').classList.remove('form-input--error');
}
 
// ---- Renderer ----
 
function renderTasks() {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
 
    // [SPRINT 2] Apply active filters and sort before rendering
    const filtered = getFilteredTasks();
    const sorted = sortTasks(filtered);
 
    if (sorted.length === 0) {
        // [SPRINT 2] Context-aware empty state message
        const { title, subtitle } = getEmptyStateMessage();
        taskList.innerHTML = `
            <div class="empty-state" id="empty-state">
                <div class="empty-state__icon">&#128203;</div>
                <p class="empty-state__title">${title}</p>
                <p class="empty-state__subtitle">${subtitle}</p>
            </div>
        `;
        updateStats();
        updateFilterUI();
        return;
    }
 
    sorted.forEach((task, index) => {
        const card = createTaskCard(task);
        card.style.animationDelay = `${index * 0.05}s`;
        taskList.appendChild(card);
    });
 
    updateStats();
    updateFilterUI();
}
 
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
 
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-done').textContent = completed;
 
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.width = percentage + '%';
 
    if (percentage === 100 && total > 0) {
        progressFill.classList.add('progress-bar__fill--complete');
    } else {
        progressFill.classList.remove('progress-bar__fill--complete');
    }

const progressText = document.getElementById('progress-text');
    if (total === 0) {
        progressText.textContent = 'No tasks yet';
    } else if (percentage === 100) {
        progressText.textContent = 'All tasks completed!';
    } else {
        progressText.textContent = `${percentage}% complete (${completed}/${total})`;
    }
 
    // [SPRINT 2] Task count badge reflects filtered count, not total
    const taskCount = document.getElementById('task-count');
    const filteredActive = getFilteredTasks().filter(t => !t.completed).length;
    if (total > 0) {
        taskCount.textContent = isFilterActive()
            ? `${filteredActive} shown`
            : `${active} active`;
    } else {
        taskCount.textContent = '';
    }
}
 
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card task-card--${task.priority.toLowerCase()}${task.completed ? ' task-card--completed' : ''}`;
    card.dataset.id = task.id;
 
    const priorityClass = `task-card__badge--priority-${task.priority.toLowerCase()}`;
    const overdue = !task.completed && isOverdue(task.deadline);
    const deadlineLabel = task.completed ? formatDate(task.deadline) : getDeadlineLabel(task.deadline);
    const deadlineClass = overdue ? 'task-card__badge--overdue' : 'task-card__badge--deadline';
 
    card.innerHTML = `
        <div class="task-card__header">
            <input 
                type="checkbox" 
                class="task-card__checkbox" 
                ${task.completed ? 'checked' : ''}
                aria-label="Mark ${escapeHtml(task.title)} as ${task.completed ? 'incomplete' : 'complete'}"
            >
            <span class="task-card__title">${escapeHtml(task.title)}</span>
        </div>
        <div class="task-card__details">
            <span class="task-card__badge ${deadlineClass}">${deadlineLabel}</span>
            <span class="task-card__badge ${priorityClass}">${task.priority}</span>
            ${task.module ? `<span class="task-card__badge">${escapeHtml(task.module)}</span>` : ''}
        </div>
        <div class="task-card__actions">
            <button class="btn btn--small btn--edit" data-action="edit">Edit</button>
            <button class="btn btn--small btn--delete" data-action="delete">Delete</button>
        </div>
    `;
 
    const checkbox = card.querySelector('.task-card__checkbox');
    checkbox.addEventListener('change', () => {
        toggleComplete(task.id);
        renderTasks();
    });
 
    const editBtn = card.querySelector('[data-action="edit"]');
    editBtn.addEventListener('click', () => {
        startEditing(task);
    });
 
    const deleteBtn = card.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
            deleteTask(task.id);
            renderTasks();
        }
    });
 
    return card;
}
 
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
 
// ---- Form Handling ----
 
function startEditing(task) {
    editingTaskId = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-deadline').value = task.deadline;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-module').value = task.module;
    document.getElementById('form-title').innerHTML = '<span class="form-icon" id="form-icon">&#9998;</span> Edit Task';
    document.getElementById('submit-btn').innerHTML = '<span class="btn__icon">&#10003;</span> Save Changes';
    document.getElementById('cancel-btn').style.display = 'inline-flex';
    document.querySelector('.form-section').classList.add('form-section--editing');
    clearErrors();
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
 
function cancelEditing() {
    editingTaskId = null;
    document.getElementById('task-form').reset();
    document.getElementById('form-title').innerHTML = '<span class="form-icon" id="form-icon">+</span> Add New Task';
    document.getElementById('submit-btn').innerHTML = '<span class="btn__icon">+</span> Add Task';
    document.getElementById('cancel-btn').style.display = 'none';
    document.querySelector('.form-section').classList.remove('form-section--editing');
    clearErrors();
}
 
function handleSubmit(e) {
    e.preventDefault();
 
    const title = document.getElementById('task-title').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;
    const module = document.getElementById('task-module').value.trim();
 
    if (!validateForm(title, deadline)) return;
 
    if (editingTaskId) {
        updateTask(editingTaskId, title, deadline, priority, module);
        cancelEditing();
    } else {
        addTask(title, deadline, priority, module);
        document.getElementById('task-form').reset();
        clearErrors();
    }
 
    renderTasks();
}
 
// ---- Clear Errors on Input ----
 
function setupInputListeners() {
    document.getElementById('task-title').addEventListener('input', () => {
        document.getElementById('title-error').textContent = '';
        document.getElementById('task-title').classList.remove('form-input--error');
    });
 
    document.getElementById('task-deadline').addEventListener('input', () => {
        document.getElementById('deadline-error').textContent = '';
        document.getElementById('task-deadline').classList.remove('form-input--error');
    });
}
 
// ---- [SPRINT 2] Filter & Sort Event Listeners (BL-09, BL-11, BL-12) ----
 
function setupFilterListeners() {
    // View filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            filterState.view = btn.dataset.filter;
            renderTasks();
        });
    });
 
    // Priority filter buttons
    document.querySelectorAll('[data-priority]').forEach(btn => {
        btn.addEventListener('click', () => {
            filterState.priority = btn.dataset.priority;
            renderTasks();
        });
    });
 
    // Module search input
    const moduleSearch = document.getElementById('filter-module');
    if (moduleSearch) {
        moduleSearch.addEventListener('input', () => {
            filterState.module = moduleSearch.value;
            renderTasks();
        });
    }
 
    // Clear Filters button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            filterState.view = 'all';
            filterState.priority = 'all';
            filterState.module = '';
            // Also reset the module search input DOM value
            const moduleInput = document.getElementById('filter-module');
            if (moduleInput) moduleInput.value = '';
            renderTasks();
        });
    }
 
    // Sort buttons
    document.querySelectorAll('[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            filterState.sort = btn.dataset.sort;
            renderTasks();
        });
    });
}
 
// ---- Initialise ----
 
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
 
    document.getElementById('task-form').addEventListener('submit', handleSubmit);
    document.getElementById('cancel-btn').addEventListener('click', cancelEditing);
 
    setupInputListeners();
    setupFilterListeners(); // [SPRINT 2]
});
