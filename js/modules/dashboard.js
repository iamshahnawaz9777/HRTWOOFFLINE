/* ==========================================================================
   AeroGlass ERP Dashboard Module
   ========================================================================== */

import { db } from '../db.js';
import { auth } from '../auth.js';

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
  
  const todayStr = '2026-05-26'; // Mock constant system date
  const todayAttendance = attendance.filter(att => att.date === todayStr);
  const totalEmpCount = employees.length;
  const attendancePercent = totalEmpCount > 0 
    ? Math.round((todayAttendance.length / totalEmpCount) * 100) 
    : 0;

  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
  const pendingGatePassCount = gatepasses.filter(gp => gp.status === 'Pending').length;

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
      text: `Gate Pass <strong>${gp.gatePassNo}</strong> for <strong>${gp.person.name}</strong> status shifted to <strong>${gp.status}</strong>`,
      time: `${gp.date}T10:00:00Z`
    });
  });

  // Sort activities chronologically
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  const topActivities = activities.slice(0, 7);

  // 3. Render HTML structure
  container.innerHTML = `
    <!-- KPI Row -->
    <div class="dashboard-grid">
      <div class="glass-card kpi-card blue">
        <div class="kpi-icon">
          <i data-lucide="folder-kanban"></i>
        </div>
        <div class="kpi-info">
          <h3>Active Projects</h3>
          <div class="kpi-value">${activeProjCount}</div>
          <p>Running customer sites</p>
        </div>
      </div>

      <div class="glass-card kpi-card purple">
        <div class="kpi-icon">
          <i data-lucide="user-check"></i>
        </div>
        <div class="kpi-info">
          <h3>HR Attendance</h3>
          <div class="kpi-value">${attendancePercent}%</div>
          <p>${todayAttendance.length} / ${totalEmpCount} checked-in today</p>
        </div>
      </div>

      <div class="glass-card kpi-card green">
        <div class="kpi-icon">
          <i data-lucide="alert-circle"></i>
        </div>
        <div class="kpi-info">
          <h3>Low Stock Alerts</h3>
          <div class="kpi-value danger-text">${lowStockCount}</div>
          <p>Items below minimum</p>
        </div>
      </div>

      <div class="glass-card kpi-card orange">
        <div class="kpi-icon">
          <i data-lucide="ticket"></i>
        </div>
        <div class="kpi-info">
          <h3>Pending Gate Pass</h3>
          <div class="kpi-value">${pendingGatePassCount}</div>
          <p>Requires manager signoff</p>
        </div>
      </div>
    </div>

    <!-- Alert Bar for Low Stock items -->
    ${lowStockCount > 0 ? `
      <div class="alert-bar">
        <i data-lucide="alert-triangle"></i>
        <span>Critical: ${lowStockCount} inventory items have fallen below their minimum stock safety threshold! Check the Inventory Store module to log Stock Inward receipts.</span>
      </div>
    ` : ''}

    <!-- Double Column Main Section -->
    <div class="dashboard-sections">
      <!-- Column 1: Projects Progress & Pending Items -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Active Projects List -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Active Project Milestones</h3>
            <a href="#projects" class="primary-text" style="font-size:12px; font-weight:600; text-decoration:none;">Manage Tasks</a>
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
            `).join('') : '<p class="muted-text text-center">No active projects found.</p>'}
          </div>
        </div>

        <!-- Pending Actions Table -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <h3>Gate Passes Awaiting Authorization</h3>
            <a href="#gatepass" class="primary-text" style="font-size:12px; font-weight:600; text-decoration:none;">View Gate Passes</a>
          </div>
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Pass Number</th>
                  <th>Responsible Person</th>
                  <th>Vehicle Number</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${gatepasses.filter(gp => gp.status === 'Pending').length > 0 ? gatepasses.filter(gp => gp.status === 'Pending').map(gp => `
                  <tr>
                    <td><strong>${gp.gatePassNo}</strong></td>
                    <td>${gp.person.name} (${gp.person.designation})</td>
                    <td><code>${gp.vehicle.vehicleNo}</code></td>
                    <td><span class="badge warning">Pending Approval</span></td>
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
        <!-- Recent Activities Feed -->
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
              <span style="font-size:12px;">Task Kanban</span>
            </a>
            <a href="#inventory" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="package-plus" style="width:24px; height:24px; color:var(--success);"></i>
              <span style="font-size:12px;">Inward stock</span>
            </a>
            <a href="#gatepass" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="ticket" style="width:24px; height:24px; color:var(--warning);"></i>
              <span style="font-size:12px;">Issue Pass</span>
            </a>
            <a href="#hr" class="btn btn-secondary" style="flex-direction:column; padding:16px; gap:8px;">
              <i data-lucide="user-plus" style="width:24px; height:24px; color:var(--accent-color);"></i>
              <span style="font-size:12px;">Attendance Log</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}
