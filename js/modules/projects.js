/* ==========================================================================
   AeroGlass ERP Projects & Kanban Task Module
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';
import { renderDesignStudio } from '../../src/modules/design_studio.ts';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let selectedProjectId = null;
let currentFilters = { assignee: '', priority: '', search: '', projectSearch: '' };
let activeProjectTab = 'tasks';

/**
 * Main Projects Renderer
 * Supports sub-routing if a direct task is requested (#projects/task/101)
 */
export async function renderProjects(container, routeParts = []) {
  const projects = await db.getAll('projects');

  // Auto-select first project if none is active
  if (!selectedProjectId && projects.length > 0) {
    selectedProjectId = projects[0].id;
  }

  // Double check direct task route request
  let directOpenTaskId = null;
  if (routeParts[1] === 'task' && routeParts[2]) {
    directOpenTaskId = routeParts[2];
  }

  // Render Skeleton layout
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 280px 1fr; gap: 24px; height: calc(100vh - 150px);">
      <!-- Left side: Project Selection List -->
      <div class="glass-card" style="display:flex; flex-direction:column; padding: 20px; overflow-y:hidden; gap: 16px;">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <h3 style="font-size:15px; font-family:var(--font-heading); font-weight:700;">Projects List</h3>
          <button id="add-project-btn" class="btn btn-primary btn-block" style="padding:10px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:8px;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
            <span>Add New Project</span>
          </button>
        </div>
        
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="project-search-input" placeholder="Search projects..." class="form-control" style="padding-top:6px; padding-bottom:6px; font-size:12px;" value="${currentFilters.projectSearch}">
        </div>

        <div id="project-roster-list" style="display:flex; flex-direction:column; gap:10px; flex-grow:1; overflow-y:auto; padding-right:4px;">
          <!-- Projects list loaded dynamically -->
        </div>
      </div>

      <!-- Right side: Workspaces with Tab Switchers -->
      <div style="display:flex; flex-direction:column; gap: 16px; height:100%; overflow:hidden;">
        <!-- Tabs Header -->
        <div class="glass-card" style="padding: 6px 12px; display:flex; gap:10px; align-items:center; flex-shrink:0;">
          <button id="project-tab-tasks" class="btn ${activeProjectTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeProjectTab === 'tasks' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="kanban-square" style="width:14px; height:14px;"></i>
            <span>Tasks Kanban</span>
          </button>
          <button id="project-tab-eva" class="btn ${activeProjectTab === 'eva' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 16px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeProjectTab === 'eva' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="palette" style="width:14px; height:14px;"></i>
            <span>EvA Design & Quote Studio</span>
          </button>
        </div>

        <!-- Tab 1: Kanban Board workspace -->
        <div id="project-tasks-view" style="display: ${activeProjectTab === 'tasks' ? 'flex' : 'none'}; flex-direction:column; gap: 20px; height:100%; overflow:hidden;">
          <!-- Filters header panel -->
          <div class="glass-card" style="padding: 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div class="filter-group">
              <div class="search-input-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="task-search-input" placeholder="Search tasks..." class="form-control" style="padding-top:8px; padding-bottom:8px;" value="${currentFilters.search}">
              </div>
              
              <select id="task-assignee-filter" class="form-control-noicon" style="padding: 8px 12px; width:150px;">
                <option value="">All Assignees</option>
                <!-- Populated dynamically -->
              </select>

              <select id="task-priority-filter" class="form-control-noicon" style="padding: 8px 12px; width:130px;">
                <option value="">All Priorities</option>
                <option value="low" ${currentFilters.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                <option value="medium" ${currentFilters.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                <option value="high" ${currentFilters.priority === 'high' ? 'selected' : ''}>High Priority</option>
              </select>
            </div>

            <div>
              <button id="add-task-btn" class="btn btn-primary" style="padding: 8px 16px;">
                <i data-lucide="plus"></i>
                <span>Create Task</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Kanban workspace columns -->
          <div id="kanban-workspace" style="flex-grow:1; overflow-y:auto; padding-bottom: 20px;">
            <!-- Loaded dynamically -->
          </div>
        </div>

        <!-- Tab 2: EvA Design Studio workspace -->
        <div id="project-eva-view" style="display: ${activeProjectTab === 'eva' ? 'block' : 'none'}; height:100%; overflow:hidden;">
          <!-- Loaded dynamically -->
        </div>

      </div>
    </div>
  `;

  // Bind Dynamic Components safely using try-catch blocks
  try {
    await refreshProjectRoster();
  } catch (rosterErr) {
    console.error('Failed to refresh project roster:', rosterErr);
  }

  if (activeProjectTab === 'tasks') {
    try {
      await refreshKanbanBoard();
    } catch (kanbanErr) {
      console.error('Failed to refresh Kanban board:', kanbanErr);
    }

    try {
      await populateAssigneeFilters();
    } catch (filtersErr) {
      console.error('Failed to populate assignee filters:', filtersErr);
    }
  } else {
    try {
      if (selectedProjectId) {
        await renderDesignStudio(document.getElementById('project-eva-view'), selectedProjectId);
      }
    } catch (evaErr) {
      console.error('Failed to render EvA Design Studio:', evaErr);
    }
  }

  bindEventListeners(container);

  // If a direct task ID was requested in routing, open it immediately
  if (directOpenTaskId) {
    const task = await db.get('tasks', directOpenTaskId);
    if (task) {
      openTaskDetailModal(task);
    }
  }
}

/**
 * Loads and renders the project navigation panel
 */
async function refreshProjectRoster() {
  const listEl = document.getElementById('project-roster-list');
  if (!listEl) return;

  const projects = await db.getAll('projects');
  const tasks = await db.getAll('tasks');

  let filteredProjects = projects;
  if (currentFilters.projectSearch) {
    const q = currentFilters.projectSearch.toLowerCase();
    filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }

  listEl.innerHTML = filteredProjects.map(p => {
    const projTasks = tasks.filter(t => t.projectId === p.id);
    const doneTasks = projTasks.filter(t => t.status === 'done').length;
    const progress = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0;
    const isActive = p.id === selectedProjectId;

    return `
      <div class="project-selector-item pointer ${isActive ? 'active-project' : ''}" data-id="${p.id}" 
           style="padding:12px; border-radius:var(--radius-md); border:1px solid ${isActive ? 'var(--primary-color)' : 'var(--glass-border)'}; 
           background:${isActive ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)'}; transition:all var(--transition-fast);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80%;">${p.name}</strong>
          ${p.status === 'Archived' ? '<span class="badge secondary" style="font-size:8px;">Archived</span>' : ''}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-bottom:6px;">
          <span>${projTasks.length} tasks</span>
          <span>${progress}% done</span>
        </div>
        <div style="width:100%; height:4px; background:var(--glass-border); border-radius:2px; overflow:hidden;">
          <div style="width:${progress}%; height:100%; background:${isActive ? 'var(--primary-color)' : 'var(--text-muted)'};"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Loads employee profiles to the filter selector dropdowns
 */
async function populateAssigneeFilters() {
  const filterEl = document.getElementById('task-assignee-filter');
  if (!filterEl) return;

  const employees = await db.getAll('employees');

  // Clear other than default
  filterEl.innerHTML = '<option value="">All Assignees</option>';
  employees.forEach(emp => {
    const nameStr = emp.name;
    const usernameKey = (emp.contact && typeof emp.contact === 'string' && emp.contact.includes('@')) ? emp.contact.split('@')[0] : emp.id.toLowerCase();
    const selected = currentFilters.assignee === usernameKey ? 'selected' : '';
    filterEl.innerHTML += `<option value="${usernameKey}" ${selected}>${nameStr}</option>`;
  });
}

/**
 * Renders the Kanban grid with columns: To Do, In Progress, Review, Done
 */
async function refreshKanbanBoard() {
  const boardEl = document.getElementById('kanban-workspace');
  if (!boardEl) return;

  if (!selectedProjectId) {
    boardEl.innerHTML = `<div class="glass-card text-center muted-text" style="padding:100px;">Please create or select a project.</div>`;
    return;
  }

  const allTasks = await db.getAll('tasks');

  // Filter by selected project and interactive filter fields
  let tasks = allTasks.filter(t => t.projectId === selectedProjectId);

  if (currentFilters.search) {
    const q = currentFilters.search.toLowerCase();
    tasks = tasks.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  if (currentFilters.assignee) {
    tasks = tasks.filter(t => t.assignees.includes(currentFilters.assignee));
  }

  if (currentFilters.priority) {
    tasks = tasks.filter(t => t.priority === currentFilters.priority);
  }

  // Separate tasks into columns
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const progressTasks = tasks.filter(t => t.status === 'in-progress');
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const doneTasks = tasks.filter(t => t.status === 'done');

  boardEl.innerHTML = `
    <div class="kanban-board">
      <!-- 1. TO DO -->
      <div class="kanban-column" data-status="todo">
        <div class="column-header todo" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>To Do</h3>
            <span class="task-count">${todoTasks.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="todo" title="Add task to To Do" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-todo">
          ${todoTasks.map(t => generateTaskCardHTML(t)).join('')}
        </div>
      </div>

      <!-- 2. IN PROGRESS -->
      <div class="kanban-column" data-status="in-progress">
        <div class="column-header in-progress" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>In Progress</h3>
            <span class="task-count">${progressTasks.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="in-progress" title="Add task to In Progress" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-inprogress">
          ${progressTasks.map(t => generateTaskCardHTML(t)).join('')}
        </div>
      </div>

      <!-- 3. IN REVIEW -->
      <div class="kanban-column" data-status="review">
        <div class="column-header review" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>Review</h3>
            <span class="task-count">${reviewTasks.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="review" title="Add task to Review" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-review">
          ${reviewTasks.map(t => generateTaskCardHTML(t)).join('')}
        </div>
      </div>

      <!-- 4. DONE -->
      <div class="kanban-column" data-status="done">
        <div class="column-header done" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h3>Completed</h3>
            <span class="task-count">${doneTasks.length}</span>
          </div>
          <button class="add-column-task-btn" data-status="done" title="Add task to Completed" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; transition:all 0.2s;">
            <i data-lucide="plus-circle" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="column-cards" id="column-done">
          ${doneTasks.map(t => generateTaskCardHTML(t)).join('')}
        </div>
      </div>
    </div>
  `;

  bindDragAndDrop();
  lucide.createIcons();
}

function generateTaskCardHTML(t) {
  const completedSubtasks = t.subtasks.filter(s => s.completed).length;
  const totalSubtasks = t.subtasks.length;

  return `
    <div class="task-card" draggable="true" data-id="${t.id}">
      <span class="task-priority-badge ${t.priority}">${t.priority}</span>
      <h4>${t.name}</h4>
      <p>${t.description}</p>
      
      ${totalSubtasks > 0 ? `
        <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary); margin-bottom:12px;">
          <i data-lucide="check-square" style="width:13px; height:13px;"></i>
          <span>${completedSubtasks} / ${totalSubtasks} checklist</span>
        </div>
      ` : ''}

      <div class="task-card-meta">
        <span style="display:flex; align-items:center; gap:4px;">
          <i data-lucide="calendar" style="width:12px; height:12px;"></i>
          <span>${t.deadline}</span>
        </span>
        
        <div class="task-assignees">
          ${t.assignees.map(as => `
            <div class="assignee-avatar" title="${as}">${as.substring(0, 2).toUpperCase()}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Implements HTML5 Drag and Drop triggers on Kanban columns
 */
function bindDragAndDrop() {
  const cards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.kanban-column');

  let draggedCard = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
    });

    // Inspect on click
    card.addEventListener('click', async (e) => {
      if (e.target.closest('[draggable]').classList.contains('dragging')) return;
      const taskId = card.getAttribute('data-id');
      const task = await db.get('tasks', taskId);
      openTaskDetailModal(task);
    });
  });

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');

      if (!draggedCard) return;

      const taskId = draggedCard.getAttribute('data-id');
      const nextStatus = col.getAttribute('data-status');

      const task = await db.get('tasks', taskId);
      if (task && task.status !== nextStatus) {
        const oldStatus = task.status;
        task.status = nextStatus;

        task.activityLog.push({
          time: new Date().toISOString(),
          user: auth.getCurrentUser()?.username || 'System',
          action: `Shifted status from ${oldStatus} to ${nextStatus}`
        });

        await db.put('tasks', task);
        await sync.queueOperation('tasks', 'update', task);

        await refreshProjectRoster();
        await refreshKanbanBoard();
        app.showToast('Task Shifted', `"${task.name}" is now in ${nextStatus}.`, 'success');
      }
    });
  });
}

