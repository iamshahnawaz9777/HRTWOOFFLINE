/* ==========================================================================
   AeroGlass ERP Dashboard Module — Priority Tasks & Operational Command Center
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';
import { sync } from '../sync.js';

const app = new Proxy({}, {
  get: (target, prop) => window.app ? window.app[prop] : undefined
});

let taskFilters = {
  search: '',
  priority: '',
  status: '',
  project: '',
  sort: 'priority-desc'
};

/**
 * Main dashboard screen renderer
 * @param {HTMLElement} container 
 */
export async function renderDashboard(container) {
  // 1. Query metrics from stores
  const projects = await db.getAll('projects');
  const tasks = await db.getAll('tasks');
  const employees = await db.getAll('employees');
  const attendance = await db.getAll('attendance');
  const inventory = await db.getAll('inventory');
  const gatepasses = await db.getAll('gatepasses');

  // 2. Compute KPI Metrics
  const activeProjCount = projects.filter(p => p.status === 'Active').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(att => att.date === todayStr);
  const totalEmpCount = employees.length;
  const attendancePercent = totalEmpCount > 0 
    ? Math.round((todayAttendance.length / totalEmpCount) * 100) 
    : 0;

  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
  const pendingGatePassCount = gatepasses.filter(gp => gp.status === 'Pending').length;

  // Task Statistics
  const totalTasksCount = tasks.length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;

  // Calculate project task metrics
  const projectsProgress = projects.filter(p => p.status === 'Active').map(p => {
    const projTasks = tasks.filter(t => t.projectId === p.id);
    const completedTasks = projTasks.filter(t => t.status === 'done').length;
    const progress = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;
    return { name: p.name, count: projTasks.length, progress };
  });

  // Extract Combined Recent Activities
  const activities = [];
  
  // Tasks activities
  tasks.forEach(t => {
    if (t.activityLog) {
      t.activityLog.forEach(log => {
        activities.push({
          type: 'project',
          text: `Task <strong>"${t.name}"</strong>: ${log.action} by ${log.user}`,
          time: log.time
        });
      });
    }
  });

  // Gate pass activities
  gatepasses.forEach(gp => {
    activities.push({
      type: 'gatepass',
      text: `Gate Pass <strong>${gp.gatePassNo}</strong> for <strong>${gp.person?.name || 'Site'}</strong> status: <strong>${gp.status}</strong>`,
      time: `${gp.date || todayStr}T10:00:00Z`
    });
  });

  // Sort activities chronologically
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  const topActivities = activities.slice(0, 6);

  // 3. Render HTML structure
  container.innerHTML = `
    <!-- Top KPI Grid: Emphasizing Tasks & Operations -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 20px;">
      
      <!-- Primary Tasks KPI -->
      <div class="glass-card kpi-card blue" style="border-left: 4px solid var(--primary-color);">
        <div class="kpi-icon" style="background: var(--primary-glow); color: var(--primary-color);">
          <i data-lucide="check-square"></i>
        </div>
        <div class="kpi-info">
          <h3>Operational Tasks</h3>
          <div class="kpi-value">${totalTasksCount}</div>
          <p style="display:flex; gap:8px; align-items:center;">
            <span style="color:var(--danger); font-weight:700;">🔥 ${highPriorityCount} High</span>
            <span>·</span>
            <span style="color:var(--success);">${completedTasksCount} Done</span>
          </p>
        </div>
      </div>

      <!-- Active Projects KPI -->
      <div class="glass-card kpi-card purple">
        <div class="kpi-icon">
          <i data-lucide="folder-kanban"></i>
        </div>
        <div class="kpi-info">
          <h3>Active Projects</h3>
          <div class="kpi-value">${activeProjCount}</div>
          <p>Running customer sites</p>
        </div>
      </div>

      <!-- HR Attendance KPI -->
      <div class="glass-card kpi-card" style="border-left: 4px solid var(--accent-color);">
        <div class="kpi-icon" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">
          <i data-lucide="user-check"></i>
        </div>
        <div class="kpi-info">
          <h3>HR Attendance</h3>
          <div class="kpi-value">${attendancePercent}%</div>
          <p>${todayAttendance.length} / ${totalEmpCount} staff checked-in</p>
        </div>
      </div>

      <!-- Low Stock Alerts KPI -->
      <div class="glass-card kpi-card green">
        <div class="kpi-icon">
          <i data-lucide="alert-circle"></i>
        </div>
        <div class="kpi-info">
          <h3>Low Stock Alerts</h3>
          <div class="kpi-value ${lowStockCount > 0 ? 'danger-text' : ''}">${lowStockCount}</div>
          <p>Items below minimum</p>
        </div>
      </div>

      <!-- Pending Gate Pass-PI KPI -->
      <div class="glass-card kpi-card orange">
        <div class="kpi-icon">
          <i data-lucide="file-check-2"></i>
        </div>
        <div class="kpi-info">
          <h3>Pending Gate Pass-PI</h3>
          <div class="kpi-value">${pendingGatePassCount}</div>
          <p>Requires manager signoff</p>
        </div>
      </div>
    </div>

    <!-- Alert Bar for Low Stock items -->
    ${lowStockCount > 0 ? `
      <div class="alert-bar" style="margin-bottom: 20px;">
        <i data-lucide="alert-triangle"></i>
        <span>Critical: ${lowStockCount} inventory items have fallen below their safety threshold! Check the Inventory Store module to log Stock Inward receipts.</span>
      </div>
    ` : ''}

    <!-- PRIORITY GIVEN TO TASKS: OPERATIONAL TASKS COMMAND CENTER -->
    <div class="glass-card section-card" style="margin-bottom: 24px; padding: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:10px; background:var(--primary-glow); display:flex; align-items:center; justify-content:center; color:var(--primary-color);">
            <i data-lucide="list-todo" style="width:22px; height:22px;"></i>
          </div>
          <div>
            <h3 style="font-size:17px; font-family:var(--font-heading); font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
              <span>Operational Tasks & Priority Queue</span>
              <span class="badge primary" id="dash-tasks-badge" style="font-size:11px;">${tasks.length} Total</span>
            </h3>
            <p class="muted-text" style="font-size:12px; margin:2px 0 0;">Priority-driven task queue with connected projects, assignees, and live status editing.</p>
          </div>
        </div>

        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <a href="#projects" class="btn btn-secondary" style="padding:8px 14px; font-size:12px; text-decoration:none; display:flex; align-items:center; gap:6px;">
            <i data-lucide="kanban-square" style="width:14px; height:14px;"></i>
            <span>Kanban Board</span>
          </a>
          <button id="dash-add-task-btn" class="btn btn-primary" style="padding:8px 16px; font-size:12px; display:flex; align-items:center; gap:6px; font-weight:600;">
            <i data-lucide="plus-circle" style="width:15px; height:15px;"></i>
            <span>Add New Task</span>
          </button>
        </div>
      </div>

      <!-- Interactive Filters & Search Controls -->
      <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px; background:rgba(0,0,0,0.12); padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
        <div class="search-input-wrapper" style="flex:1; min-width:200px;">
          <i data-lucide="search"></i>
          <input type="text" id="dash-task-search" placeholder="Search tasks, details, assignees..." class="form-control" style="font-size:12px; padding-top:7px; padding-bottom:7px;" value="${taskFilters.search}">
        </div>

        <!-- Priority Filter -->
        <select id="dash-task-priority-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:140px;">
          <option value="" ${taskFilters.priority === '' ? 'selected' : ''}>All Priorities</option>
          <option value="high" ${taskFilters.priority === 'high' ? 'selected' : ''}>🔥 High Priority</option>
          <option value="medium" ${taskFilters.priority === 'medium' ? 'selected' : ''}>⚡ Medium Priority</option>
          <option value="low" ${taskFilters.priority === 'low' ? 'selected' : ''}>🌱 Low Priority</option>
        </select>

        <!-- Status Filter -->
        <select id="dash-task-status-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:130px;">
          <option value="" ${taskFilters.status === '' ? 'selected' : ''}>All Statuses</option>
          <option value="todo" ${taskFilters.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in-progress" ${taskFilters.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="review" ${taskFilters.status === 'review' ? 'selected' : ''}>Review</option>
          <option value="done" ${taskFilters.status === 'done' ? 'selected' : ''}>Completed</option>
        </select>

        <!-- Project Connection Filter -->
        <select id="dash-task-project-filter" class="form-control-noicon" style="font-size:12px; padding:7px 10px; max-width:200px;">
          <option value="" ${taskFilters.project === '' ? 'selected' : ''}>All Projects</option>
          <option value="__none__" ${taskFilters.project === '__none__' ? 'selected' : ''}>— Independent (No Project) —</option>
          ${projects.map(p => `<option value="${p.id}" ${taskFilters.project === p.id ? 'selected' : ''}>🏗️ ${p.name}</option>`).join('')}
        </select>

        <!-- Sorting -->
        <select id="dash-task-sort" class="form-control-noicon" style="font-size:12px; padding:7px 10px; width:150px;">
          <option value="priority-desc" ${taskFilters.sort === 'priority-desc' ? 'selected' : ''}>Priority: High → Low</option>
          <option value="deadline-asc" ${taskFilters.sort === 'deadline-asc' ? 'selected' : ''}>Deadline: Soonest</option>
          <option value="newest" ${taskFilters.sort === 'newest' ? 'selected' : ''}>Recently Created</option>
        </select>
      </div>

      <!-- Tasks List Table -->
      <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
        <table class="custom-table" style="font-size:12px; margin:0;">
          <thead>
            <tr>
              <th style="width:100px;">Priority</th>
              <th style="min-width:250px;">Task Title & Details</th>
              <th style="width:170px;">Connected Project</th>
              <th style="width:140px;">Assigned To</th>
              <th style="width:110px;">Deadline</th>
              <th style="width:140px;">Status</th>
              <th style="text-align:center; width:90px;">Actions</th>
            </tr>
          </thead>
          <tbody id="dash-tasks-tbody">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Double Column Main Section: Project Milestones, Passes, Activities -->
    <div class="dashboard-sections">
      <!-- Column 1: Projects Progress & Pending Gate Passes -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Active Projects Milestones -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Active Project Milestones</h3>
            <a href="#projects" class="primary-text" style="font-size:12px; font-weight:600; text-decoration:none;">View All Projects</a>
          </div>
          <div style="display:flex; flex-direction:column; gap: 16px;">
            ${projectsProgress.length > 0 ? projectsProgress.map(p => `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                  <strong>${p.name}</strong>
                  <span class="muted-text">${p.progress}% completed (${p.count} tasks)</span>
                </div>
                <div style="width:100%; height:8px; background:var(--glass-border); border-radius:4px; overflow:hidden;">
                  <div style="width:${p.progress}%; height:100%; background:linear-gradient(90deg, var(--primary-color) 0%, var(--accent-color) 100%); border-radius:4px;"></div>
                </div>
              </div>
            `).join('') : '<p class="muted-text text-center" style="padding:20px 0;">No active projects found.</p>'}
          </div>
        </div>

        <!-- Gate Passes Awaiting Authorization -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Gate Pass-PI Awaiting Authorization</h3>
            <a href="#gatepass" class="primary-text" style="font-size:12px; font-weight:600; text-decoration:none;">View Pass Ledger</a>
          </div>
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Pass Number</th>
                  <th>Recipient</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${gatepasses.filter(gp => gp.status === 'Pending').length > 0 ? gatepasses.filter(gp => gp.status === 'Pending').map(gp => `
                  <tr>
                    <td><strong>${gp.gatePassNo}</strong></td>
                    <td>${gp.person?.name || '—'} (${gp.person?.designation || 'Staff'})</td>
                    <td><code>${gp.vehicle?.vehicleNo || '—'}</code></td>
                    <td><span class="badge warning">Pending Signoff</span></td>
                    <td>
                      <a href="#gatepass" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;">Inspect</a>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="5" class="text-center muted-text" style="padding:20px 0;">All gate passes have been authorized and closed.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Column 2: Activity logs & Quick Operations -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Recent Operations Feed -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Recent Operations Log</h3>
          </div>
          <div class="activity-list">
            ${topActivities.length > 0 ? topActivities.map(act => `
              <div class="activity-item">
                <div class="activity-badge ${act.type}">
                  <i data-lucide="${act.type === 'project' ? 'kanban-square' : act.type === 'hr' ? 'user-check' : act.type === 'inventory' ? 'package' : 'ticket'}"></i>
                </div>
                <div class="activity-details">
                  <div class="activity-text">${act.text}</div>
                  <div class="activity-time">${new Date(act.time).toLocaleString()}</div>
                </div>
              </div>
            `).join('') : '<p class="muted-text text-center" style="padding:40px 0;">No logged operations yet.</p>'}
          </div>
        </div>

        <!-- Quick Access Widget -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <a href="#projects" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="folder-plus" style="width:24px; height:24px; color:var(--primary-color);"></i>
              <span style="font-size:12px;">Project Tasks</span>
            </a>
            <a href="#inventory" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="package-plus" style="width:24px; height:24px; color:var(--success);"></i>
              <span style="font-size:12px;">Inventory Store</span>
            </a>
            <a href="#gatepass" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="file-check-2" style="width:24px; height:24px; color:var(--warning);"></i>
              <span style="font-size:12px;">Gate Pass-PI</span>
            </a>
            <a href="#tools" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="clipboard-list" style="width:24px; height:24px; color:var(--accent-color);"></i>
              <span style="font-size:12px;">Order Tracking</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render task list items
  await renderTaskListRows(container, projects, tasks);

  // Bind filter events and Add Task button
  bindDashboardEvents(container, projects);

  lucide.createIcons();
}

