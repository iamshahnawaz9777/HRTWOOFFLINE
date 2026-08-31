/* ==========================================================================
   AeroGlass ERP Projects & Kanban Task Module — with Connected Logistics & Tools
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';
import { DateEngine } from '../dateEngine.js';
import { openCreateGatePassModal } from './gatepass.js';
import { openIssueToolModal } from './tools.js';

// Resolve circular dependency using a dynamic global window proxy
const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let selectedProjectId = null;
let currentFilters = { assignee: '', priority: '', search: '', projectSearch: '' };
let activeProjectTab = 'tasks'; // 'tasks' | 'gatepasses' | 'tools'

/**
 * Main Projects Renderer
 * Supports sub-routing if a direct task is requested (#projects/task/101)
 */
export async function renderProjects(container, routeParts = []) {
  const projects = await db.getAll('projects');
  const allTasks = await db.getAll('tasks');
  const allGatePasses = await db.getAll('gatepasses');
  const allTools = await db.getAll('tools_tracking');

  // Auto-select first project if none is active
  if (!selectedProjectId && projects.length > 0) {
    selectedProjectId = projects[0].id;
  }

  // Count items for currently selected project
  const currentProjectTasksCount = allTasks.filter(t => t.projectId === selectedProjectId).length;
  const currentProjectPassesCount = allGatePasses.filter(gp => gp.projectId === selectedProjectId).length;
  const currentProjectToolsCount = allTools.filter(tl => tl.projectId === selectedProjectId).length;

  // Double check direct task route request
  let directOpenTaskId = null;
  if (routeParts[1] === 'task' && routeParts[2]) {
    directOpenTaskId = routeParts[2];
  }

  // Render Skeleton layout
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 300px 1fr; gap: 24px; height: calc(100vh - 150px);">
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
        <div class="glass-card" style="padding: 6px 12px; display:flex; gap:8px; align-items:center; flex-shrink:0; overflow-x:auto;">
          <button id="project-tab-tasks" class="btn ${activeProjectTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeProjectTab === 'tasks' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="kanban-square" style="width:14px; height:14px;"></i>
            <span id="tab-label-tasks">Tasks Kanban (${currentProjectTasksCount})</span>
          </button>
          <button id="project-tab-gatepasses" class="btn ${activeProjectTab === 'gatepasses' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeProjectTab === 'gatepasses' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="file-check-2" style="width:14px; height:14px;"></i>
            <span id="tab-label-gatepasses">Gate Passes (${currentProjectPassesCount})</span>
          </button>
          <button id="project-tab-tools" class="btn ${activeProjectTab === 'tools' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 14px; font-size:12px; display:flex; align-items:center; gap:6px; ${activeProjectTab === 'tools' ? 'background:var(--primary-color);' : 'background:transparent;'}">
            <i data-lucide="clipboard-list" style="width:14px; height:14px;"></i>
            <span id="tab-label-tools">Order Tracking (${currentProjectToolsCount})</span>
          </button>
        </div>

        <!-- Tab 1: Kanban Board workspace -->
        <div id="project-tasks-view" style="display: ${activeProjectTab === 'tasks' ? 'flex' : 'none'}; flex-direction:column; gap: 14px; height:100%; overflow:hidden;">
          <!-- Filters header panel -->
          <div class="glass-card" style="padding: 14px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; flex-shrink:0;">
            <div class="filter-group">
              <div class="search-input-wrapper">
                <i data-lucide="search"></i>
                <input type="text" id="task-search-input" placeholder="Search tasks..." class="form-control" style="padding-top:7px; padding-bottom:7px; font-size:12px;" value="${currentFilters.search}">
              </div>
              
              <select id="task-assignee-filter" class="form-control-noicon" style="padding: 7px 10px; width:150px; font-size:12px;">
                <option value="">All Assignees</option>
                <!-- Populated dynamically -->
              </select>

              <select id="task-priority-filter" class="form-control-noicon" style="padding: 7px 10px; width:130px; font-size:12px;">
                <option value="">All Priorities</option>
                <option value="low" ${currentFilters.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                <option value="medium" ${currentFilters.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                <option value="high" ${currentFilters.priority === 'high' ? 'selected' : ''}>High Priority</option>
              </select>
            </div>

            <div>
              <button id="add-task-btn" class="btn btn-primary" style="padding: 8px 16px; font-size:12px;">
                <i data-lucide="plus"></i>
                <span>Create Task</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Kanban workspace columns + Logistics Header -->
          <div id="kanban-workspace" style="flex-grow:1; overflow-y:auto; padding-bottom: 20px;">
            <!-- Loaded dynamically -->
          </div>
        </div>

        <!-- Tab 2: Connected Gate Passes Ledger Workspace -->
        <div id="project-gatepasses-view" style="display: ${activeProjectTab === 'gatepasses' ? 'flex' : 'none'}; flex-direction:column; gap: 14px; height:100%; overflow:hidden;">
          <!-- Gate Passes Ledger loaded dynamically -->
        </div>

        <!-- Tab 3: Connected Tools Tracking Workspace -->
        <div id="project-tools-view" style="display: ${activeProjectTab === 'tools' ? 'flex' : 'none'}; flex-direction:column; gap: 14px; height:100%; overflow:hidden;">
          <!-- Tools Tracking loaded dynamically -->
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

  await renderActiveTabContent(container);
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
 * Render the content of the currently active tab
 */
async function renderActiveTabContent(container) {
  await updateTabCounters();

  if (activeProjectTab === 'tasks') {
    try {
      await refreshKanbanBoard(container);
    } catch (kanbanErr) {
      console.error('Failed to refresh Kanban board:', kanbanErr);
    }
    try {
      await populateAssigneeFilters();
    } catch (filtersErr) {
      console.error('Failed to populate assignee filters:', filtersErr);
    }
  } else if (activeProjectTab === 'gatepasses') {
    try {
      await refreshProjectGatePasses(container);
    } catch (gpErr) {
      console.error('Failed to refresh project gate passes:', gpErr);
    }
  } else if (activeProjectTab === 'tools') {
    try {
      await refreshProjectTools(container);
    } catch (toolErr) {
      console.error('Failed to refresh project tools:', toolErr);
    }
  }

  lucide.createIcons();
}

/**
 * Updates the tab header count badges
 */
async function updateTabCounters() {
  if (!selectedProjectId) return;
  const allTasks = await db.getAll('tasks');
  const allGatePasses = await db.getAll('gatepasses');
  const allTools = await db.getAll('tools_tracking');

  const taskCount = allTasks.filter(t => t.projectId === selectedProjectId).length;
  const passCount = allGatePasses.filter(gp => gp.projectId === selectedProjectId).length;
  const toolCount = allTools.filter(tl => tl.projectId === selectedProjectId).length;

  const tEl = document.getElementById('tab-label-tasks');
  const gpEl = document.getElementById('tab-label-gatepasses');
  const tlEl = document.getElementById('tab-label-tools');

  if (tEl) tEl.textContent = `Tasks Kanban (${taskCount})`;
  if (gpEl) gpEl.textContent = `Gate Passes (${passCount})`;
  if (tlEl) tlEl.textContent = `Order Tracking (${toolCount})`;
}

/**
 * Loads and renders the project navigation panel (left roster)
 */
async function refreshProjectRoster() {
  const listEl = document.getElementById('project-roster-list');
  if (!listEl) return;

  const projects = await db.getAll('projects');
  const tasks = await db.getAll('tasks');
  const gatepasses = await db.getAll('gatepasses');
  const tools = await db.getAll('tools_tracking');

  let filteredProjects = projects;
  if (currentFilters.projectSearch) {
    const q = currentFilters.projectSearch.toLowerCase();
    filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }

  listEl.innerHTML = filteredProjects.map(p => {
    const projTasks = tasks.filter(t => t.projectId === p.id);
    const projPasses = gatepasses.filter(gp => gp.projectId === p.id);
    const projTools = tools.filter(tl => tl.projectId === p.id);
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
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-bottom:4px;">
          <span>${projTasks.length} tasks</span>
          <span>${progress}% done</span>
        </div>
        <div style="display:flex; gap:6px; font-size:10px; color:var(--text-muted); margin-bottom:6px;">
          <span>📦 ${projPasses.length} passes</span>
          <span>·</span>
          <span>🔧 ${projTools.length} tools</span>
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
 * AND inserts the Connected Logistics & Equipment Overview Banner!
 */
async function refreshKanbanBoard(container) {
  const boardEl = document.getElementById('kanban-workspace');
  if (!boardEl) return;

  if (!selectedProjectId) {
    boardEl.innerHTML = `<div class="glass-card text-center muted-text" style="padding:100px;">Please create or select a project.</div>`;
    return;
  }

  const allTasks = await db.getAll('tasks');
  const allGatePasses = await db.getAll('gatepasses');
  const allTools = await db.getAll('tools_tracking');

  const projectGatePasses = allGatePasses.filter(gp => gp.projectId === selectedProjectId);
  const projectTools = allTools.filter(tl => tl.projectId === selectedProjectId);

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
    <!-- Connected Logistics & Assets Overview Banner -->
    <div class="glass-card" style="padding: 14px 18px; margin-bottom: 16px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.015); border-radius: var(--radius-md);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="truck" style="width:16px; height:16px; color:var(--primary-color);"></i>
          <h4 style="font-size:13px; font-weight:700; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Connected Project Logistics & Assets</h4>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="project-banner-new-gp" class="btn btn-secondary" style="padding:5px 12px; font-size:11px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="file-plus" style="width:12px; height:12px;"></i> New Pass
          </button>
          <button id="project-banner-new-tool" class="btn btn-secondary" style="padding:5px 12px; font-size:11px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="wrench" style="width:12px; height:12px;"></i> Issue Tool
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <!-- Gate Passes column summary -->
        <div style="background:rgba(0,0,0,0.14); border-radius:8px; padding:10px 14px; border:1px solid var(--glass-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">
              📦 Dispatched Passes (${projectGatePasses.length})
            </span>
            <button id="banner-view-passes-btn" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0; display:flex; align-items:center; gap:2px;">
              <span>View Ledger</span> <i data-lucide="chevron-right" style="width:12px; height:12px;"></i>
            </button>
          </div>
          ${projectGatePasses.length === 0 ? `
            <div style="font-size:11px; color:var(--text-muted); padding:4px 0;">No gate passes issued for this project yet.</div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:6px; max-height:100px; overflow-y:auto;">
              ${projectGatePasses.slice(0, 3).map(gp => {
                let statusBadge = 'warning';
                if (gp.status === 'Approved') statusBadge = 'primary';
                if (gp.status === 'Returned') statusBadge = 'success';
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px;">
                    <span><strong>${gp.gatePassNo}</strong> · ${gp.date || '—'} · ${(gp.items || []).length} items</span>
                    <span class="badge ${statusBadge}" style="font-size:9px;">${gp.status}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Tools column summary -->
        <div style="background:rgba(0,0,0,0.14); border-radius:8px; padding:10px 14px; border:1px solid var(--glass-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">
              🔧 Allocated Equipment (${projectTools.length})
            </span>
            <button id="banner-view-tools-btn" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0; display:flex; align-items:center; gap:2px;">
              <span>View Registry</span> <i data-lucide="chevron-right" style="width:12px; height:12px;"></i>
            </button>
          </div>
          ${projectTools.length === 0 ? `
            <div style="font-size:11px; color:var(--text-muted); padding:4px 0;">No tools currently allotted to this site.</div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:6px; max-height:100px; overflow-y:auto;">
              ${projectTools.slice(0, 3).map(tl => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px;">
                  <span><strong>${tl.toolDetails}</strong> (${tl.employeeName})</span>
                  <span class="badge ${tl.status === 'Returned' ? 'success' : 'warning'}" style="font-size:9px;">${tl.status}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- Kanban Columns Grid -->
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

  // Bind banner actions
  document.getElementById('banner-view-passes-btn')?.addEventListener('click', () => switchTab('gatepasses', container));
  document.getElementById('banner-view-tools-btn')?.addEventListener('click', () => switchTab('tools', container));

  document.getElementById('project-banner-new-gp')?.addEventListener('click', () => {
    openCreateGatePassModal(container, selectedProjectId);
  });

  document.getElementById('project-banner-new-tool')?.addEventListener('click', () => {
    openIssueToolModal(container, selectedProjectId, async () => {
      await refreshProjectRoster();
      await renderActiveTabContent(container);
    });
  });

  bindDragAndDrop();
  lucide.createIcons();
}

/**
 * Dedicated Tab View: Gate Passes for this Project
 */
async function refreshProjectGatePasses(container) {
  const gpView = document.getElementById('project-gatepasses-view');
  if (!gpView) return;

  const allGatePasses = await db.getAll('gatepasses');
  const projectPasses = allGatePasses.filter(gp => gp.projectId === selectedProjectId);

  gpView.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px; height:100%; overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700; display:flex; align-items:center; gap:8px;">
            <i data-lucide="file-check-2" style="width:18px; height:18px; color:var(--primary-color);"></i>
            <span>Project Material Dispatches & Gate Passes</span>
          </h3>
          <p class="muted-text" style="font-size:12px; margin-top:2px;">Showing all outward material vouchers issued for this site.</p>
        </div>
        <button id="proj-new-gatepass-btn" class="btn btn-primary" style="padding:8px 16px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="plus"></i>
          <span>Create Gate Pass for Project</span>
        </button>
      </div>

      <div class="table-responsive" style="flex-grow:1; overflow-y:auto;">
        <table class="custom-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Pass No</th>
              <th>Date</th>
              <th>Recipient / Phone</th>
              <th>Vehicle / Driver</th>
              <th>Dispatched Items</th>
              <th>Total (₹)</th>
              <th>Type</th>
              <th>Status</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${projectPasses.length === 0 ? `
              <tr>
                <td colspan="9" class="text-center muted-text" style="padding:60px 20px;">
                  <i data-lucide="package-x" style="width:40px; height:40px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
                  No gate passes created for this project yet.
                  <div style="margin-top:10px;">
                    <button id="empty-proj-gp-btn" class="btn btn-primary" style="padding:6px 14px; font-size:11px;">
                      + Create First Gate Pass
                    </button>
                  </div>
                </td>
              </tr>
            ` : projectPasses.map(gp => {
              let statusBadge = 'warning';
              if (gp.status === 'Approved') statusBadge = 'primary';
              if (gp.status === 'Returned') statusBadge = 'success';
              if (gp.status === 'Closed') statusBadge = 'secondary';

              const itemsSummary = (gp.items || []).map(i => `${i.name} × ${i.quantity}`).join(', ');

              return `
                <tr>
                  <td><strong>${gp.gatePassNo}</strong></td>
                  <td>${gp.date || '—'}</td>
                  <td>
                    <div><strong>${gp.person?.name || '—'}</strong></div>
                    <span style="font-size:10px; color:var(--text-muted);">${gp.person?.contact || ''}</span>
                  </td>
                  <td>
                    <div><code>${gp.vehicle?.vehicleNo || '—'}</code></div>
                    <span style="font-size:10px; color:var(--text-muted);">${gp.vehicle?.driverName || ''}</span>
                  </td>
                  <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${itemsSummary}">
                    📦 ${itemsSummary || 'No items'}
                  </td>
                  <td style="font-weight:600;">₹${Number(gp.pricing?.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td>${gp.returnable ? '<span class="badge warning" style="font-size:9px;">Returnable</span>' : '<span class="badge secondary" style="font-size:9px;">Standard</span>'}</td>
                  <td><span class="badge ${statusBadge}" style="font-size:9px;">${gp.status}</span></td>
                  <td style="text-align:center;">
                    <a href="#gatepass" class="btn btn-secondary" style="padding:4px 8px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                      <i data-lucide="external-link" style="width:12px; height:12px;"></i> View Pass
                    </a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind create buttons
  document.getElementById('proj-new-gatepass-btn')?.addEventListener('click', () => {
    openCreateGatePassModal(container, selectedProjectId);
  });
  document.getElementById('empty-proj-gp-btn')?.addEventListener('click', () => {
    openCreateGatePassModal(container, selectedProjectId);
  });

  lucide.createIcons();
}

/**
 * Dedicated Tab View: Tools Tracking for this Project
 */
async function refreshProjectTools(container) {
  const toolsView = document.getElementById('project-tools-view');
  if (!toolsView) return;

  const allTools = await db.getAll('tools_tracking');
  const projectTools = allTools.filter(tl => tl.projectId === selectedProjectId);

  toolsView.innerHTML = `
    <div class="glass-card" style="display:flex; flex-direction:column; gap:16px; padding:20px; height:100%; overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:16px; font-family:var(--font-heading); font-weight:700; display:flex; align-items:center; gap:8px;">
            <i data-lucide="wrench" style="width:18px; height:18px; color:var(--primary-color);"></i>
            <span>Project Allocated Tools & Equipment</span>
          </h3>
          <p class="muted-text" style="font-size:12px; margin-top:2px;">Track specialized tools and equipment deployed to this construction site.</p>
        </div>
        <button id="proj-new-tool-btn" class="btn btn-primary" style="padding:8px 16px; font-size:12px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="plus"></i>
          <span>Issue Tool to this Project</span>
        </button>
      </div>

      <div class="table-responsive" style="flex-grow:1; overflow-y:auto;">
        <table class="custom-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Technician / Employee</th>
              <th>Tool Set / Serial Tracking</th>
              <th>Date Issued</th>
              <th>Expected Return</th>
              <th>Date Returned</th>
              <th>Status</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${projectTools.length === 0 ? `
              <tr>
                <td colspan="7" class="text-center muted-text" style="padding:60px 20px;">
                  <i data-lucide="wrench" style="width:40px; height:40px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
                  No tools currently allocated to this project.
                  <div style="margin-top:10px;">
                    <button id="empty-proj-tool-btn" class="btn btn-primary" style="padding:6px 14px; font-size:11px;">
                      + Issue Equipment to Project
                    </button>
                  </div>
                </td>
              </tr>
            ` : projectTools.map(tl => `
              <tr>
                <td><strong>${tl.employeeName}</strong></td>
                <td style="font-family:monospace; color:var(--text-secondary);">${tl.toolDetails}</td>
                <td>${tl.dateTaken || '—'}</td>
                <td>${tl.expectedReturn || '—'}</td>
                <td>${tl.dateReturned || '—'}</td>
                <td>
                  <span class="badge ${tl.status === 'Returned' ? 'success' : 'warning'}" style="font-size:9px;">${tl.status}</span>
                </td>
                <td style="text-align:center;">
                  ${tl.status === 'Issued' ? `
                    <button class="btn btn-secondary mark-tool-proj-returned-btn" data-id="${tl.id}" style="padding:4px 8px; font-size:11px;">
                      Mark Returned
                    </button>
                  ` : `
                    <span style="font-size:11px; color:var(--success);">Returned</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind inline mark returned button
  toolsView.querySelectorAll('.mark-tool-proj-returned-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;
      const record = await db.get('tools_tracking', id);
      if (record) {
        record.status = 'Returned';
        record.dateReturned = DateEngine.stringify(new Date().toISOString().split('T')[0]);
        await db.put('tools_tracking', record);
        await sync.queueOperation('tools_tracking', 'update', record);

        app.showToast('Tool Returned', `Marked ${record.toolDetails} as returned.`, 'success');
        await refreshProjectTools(container);
        await updateTabCounters();
        await refreshProjectRoster();
      }
    });
  });

  // Bind Issue Tool buttons
  const openToolModal = () => {
    openIssueToolModal(container, selectedProjectId, async () => {
      await refreshProjectTools(container);
      await updateTabCounters();
      await refreshProjectRoster();
    });
  };

  document.getElementById('proj-new-tool-btn')?.addEventListener('click', openToolModal);
  document.getElementById('empty-proj-tool-btn')?.addEventListener('click', openToolModal);

  lucide.createIcons();
}

/**
 * Generate Task Card for Kanban board
 */
function generateTaskCardHTML(t) {
  const completedSubtasks = (t.subtasks || []).filter(s => s.completed).length;
  const totalSubtasks = (t.subtasks || []).length;

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
          <span>${t.deadline || 'No date'}</span>
        </span>
        
        <div class="task-assignees">
          ${(t.assignees || []).map(as => `
            <div class="assignee-avatar" title="${as}">${as.substring(0, 2).toUpperCase()}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Tab switcher helper
 */
async function switchTab(targetTab, container) {
  activeProjectTab = targetTab;

  const tabTasksBtn = document.getElementById('project-tab-tasks');
  const tabGpBtn = document.getElementById('project-tab-gatepasses');
  const tabToolsBtn = document.getElementById('project-tab-tools');

  const tasksView = document.getElementById('project-tasks-view');
  const gpView = document.getElementById('project-gatepasses-view');
  const toolsView = document.getElementById('project-tools-view');

  const allBtns = [tabTasksBtn, tabGpBtn, tabToolsBtn];
  allBtns.forEach(b => {
    if (b) {
      b.className = 'btn btn-secondary';
      b.style.background = 'transparent';
    }
  });

  if (tasksView) tasksView.style.display = 'none';
  if (gpView) gpView.style.display = 'none';
  if (toolsView) toolsView.style.display = 'none';

  if (targetTab === 'tasks') {
    if (tabTasksBtn) {
      tabTasksBtn.className = 'btn btn-primary';
      tabTasksBtn.style.background = 'var(--primary-color)';
    }
    if (tasksView) tasksView.style.display = 'flex';
    await refreshKanbanBoard(container);
  } else if (targetTab === 'gatepasses') {
    if (tabGpBtn) {
      tabGpBtn.className = 'btn btn-primary';
      tabGpBtn.style.background = 'var(--primary-color)';
    }
    if (gpView) gpView.style.display = 'flex';
    await refreshProjectGatePasses(container);
  } else if (targetTab === 'tools') {
    if (tabToolsBtn) {
      tabToolsBtn.className = 'btn btn-primary';
      tabToolsBtn.style.background = 'var(--primary-color)';
    }
    if (toolsView) toolsView.style.display = 'flex';
    await refreshProjectTools(container);
  }

  await updateTabCounters();
  lucide.createIcons();
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
      if (e.target.closest('[draggable]')?.classList.contains('dragging')) return;
      const taskId = card.getAttribute('data-id');
      const task = await db.get('tasks', taskId);
      if (task) openTaskDetailModal(task);
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
        await refreshKanbanBoard(document.getElementById('view-content'));
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

    await refreshKanbanBoard(container);
    await refreshProjectRoster();
    await updateTabCounters();
  });
}

/**
 * Binding of click handlers and filters on projects dashboard
 */
function bindEventListeners(container) {
  // 1. Selector Project (using Event Delegation)
  const rosterList = document.getElementById('project-roster-list');
  if (rosterList) {
    rosterList.addEventListener('click', async (e) => {
      const item = e.target.closest('.project-selector-item');
      if (item) {
        selectedProjectId = item.getAttribute('data-id');
        await refreshProjectRoster();
        await renderActiveTabContent(container);
      }
    });
  }

  // Tab Switchers
  document.getElementById('project-tab-tasks')?.addEventListener('click', () => switchTab('tasks', container));
  document.getElementById('project-tab-gatepasses')?.addEventListener('click', () => switchTab('gatepasses', container));
  document.getElementById('project-tab-tools')?.addEventListener('click', () => switchTab('tools', container));

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
  searchInput?.addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    refreshKanbanBoard(container);
  });

  const assigneeFilter = document.getElementById('task-assignee-filter');
  assigneeFilter?.addEventListener('change', (e) => {
    currentFilters.assignee = e.target.value;
    refreshKanbanBoard(container);
  });

  const priorityFilter = document.getElementById('task-priority-filter');
  priorityFilter?.addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    refreshKanbanBoard(container);
  });

  // 3. Create Project Modal Action
  document.getElementById('add-project-btn')?.addEventListener('click', () => {
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
          <strong style="font-size:13px;">${task.deadline || 'No date'}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Status</span>
          <span class="badge ${task.status === 'done' ? 'success' : task.status === 'review' ? 'warning' : 'primary'}">${task.status}</span>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Assignees</span>
          <strong style="font-size:13px;">${(task.assignees || []).join(', ')}</strong>
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

    if (!task.subtasks || task.subtasks.length === 0) {
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
        await refreshKanbanBoard(document.getElementById('view-content'));
        await refreshProjectRoster();
      });
    });
  };

  // Render activity log
  const renderActivities = () => {
    const actEl = document.getElementById('modal-task-activities');
    actEl.innerHTML = (task.activityLog || []).map(act => `
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

    if (!task.subtasks) task.subtasks = [];
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
    await refreshKanbanBoard(document.getElementById('view-content'));
    await refreshProjectRoster();
  };

  addSubtaskBtn?.addEventListener('click', triggerAddSubtask);
  addSubtaskInput?.addEventListener('keypress', (e) => {
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

  commentBtn?.addEventListener('click', triggerAddComment);
  commentInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerAddComment();
  });

  // Bind Delete Task Button
  document.getElementById('task-delete-btn')?.addEventListener('click', async () => {
    const confirmDelete = confirm(`Are you absolutely sure you want to delete task: "${task.name}"?`);
    if (confirmDelete) {
      await db.delete('tasks', task.id);
      await sync.queueOperation('tasks', 'delete', task.id);

      app.closeModal();
      app.showToast('Task Deleted', `Successfully deleted task from Kanban board.`, 'success');

      await refreshKanbanBoard(document.getElementById('view-content'));
      await refreshProjectRoster();
      await updateTabCounters();
    }
  });
}