/**
 * Helper to open task creation modal with a specific default status
 */
async function openCreateTaskModal(container, defaultStatus = 'todo') {
  if (!selectedProjectId) {
    app.showToast('Action Blocked', 'Please create a project first before adding tasks.', 'warning');
    return;
  }

  const employees = await db.getAll('employees');
  const assigneesHTML = employees.map(emp => {
    const uKey = (emp.contact && typeof emp.contact === 'string' && emp.contact.includes('@')) ? emp.contact.split('@')[0] : emp.id.toLowerCase();
    return `<option value="${uKey}">${emp.name}</option>`;
  }).join('');

  const formHTML = `
    <form id="create-task-form" class="login-form" style="padding:0;">
      <div class="input-group">
        <label>Task Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="new-task-name" class="form-control-noicon" required placeholder="Enter task title...">
      </div>
      <div class="input-group">
        <label>Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
        <textarea id="new-task-desc" class="form-control-noicon" rows="2" placeholder="Task instruction detail..."></textarea>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div class="input-group">
          <label>Deadline <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <input type="date" id="new-task-deadline" class="form-control-noicon" value="2026-05-30">
        </div>
        <div class="input-group">
          <label>Priority <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <select id="new-task-priority" class="form-control-noicon">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div class="input-group">
        <label>Assign to Team Member</label>
        <div style="display:flex; gap:8px; align-items:center;">
          <select id="new-task-assignee" class="form-control-noicon" style="flex-grow:1;" required>
            ${assigneesHTML}
          </select>
          <button type="button" id="task-manual-toggle-btn" class="btn btn-secondary" style="padding:6px 10px; font-size:11px; white-space:nowrap;">
            <i data-lucide="pencil" style="width:12px; height:12px;"></i> Manual
          </button>
        </div>
        <div id="task-manual-assign-wrapper" style="display:none; margin-top:8px;">
          <input type="text" id="new-task-manual-assignee" class="form-control-noicon" placeholder="Enter custom assignee name...">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Create Kanban Task</button>
    </form>
  `;

  app.openModal('Create Project Task', formHTML);

  // Manual assignee toggle
  document.getElementById('task-manual-toggle-btn')?.addEventListener('click', () => {
    const wrapper = document.getElementById('task-manual-assign-wrapper');
    const select = document.getElementById('new-task-assignee');
    const manualInput = document.getElementById('new-task-manual-assignee');
    if (wrapper.style.display === 'none') {
      wrapper.style.display = 'block';
      select.style.display = 'none';
      select.required = false;
    } else {
      wrapper.style.display = 'none';
      select.style.display = 'block';
      select.required = true;
      manualInput.value = '';
    }
  });

  document.getElementById('create-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-task-name').value;
    const description = document.getElementById('new-task-desc').value || '';
    const deadline = document.getElementById('new-task-deadline').value || '';
    const priority = document.getElementById('new-task-priority').value || 'medium';
    const isManual = document.getElementById('task-manual-assign-wrapper')?.style?.display === 'block';
    const assigneeVal = isManual
      ? document.getElementById('new-task-manual-assignee')?.value?.trim() || 'Unassigned'
      : document.getElementById('new-task-assignee').value;
    const id = `task-${Date.now()}`;

    const newTask = {
      id,
      projectId: selectedProjectId,
      name,
      description,
      assignees: [assigneeVal],
      deadline,
      priority,
      status: defaultStatus,
      subtasks: [],
      activityLog: [
        { time: new Date().toISOString(), user: auth.getCurrentUser()?.username || 'Admin', action: 'Created task' }
      ]
    };

    await db.put('tasks', newTask);
    await sync.queueOperation('tasks', 'insert', newTask);

    app.closeModal();
    app.showToast('Task Created', `Added task "${name}" to ${defaultStatus} column.`, 'success');

    await refreshKanbanBoard();
    await refreshProjectRoster();
  });
}