/**
 * Filter, sort, and render task rows inside the dashboard task table
 */
async function renderTaskListRows(container, projects = null, allTasks = null) {
  const tbody = document.getElementById('dash-tasks-tbody');
  if (!tbody) return;

  if (!projects) projects = await db.getAll('projects');
  if (!allTasks) allTasks = await db.getAll('tasks');

  let filtered = [...allTasks];

  // 1. Search Query
  if (taskFilters.search) {
    const q = taskFilters.search.toLowerCase();
    filtered = filtered.filter(t => 
      (t.name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.assignees || []).some(a => a.toLowerCase().includes(q))
    );
  }

  // 2. Priority Filter
  if (taskFilters.priority) {
    filtered = filtered.filter(t => t.priority === taskFilters.priority);
  }

  // 3. Status Filter
  if (taskFilters.status) {
    filtered = filtered.filter(t => t.status === taskFilters.status);
  }

  // 4. Project Connection Filter
  if (taskFilters.project) {
    if (taskFilters.project === '__none__') {
      filtered = filtered.filter(t => !t.projectId);
    } else {
      filtered = filtered.filter(t => t.projectId === taskFilters.project);
    }
  }

  // 5. Sorting
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  if (taskFilters.sort === 'priority-desc') {
    filtered.sort((a, b) => {
      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;
      if (pB !== pA) return pB - pA;
      // Secondary sort: incomplete before completed
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      return (b.id || '').localeCompare(a.id || '');
    });
  } else if (taskFilters.sort === 'deadline-asc') {
    filtered.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  } else if (taskFilters.sort === 'newest') {
    filtered.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }

  const badgeEl = document.getElementById('dash-tasks-badge');
  if (badgeEl) badgeEl.textContent = `${filtered.length} of ${allTasks.length} Tasks`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center muted-text" style="padding:40px 20px;">
          <i data-lucide="check-circle-2" style="width:36px; height:36px; margin-bottom:8px; opacity:0.4; display:block; margin:0 auto 8px;"></i>
          No tasks match the active filters.
          <div style="margin-top:8px;">
            <button id="dash-clear-filters-btn" class="btn btn-secondary" style="padding:4px 10px; font-size:11px;">Clear Filters</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('dash-clear-filters-btn')?.addEventListener('click', () => {
      taskFilters = { search: '', priority: '', status: '', project: '', sort: 'priority-desc' };
      renderDashboard(container);
    });
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const proj = projects.find(p => p.id === t.projectId);
    const projName = proj ? proj.name : (t.projectName || '');
    const completedSub = (t.subtasks || []).filter(s => s.completed).length;
    const totalSub = (t.subtasks || []).length;
    const assigneesText = (t.assignees || []).join(', ') || 'Unassigned';

    // Priority formatting
    let priorityBadge = '';
    if (t.priority === 'high') {
      priorityBadge = `<span class="task-priority-badge high" style="margin:0; font-size:9px;">🔥 HIGH</span>`;
    } else if (t.priority === 'medium') {
      priorityBadge = `<span class="task-priority-badge medium" style="margin:0; font-size:9px;">⚡ MEDIUM</span>`;
    } else {
      priorityBadge = `<span class="task-priority-badge low" style="margin:0; font-size:9px;">🌱 LOW</span>`;
    }

    return `
      <tr data-task-id="${t.id}">
        <td>${priorityBadge}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary); cursor:pointer;" class="dash-task-title-link" data-id="${t.id}">
            ${t.name}
          </div>
          ${t.description ? `<div style="font-size:11px; color:var(--text-secondary); max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.description}</div>` : ''}
          ${totalSub > 0 ? `
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:4px;">
              <i data-lucide="check-square" style="width:11px; height:11px;"></i>
              <span>${completedSub}/${totalSub} checklist items</span>
            </div>
          ` : ''}
        </td>
        <td>
          ${projName ? `
            <span class="badge secondary" style="font-size:10px; white-space:nowrap; max-width:160px; overflow:hidden; text-overflow:ellipsis; display:inline-block;" title="${projName}">
              🏗️ ${projName}
            </span>
          ` : `
            <span class="badge" style="font-size:10px; background:rgba(255,255,255,0.06); color:var(--text-secondary);">
              Independent
            </span>
          `}
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="assignee-avatar" style="width:20px; height:20px; font-size:9px;" title="${assigneesText}">
              ${assigneesText.substring(0, 2).toUpperCase()}
            </div>
            <span style="font-size:11px; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${assigneesText}</span>
          </div>
        </td>
        <td>
          <span style="font-size:11px; color:${t.deadline ? 'var(--text-primary)' : 'var(--text-muted)'};">
            ${t.deadline || '—'}
          </span>
        </td>
        <td>
          <select class="form-control-noicon dash-task-status-changer" data-id="${t.id}" style="padding:3px 6px; font-size:11px; height:26px; border-radius:4px; font-weight:600; 
            ${t.status === 'done' ? 'color:var(--success); border-color:rgba(16,185,129,0.4);' : 
              t.status === 'in-progress' ? 'color:var(--primary-color); border-color:rgba(59,130,246,0.4);' : 
              t.status === 'review' ? 'color:var(--warning); border-color:rgba(245,158,11,0.4);' : 
              'color:var(--text-secondary);'}">
            <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="review" ${t.status === 'review' ? 'selected' : ''}>Review</option>
            <option value="done" ${t.status === 'done' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td style="text-align:center;">
          <div style="display:flex; justify-content:center; gap:4px;">
            <button class="btn btn-secondary dash-inspect-task-btn" data-id="${t.id}" title="View Details" style="padding:3px 6px; font-size:11px;">
              <i data-lucide="eye" style="width:12px; height:12px;"></i>
            </button>
            <button class="btn btn-danger dash-delete-task-btn" data-id="${t.id}" title="Delete Task" style="padding:3px 6px; font-size:11px;">
              <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind inline status change listeners
  tbody.querySelectorAll('.dash-task-status-changer').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const taskId = e.target.getAttribute('data-id');
      const newStatus = e.target.value;
      const task = await db.get('tasks', taskId);
      if (task) {
        const oldStatus = task.status;
        task.status = newStatus;
        if (!task.activityLog) task.activityLog = [];
        task.activityLog.push({
          time: new Date().toISOString(),
          user: auth.getCurrentUser()?.username || 'Admin',
          action: `Shifted status from ${oldStatus} to ${newStatus} on Dashboard`
        });

        await db.put('tasks', task);
        await sync.queueOperation('tasks', 'update', task);

        app.showToast('Task Updated', `"${task.name}" marked as ${newStatus}.`, 'success');
        await renderDashboard(container);
      }
    });
  });

  // Bind Inspect buttons and title links
  const openDetail = async (taskId) => {
    const task = await db.get('tasks', taskId);
    if (task) openDashboardTaskModal(task, container, projects);
  };

  tbody.querySelectorAll('.dash-task-title-link').forEach(el => {
    el.addEventListener('click', () => openDetail(el.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.dash-inspect-task-btn').forEach(el => {
    el.addEventListener('click', () => openDetail(el.getAttribute('data-id')));
  });

  // Bind Delete buttons
  tbody.querySelectorAll('.dash-delete-task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId = btn.getAttribute('data-id');
      const task = await db.get('tasks', taskId);
      if (task && confirm(`Delete task: "${task.name}"?`)) {
        await db.delete('tasks', taskId);
        await sync.queueOperation('tasks', 'delete', taskId);
        app.showToast('Task Deleted', `Removed "${task.name}".`, 'success');
        await renderDashboard(container);
      }
    });
  });

  lucide.createIcons();
}

/**
 * Bind Dashboard search, filters, and Add Task triggers
 */
function bindDashboardEvents(container, projects) {
  // Search input
  const searchInput = document.getElementById('dash-task-search');
  searchInput?.addEventListener('input', (e) => {
    taskFilters.search = e.target.value;
    renderTaskListRows(container, projects);
  });

  // Priority filter
  const priorityFilter = document.getElementById('dash-task-priority-filter');
  priorityFilter?.addEventListener('change', (e) => {
    taskFilters.priority = e.target.value;
    renderTaskListRows(container, projects);
  });

  // Status filter
  const statusFilter = document.getElementById('dash-task-status-filter');
  statusFilter?.addEventListener('change', (e) => {
    taskFilters.status = e.target.value;
    renderTaskListRows(container, projects);
  });

  // Project filter
  const projectFilter = document.getElementById('dash-task-project-filter');
  projectFilter?.addEventListener('change', (e) => {
    taskFilters.project = e.target.value;
    renderTaskListRows(container, projects);
  });

  // Sort order
  const sortSelect = document.getElementById('dash-task-sort');
  sortSelect?.addEventListener('change', (e) => {
    taskFilters.sort = e.target.value;
    renderTaskListRows(container, projects);
  });

  // Add Task Button
  document.getElementById('dash-add-task-btn')?.addEventListener('click', () => {
    openCreateTaskDashboardModal(container, projects);
  });
}