/**
 * Binding of click handlers and filters on projects dashboard
 */
function bindEventListeners(container) {
  // 1. Selector Project (using Event Delegation)
  const rosterList = document.getElementById('project-roster-list');
  if (rosterList) {
    rosterList.addEventListener('click', (e) => {
      const item = e.target.closest('.project-selector-item');
      if (item) {
        selectedProjectId = item.getAttribute('data-id');
        refreshProjectRoster();
        if (activeProjectTab === 'eva') {
          if (selectedProjectId) {
            renderDesignStudio(document.getElementById('project-eva-view'), selectedProjectId);
          }
        } else {
          refreshKanbanBoard();
        }
      }
    });
  }

  // Tab Switchers
  const tabTasksBtn = document.getElementById('project-tab-tasks');
  const tabEvaBtn = document.getElementById('project-tab-eva');
  const tasksView = document.getElementById('project-tasks-view');
  const evaView = document.getElementById('project-eva-view');

  if (tabTasksBtn && tabEvaBtn) {
    tabTasksBtn.addEventListener('click', () => {
      activeProjectTab = 'tasks';
      tabTasksBtn.className = 'btn btn-primary';
      tabTasksBtn.style.background = 'var(--primary-color)';
      tabEvaBtn.className = 'btn btn-secondary';
      tabEvaBtn.style.background = 'transparent';
      
      tasksView.style.display = 'flex';
      evaView.style.display = 'none';
      
      refreshKanbanBoard();
      lucide.createIcons();
    });

    tabEvaBtn.addEventListener('click', () => {
      activeProjectTab = 'eva';
      tabEvaBtn.className = 'btn btn-primary';
      tabEvaBtn.style.background = 'var(--primary-color)';
      tabTasksBtn.className = 'btn btn-secondary';
      tabTasksBtn.style.background = 'transparent';
      
      tasksView.style.display = 'none';
      evaView.style.display = 'block';
      
      if (selectedProjectId) {
        renderDesignStudio(evaView, selectedProjectId);
      }
      lucide.createIcons();
    });
  }

  // Project Search Filter
  const projectSearchInput = document.getElementById('project-search-input');
  if (projectSearchInput) {
    projectSearchInput.addEventListener('input', (e) => {
      currentFilters.projectSearch = e.target.value;
      refreshProjectRoster();
    });
  }

  // 2. Interactive Filters
  const searchInput = document.getElementById('task-search-input');
  searchInput.addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    refreshKanbanBoard();
  });

  const assigneeFilter = document.getElementById('task-assignee-filter');
  assigneeFilter.addEventListener('change', (e) => {
    currentFilters.assignee = e.target.value;
    refreshKanbanBoard();
  });

  const priorityFilter = document.getElementById('task-priority-filter');
  priorityFilter.addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    refreshKanbanBoard();
  });

  // 3. Create Project Modal Action
  document.getElementById('add-project-btn').addEventListener('click', () => {
    const formHTML = `
      <form id="create-project-form" class="login-form" style="padding:0;">
        <div class="input-group">
          <label>Project Name <span style="color:var(--danger); font-size:11px;">*required</span></label>
          <input type="text" id="new-proj-name" class="form-control-noicon" required placeholder="e.g. Glass Partition Suite C...">
        </div>
        <div class="input-group">
          <label>Description <span class="muted-text" style="font-size:10px;">(optional)</span></label>
          <textarea id="new-proj-desc" class="form-control-noicon" rows="3" placeholder="Describe the project objective..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Initialize Project</button>
      </form>
    `;

    app.openModal('Initialize New Project', formHTML);

    document.getElementById('create-project-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-proj-name').value;
      const description = document.getElementById('new-proj-desc').value || '';
      const id = `proj-${Date.now()}`;

      const newProj = { id, name, description, status: 'Active', createdAt: new Date().toISOString() };

      await db.put('projects', newProj);
      await sync.queueOperation('projects', 'insert', newProj);

      selectedProjectId = id;
      app.closeModal();
      app.showToast('Project Created', `Initialized milestone project: "${name}"`, 'success');

      renderProjects(container);
    });
  });

  // 4. Create Task Modal Action
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    openCreateTaskModal(container, 'todo');
  });

  // Delegate add task buttons inside Kanban columns
  document.getElementById('kanban-workspace')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-column-task-btn');
    if (btn) {
      const status = btn.getAttribute('data-status') || 'todo';
      openCreateTaskModal(container, status);
    }
  });
}