/**
 * Open Modal to Create New Task from Dashboard
 * Asks which project the task is connected to, or allows adding manually without any project connect!
 */
async function openCreateTaskDashboardModal(container, projects) {
  const employees = await db.getAll('employees');
  const todayStr = new Date().toISOString().split('T')[0];

  const modalHTML = `
    <form id="dash-new-task-form" style="display:flex; flex-direction:column; gap:16px; padding:10px;">
      
      <!-- Task Name -->
      <div class="input-group" style="margin-bottom:0;">
        <label style="font-weight:700;">Task Name / Title <span style="color:var(--danger); font-size:11px;">*required</span></label>
        <input type="text" id="dash-new-task-name" class="form-control-noicon" required placeholder="e.g. Cut 12mm Toughened Glass for Partition Suite A" />
      </div>

      <!-- Task Details / Description -->
      <div class="input-group" style="margin-bottom:0;">
        <label>Task Instructions & Details <span class="muted-text" style="font-size:11px;">(optional)</span></label>
        <textarea id="dash-new-task-desc" class="form-control-noicon" rows="3" placeholder="Provide operational instructions, dimensions, specific site requirements..."></textarea>
      </div>

      <!-- Connected Project Selection (or Manual Independent Task) -->
      <div class="input-group" style="margin-bottom:0;">
        <label style="font-weight:700; display:flex; justify-content:space-between; align-items:center;">
          <span>Connected Project</span>
          <span class="muted-text" style="font-size:11px; font-weight:400;">Optional project link</span>
        </label>
        <select id="dash-new-task-project" class="form-control-noicon" style="border-color:var(--primary-color);">
          <option value="">— Independent Task (No Project Connected) —</option>
          ${projects.map(p => `<option value="${p.id}">🏗️ ${p.name} (${p.status})</option>`).join('')}
        </select>
        <span class="muted-text" style="font-size:11px; margin-top:3px; display:block;">
          Choose a project to place this on its Kanban board, or leave as Independent for general factory/workshop duties.
        </span>
      </div>

      <!-- Assignee and Priority Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
        <!-- Assignee Selection -->
        <div class="input-group" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label>Assigned To</label>
            <button type="button" id="dash-assign-toggle-btn" style="background:none; border:none; color:var(--primary-color); font-size:11px; cursor:pointer; padding:0;">
              Enter Manually
            </button>
          </div>
          <div id="dash-assign-select-wrapper">
            <select id="dash-new-task-assignee" class="form-control-noicon">
              <option value="">-- Choose Employee --</option>
              ${employees.map(emp => `<option value="${emp.name}">${emp.name} (${emp.role || 'Staff'})</option>`).join('')}
            </select>
          </div>
          <div id="dash-assign-input-wrapper" style="display:none;">
            <input type="text" id="dash-new-task-manual-assignee" class="form-control-noicon" placeholder="Type custom assignee / contractor name..." />
          </div>
        </div>

        <!-- Priority Selection -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Priority *</label>
          <select id="dash-new-task-priority" class="form-control-noicon" required>
            <option value="high">🔥 High Priority (Urgent)</option>
            <option value="medium" selected>⚡ Medium Priority (Standard)</option>
            <option value="low">🌱 Low Priority (Routine)</option>
          </select>
        </div>
      </div>

      <!-- Status and Deadline Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
        <!-- Initial Status -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Initial Status *</label>
          <select id="dash-new-task-status" class="form-control-noicon" required>
            <option value="todo" selected>To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Completed</option>
          </select>
        </div>

        <!-- Deadline -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Deadline Date</label>
          <input type="date" id="dash-new-task-deadline" class="form-control-noicon" value="${todayStr}" />
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px; padding:10px; font-weight:600;">
        Create & Log Task
      </button>
    </form>
  `;

  app.openModal('Create Operational Task', modalHTML, '520px');

  // Toggle manual assignee
  let isManualAssign = false;
  const toggleBtn = document.getElementById('dash-assign-toggle-btn');
  const selectWrap = document.getElementById('dash-assign-select-wrapper');
  const inputWrap = document.getElementById('dash-assign-input-wrapper');

  toggleBtn?.addEventListener('click', () => {
    isManualAssign = !isManualAssign;
    if (isManualAssign) {
      selectWrap.style.display = 'none';
      inputWrap.style.display = 'block';
      toggleBtn.textContent = 'Select from List';
    } else {
      selectWrap.style.display = 'block';
      inputWrap.style.display = 'none';
      toggleBtn.textContent = 'Enter Manually';
    }
  });

  // Submit Handler
  document.getElementById('dash-new-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('dash-new-task-name')?.value.trim();
    const description = document.getElementById('dash-new-task-desc')?.value.trim() || '';
    const projectId = document.getElementById('dash-new-task-project')?.value || null;
    const selectedProj = projects.find(p => p.id === projectId);
    const projectName = selectedProj ? selectedProj.name : '';

    let assignee = '';
    if (isManualAssign) {
      assignee = document.getElementById('dash-new-task-manual-assignee')?.value.trim() || 'General Operations';
    } else {
      assignee = document.getElementById('dash-new-task-assignee')?.value || 'General Operations';
    }

    const priority = document.getElementById('dash-new-task-priority')?.value || 'medium';
    const status = document.getElementById('dash-new-task-status')?.value || 'todo';
    const deadline = document.getElementById('dash-new-task-deadline')?.value || '';

    if (!name) {
      app.showToast('Validation Error', 'Task Name is mandatory!', 'warning');
      return;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      projectId: projectId || null,
      projectName: projectName || '',
      name,
      description,
      assignees: [assignee],
      deadline,
      priority,
      status,
      subtasks: [],
      activityLog: [
        {
          time: new Date().toISOString(),
          user: auth.getCurrentUser()?.username || 'Admin',
          action: `Created task from Dashboard${projectName ? ` for ${projectName}` : ' (Independent)'}`
        }
      ]
    };

    await db.put('tasks', newTask);
    await sync.queueOperation('tasks', 'insert', newTask);

    app.closeModal();
    app.showToast('Task Created', `"${name}" added successfully.`, 'success');

    await renderDashboard(container);
  });
}

/**
 * Open Task Details Modal from Dashboard
 */
function openDashboardTaskModal(task, container, projects) {
  const proj = projects.find(p => p.id === task.projectId);
  const projName = proj ? proj.name : (task.projectName || 'Independent (No Project)');

  const modalBodyHTML = `
    <div style="display:flex; flex-direction:column; gap:18px;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="task-priority-badge ${task.priority}">${task.priority.toUpperCase()} PRIORITY</span>
          <span class="badge ${task.status === 'done' ? 'success' : task.status === 'in-progress' ? 'primary' : 'warning'}">${task.status}</span>
        </div>
        <h2 style="font-size:18px; font-family:var(--font-heading); font-weight:700; margin:4px 0;">${task.name}</h2>
        <p class="muted-text" style="font-size:13px; margin:0;">${task.description || 'No detailed instructions provided.'}</p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; border-top:1px solid var(--glass-border); padding-top:14px;">
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Connected Project</span>
          <strong style="font-size:12px;">${projName}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Deadline</span>
          <strong style="font-size:12px;">${task.deadline || 'None'}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:var(--text-muted); display:block; text-transform:uppercase;">Assignees</span>
          <strong style="font-size:12px;">${(task.assignees || []).join(', ') || 'Unassigned'}</strong>
        </div>
      </div>

      <!-- Checklist Section -->
      <div style="border-top:1px solid var(--glass-border); padding-top:14px;">
        <h4 style="font-size:13px; font-weight:600; margin-bottom:8px; display:flex; justify-content:space-between;">
          <span>Subtasks Checklist</span>
          <span style="font-size:11px;" id="dash-modal-subtasks-count"></span>
        </h4>
        <div id="dash-modal-subtask-list" class="subtasks-list">
          <!-- Rendered dynamically -->
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <input type="text" id="dash-add-subtask-input" class="form-control-noicon" style="padding:5px 10px; font-size:12px;" placeholder="Add new checklist item...">
          <button id="dash-add-subtask-btn" class="btn btn-secondary" style="padding:5px 12px; font-size:12px;">Add</button>
        </div>
      </div>

      <!-- Activity Log & Comments -->
      <div style="border-top:1px solid var(--glass-border); padding-top:14px;">
        <h4 style="font-size:13px; font-weight:600; margin-bottom:8px;">Activity Log & Comments</h4>
        <div id="dash-modal-activities" style="max-height:140px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; background:rgba(0,0,0,0.12); padding:10px; border-radius:6px; border:1px solid var(--glass-border);">
          <!-- Rendered dynamically -->
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <input type="text" id="dash-comment-input" class="form-control-noicon" style="padding:5px 10px; font-size:12px;" placeholder="Type progress comment...">
          <button id="dash-comment-btn" class="btn btn-primary" style="padding:5px 12px; font-size:12px;">Comment</button>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--glass-border); padding-top:14px;">
        <button id="dash-modal-delete-btn" class="btn btn-danger" style="padding:6px 14px; font-size:12px;">Delete Task</button>
        <button id="dash-modal-close-btn" class="btn btn-secondary" style="padding:6px 14px; font-size:12px;">Close</button>
      </div>
    </div>
  `;

  app.openModal('Task Details & Progress', modalBodyHTML, '560px');

  const renderSubtasks = () => {
    const listEl = document.getElementById('dash-modal-subtask-list');
    const counterEl = document.getElementById('dash-modal-subtasks-count');
    if (!listEl) return;

    if (!task.subtasks || task.subtasks.length === 0) {
      listEl.innerHTML = '<p class="muted-text" style="font-size:12px; margin:4px 0;">No subtasks configured.</p>';
      if (counterEl) counterEl.textContent = '0%';
      return;
    }

    const doneCount = task.subtasks.filter(s => s.completed).length;
    const totalCount = task.subtasks.length;
    const progressVal = Math.round((doneCount / totalCount) * 100);
    if (counterEl) counterEl.textContent = `${progressVal}% completed (${doneCount}/${totalCount})`;

    listEl.innerHTML = task.subtasks.map((sub, idx) => `
      <label class="subtask-item ${sub.completed ? 'completed' : ''}" style="cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px; padding:4px 0;">
        <input type="checkbox" class="dash-modal-subtask-chk" data-idx="${idx}" ${sub.completed ? 'checked' : ''}>
        <span>${sub.text}</span>
      </label>
    `).join('');

    listEl.querySelectorAll('.dash-modal-subtask-chk').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const idx = parseInt(chk.getAttribute('data-idx'));
        task.subtasks[idx].completed = e.target.checked;
        if (!task.activityLog) task.activityLog = [];
        task.activityLog.push({
          time: new Date().toISOString(),
          user: auth.getCurrentUser()?.username || 'User',
          action: `${e.target.checked ? 'Checked' : 'Unchecked'} checklist item: "${task.subtasks[idx].text}"`
        });

        await db.put('tasks', task);
        await sync.queueOperation('tasks', 'update', task);
        renderSubtasks();
        renderActivities();
        await renderTaskListRows(container, projects);
      });
    });
  };

  const renderActivities = () => {
    const actEl = document.getElementById('dash-modal-activities');
    if (!actEl) return;
    actEl.innerHTML = (task.activityLog || []).map(act => `
      <div style="font-size:11px; display:flex; justify-content:space-between;">
        <span><strong>${act.user}</strong>: ${act.action}</span>
        <span class="muted-text" style="font-size:10px;">${new Date(act.time).toLocaleTimeString()}</span>
      </div>
    `).reverse().join('');
  };

  renderSubtasks();
  renderActivities();

  // Add checklist item
  const addSubtaskInput = document.getElementById('dash-add-subtask-input');
  const addSubtaskBtn = document.getElementById('dash-add-subtask-btn');

  const handleAddSubtask = async () => {
    const txt = addSubtaskInput?.value.trim();
    if (!txt) return;

    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({ text: txt, completed: false });

    if (!task.activityLog) task.activityLog = [];
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
    await renderTaskListRows(container, projects);
  };

  addSubtaskBtn?.addEventListener('click', handleAddSubtask);
  addSubtaskInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddSubtask();
  });

  // Add comment
  const commentInput = document.getElementById('dash-comment-input');
  const commentBtn = document.getElementById('dash-comment-btn');

  const handleAddComment = async () => {
    const txt = commentInput?.value.trim();
    if (!txt) return;

    if (!task.activityLog) task.activityLog = [];
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

  commentBtn?.addEventListener('click', handleAddComment);
  commentInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddComment();
  });

  // Close button
  document.getElementById('dash-modal-close-btn')?.addEventListener('click', () => {
    app.closeModal();
  });

  // Delete button
  document.getElementById('dash-modal-delete-btn')?.addEventListener('click', async () => {
    if (confirm(`Delete task "${task.name}"?`)) {
      await db.delete('tasks', task.id);
      await sync.queueOperation('tasks', 'delete', task.id);
      app.closeModal();
      app.showToast('Task Deleted', `Removed task "${task.name}".`, 'success');
      await renderDashboard(container);
    }
  });
}