/**
 * Task Details Modal Populator and Checklist Handler
 */
function openTaskDetailModal(task) {
  const modalBodyHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <!-- Title Block -->
      <div>
        <span class="task-priority-badge ${task.priority}">${task.priority}</span>
        <h2 style="font-size:20px; font-family:var(--font-heading); font-weight:700; margin:6px 0;">${task.name}</h2>
        <p class="muted-text" style="font-size:13px;">${task.description}</p>
      </div>

      <!-- Parameters Row -->
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; border-top:1px solid var(--glass-border); padding-top:16px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Deadline</span>
          <strong style="font-size:13px;">${task.deadline}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Status</span>
          <span class="badge ${task.status === 'done' ? 'success' : task.status === 'review' ? 'warning' : 'primary'}">${task.status}</span>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Assignees</span>
          <strong style="font-size:13px;">${task.assignees.join(', ')}</strong>
        </div>
      </div>

      <!-- Checklist Section -->
      <div style="border-top:1px solid var(--glass-border); padding-top:16px;">
        <h4 style="font-size:14px; font-weight:600; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <span>Subtasks Checklist</span>
          <span style="font-size:11px;" id="modal-subtasks-count"></span>
        </h4>
        <div id="modal-subtask-list" class="subtasks-list">
          <!-- Populated by loop -->
        </div>

        <div style="display:flex; gap:10px; margin-top:12px;">
          <input type="text" id="add-subtask-input" class="form-control-noicon" style="padding:6px 12px; font-size:13px;" placeholder="Add new check item...">
          <button id="add-subtask-btn" class="btn btn-secondary" style="padding:6px 12px;">Add</button>
        </div>
      </div>

      <!-- Activities and Comments Logs -->
      <div style="border-top:1px solid var(--glass-border); padding-top:16px;">
        <h4 style="font-size:14px; font-weight:600; margin-bottom:10px;">Activity Log</h4>
        <div id="modal-task-activities" style="max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.1); padding:10px; border-radius:6px; border:1px solid var(--glass-border);">
          <!-- Activities list -->
        </div>

        <div style="display:flex; gap:10px; margin-top:12px;">
          <input type="text" id="task-comment-input" class="form-control-noicon" style="padding:6px 12px; font-size:13px;" placeholder="Add progress comment...">
          <button id="task-comment-btn" class="btn btn-primary" style="padding:6px 12px;">Send</button>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--glass-border); padding-top:16px;">
        <button id="task-delete-btn" class="btn btn-danger" style="padding:8px 16px;">Delete Task</button>
      </div>
    </div>
  `;

  app.openModal('Task Verification Detail', modalBodyHTML, '580px');

  // Render subtasks list loop
  const renderSubtasks = () => {
    const listEl = document.getElementById('modal-subtask-list');
    const counterEl = document.getElementById('modal-subtasks-count');

    if (task.subtasks.length === 0) {
      listEl.innerHTML = '<p class="muted-text" style="font-size:12px;">No subtasks checklist configured for this task.</p>';
      counterEl.textContent = '0%';
      return;
    }

    const doneCount = task.subtasks.filter(s => s.completed).length;
    const totalCount = task.subtasks.length;
    const progressVal = Math.round((doneCount / totalCount) * 100);
    counterEl.textContent = `${progressVal}% completed (${doneCount}/${totalCount})`;

    listEl.innerHTML = task.subtasks.map((sub, idx) => `
      <label class="subtask-item ${sub.completed ? 'completed' : ''}" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
        <input type="checkbox" class="subtask-chk" data-idx="${idx}" ${sub.completed ? 'checked' : ''}>
        <span>${sub.text}</span>
      </label>
    `).join('');

    // Bind checklist triggers
    listEl.querySelectorAll('.subtask-chk').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const idx = parseInt(chk.getAttribute('data-idx'));
        task.subtasks[idx].completed = e.target.checked;

        task.activityLog.push({
          time: new Date().toISOString(),
          user: auth.getCurrentUser()?.username || 'User',
          action: `${e.target.checked ? 'Checked' : 'Unchecked'} item: "${task.subtasks[idx].text}"`
        });

        await db.put('tasks', task);
        await sync.queueOperation('tasks', 'update', task);

        renderSubtasks();
        renderActivities();
        await refreshKanbanBoard();
        await refreshProjectRoster();
      });
    });
  };

  // Render activity log
  const renderActivities = () => {
    const actEl = document.getElementById('modal-task-activities');
    actEl.innerHTML = task.activityLog.map(act => `
      <div style="font-size:12px; display:flex; justify-content:space-between;">
        <span><strong>${act.user}</strong>: ${act.action}</span>
        <span class="muted-text" style="font-size:10px;">${new Date(act.time).toLocaleTimeString()}</span>
      </div>
    `).reverse().join('');
  };

  renderSubtasks();
  renderActivities();

  // Bind Add checklist item
  const addSubtaskInput = document.getElementById('add-subtask-input');
  const addSubtaskBtn = document.getElementById('add-subtask-btn');

  const triggerAddSubtask = async () => {
    const txt = addSubtaskInput.value.trim();
    if (!txt) return;

    task.subtasks.push({ text: txt, completed: false });

    task.activityLog.push({
      time: new Date().toISOString(),
      user: auth.getCurrentUser()?.username || 'Admin',
      action: `Added checklist item: "${txt}"`
    });

    await db.put('tasks', task);
    await sync.queueOperation('tasks', 'update', task);

    addSubtaskInput.value = '';
    renderSubtasks();
    renderActivities();
    await refreshKanbanBoard();
    await refreshProjectRoster();
  };

  addSubtaskBtn.addEventListener('click', triggerAddSubtask);
  addSubtaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerAddSubtask();
  });

  // Bind Add Comment Action
  const commentInput = document.getElementById('task-comment-input');
  const commentBtn = document.getElementById('task-comment-btn');

  const triggerAddComment = async () => {
    const txt = commentInput.value.trim();
    if (!txt) return;

    task.activityLog.push({
      time: new Date().toISOString(),
      user: auth.getCurrentUser()?.username || 'User',
      action: `Added comment: "${txt}"`
    });

    await db.put('tasks', task);
    await sync.queueOperation('tasks', 'update', task);

    commentInput.value = '';
    renderActivities();
  };

  commentBtn.addEventListener('click', triggerAddComment);
  commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerAddComment();
  });

  // Bind Delete Task Button
  document.getElementById('task-delete-btn').addEventListener('click', async () => {
    const confirmDelete = confirm(`Are you absolutely sure you want to delete task: "${task.name}"?`);
    if (confirmDelete) {
      await db.delete('tasks', task.id);
      await sync.queueOperation('tasks', 'delete', task.id);

      app.closeModal();
      app.showToast('Task Deleted', `Successfully deleted task from Kanban board.`, 'success');

      await refreshKanbanBoard();
      await refreshProjectRoster();
    }
  });
}
