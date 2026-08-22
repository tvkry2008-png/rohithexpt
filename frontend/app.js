/* ==========================================================================
   MUNICIPAL CITIZEN SERVICE REQUEST & GRIEVANCE MANAGEMENT PLATFORM
   Frontend Dynamic Logic & API Integration
   ========================================================================== */

// Base API URL configuration (auto-detects Docker proxy or direct local API)
const API_BASE = window.location.origin.includes(':8085') || window.location.origin.includes(':8080') || window.location.origin.includes(':80') 
  ? '/api' 
  : 'http://localhost:5000/api';

// Application State
let state = {
  currentRole: 'citizen', // 'citizen' | 'admin'
  currentTab: 'grievances',
  grievances: [],
  departments: [],
  stats: null,
  filters: {
    search: '',
    category: 'ALL',
    status: 'ALL',
    priority: 'ALL'
  }
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  await fetchDepartments();
  await fetchGrievances();
  await fetchStats();
  renderDepartmentsFilter();
}

// -------------------------------------------------------------
// API FETCH OPERATIONS
// -------------------------------------------------------------

async function fetchDepartments() {
  try {
    const res = await fetch(`${API_BASE}/departments`);
    if (res.ok) {
      state.departments = await res.json();
      renderDepartmentsTab();
    }
  } catch (err) {
    console.error('Failed to load departments:', err);
  }
}

async function fetchGrievances() {
  try {
    const query = new URLSearchParams();
    if (state.filters.search) query.append('search', state.filters.search);
    if (state.filters.category !== 'ALL') query.append('category', state.filters.category);
    if (state.filters.status !== 'ALL') query.append('status', state.filters.status);
    if (state.filters.priority !== 'ALL') query.append('priority', state.filters.priority);

    const res = await fetch(`${API_BASE}/grievances?${query.toString()}`);
    if (res.ok) {
      state.grievances = await res.json();
      renderGrievances();
      renderAdminTable();
    }
  } catch (err) {
    console.error('Failed to fetch grievances:', err);
    showToast('Unable to connect to backend server', 'danger');
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) {
      state.stats = await res.json();
      renderStats();
      renderAnalytics();
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// -------------------------------------------------------------
// RENDERING FUNCTIONS
// -------------------------------------------------------------

function renderStats() {
  if (!state.stats) return;
  const s = state.stats.summary;
  document.getElementById('statTotal').innerText = s.total;
  document.getElementById('statRate').innerText = s.resolutionRate;
  document.getElementById('statActive').innerText = s.inProgress + s.assigned + s.underReview;
  document.getElementById('statCritical').innerText = s.critical;
}

function renderDepartmentsFilter() {
  const select = document.getElementById('filterDept');
  select.innerHTML = '<option value="ALL">All Departments</option>';
  state.departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    select.appendChild(opt);
  });
}

function renderGrievances() {
  const container = document.getElementById('grievanceGrid');
  if (!container) return;

  if (state.grievances.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-dim); margin-bottom: 1rem;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <h4 style="font-size: 1.1rem; margin-bottom: 0.5rem;">No Service Requests Found</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Try adjusting your filter search options or lodge a new service request.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.grievances.map(g => {
    const badgeClass = getBadgeClass(g.status);
    const dateFormatted = new Date(g.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="grievance-card">
        <div class="card-top">
          <span class="ticket-id">${g.id}</span>
          <span class="badge ${badgeClass}">${g.status}</span>
        </div>

        <div>
          <div style="margin-bottom: 0.4rem;">
            <span class="priority-tag priority-${g.priority}">${g.priority} Priority</span>
            <span style="font-size: 0.75rem; color: var(--text-dim); margin-left: 0.5rem;">${g.departmentName}</span>
          </div>
          <h3 class="card-title">${escapeHTML(g.title)}</h3>
          <p class="card-desc" style="margin-top: 0.4rem;">${escapeHTML(g.description)}</p>
        </div>

        <div class="card-meta">
          <div class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(g.location)}</span>
          </div>
          <div class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>${dateFormatted}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-secondary" onclick="viewGrievanceDetails('${g.id}')">View Details & Timeline</button>
          ${state.currentRole === 'admin' ? `
            <button class="btn-primary" style="padding: 0.45rem 0.85rem; font-size: 0.8rem;" onclick="openAdminModal('${g.id}')">Manage</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderDepartmentsTab() {
  const container = document.getElementById('deptGrid');
  if (!container) return;

  container.innerHTML = state.departments.map(d => `
    <div class="dept-card">
      <div class="dept-header">
        <div class="dept-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
        <div>
          <h4 style="font-size: 1.1rem; font-weight: 700;">${d.name}</h4>
          <p style="font-size: 0.78rem; color: var(--text-dim);">Head: ${d.head}</p>
        </div>
      </div>

      <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.4rem;">
        <div><strong>Email:</strong> ${d.email}</div>
        <div><strong>Helpline:</strong> ${d.phone}</div>
        <div><strong>Standard Resolution SLA:</strong> <span style="color: var(--primary-accent);">${d.slaHours} Hours</span></div>
      </div>

      <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-glass); padding-top: 0.75rem; font-size: 0.82rem;">
        <span>Active Workload: <strong>${d.activeTickets}</strong></span>
        <span>Resolved: <strong style="color: var(--success);">${d.resolvedThisMonth}</strong></span>
      </div>
    </div>
  `).join('');
}

function renderAnalytics() {
  if (!state.stats) return;

  // Department analytics list
  const deptList = document.getElementById('deptAnalyticsList');
  if (deptList && state.stats.departmentBreakdown) {
    const maxTotal = Math.max(...state.stats.departmentBreakdown.map(d => d.total), 1);
    deptList.innerHTML = state.stats.departmentBreakdown.map(d => {
      const pct = Math.round((d.total / maxTotal) * 100);
      return `
        <div class="bar-item">
          <div class="bar-label">
            <span>${d.name}</span>
            <span>${d.resolved} / ${d.total} Tickets</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Priority analytics list
  const priorityList = document.getElementById('priorityAnalyticsList');
  if (priorityList && state.stats.priorityBreakdown) {
    const pb = state.stats.priorityBreakdown;
    const totalP = (pb.Critical + pb.High + pb.Medium + pb.Low) || 1;

    priorityList.innerHTML = Object.keys(pb).map(priority => {
      const count = pb[priority];
      const pct = Math.round((count / totalP) * 100);
      return `
        <div class="bar-item">
          <div class="bar-label">
            <span>${priority} Urgency</span>
            <span>${count} (${pct}%)</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderAdminTable() {
  const container = document.getElementById('adminTableContainer');
  if (!container) return;

  if (state.grievances.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No grievances available for management.</p>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border-glass); color: var(--text-muted);">
          <th style="padding: 0.75rem;">Ticket ID</th>
          <th style="padding: 0.75rem;">Title & Location</th>
          <th style="padding: 0.75rem;">Department</th>
          <th style="padding: 0.75rem;">Priority</th>
          <th style="padding: 0.75rem;">Status</th>
          <th style="padding: 0.75rem;">Assigned Officer</th>
          <th style="padding: 0.75rem;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${state.grievances.map(g => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 0.75rem; font-family: monospace; font-weight: 700; color: var(--primary-accent);">${g.id}</td>
            <td style="padding: 0.75rem;">
              <div style="font-weight: 600; color: var(--text-main);">${escapeHTML(g.title)}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHTML(g.location)}</div>
            </td>
            <td style="padding: 0.75rem;">${g.departmentName}</td>
            <td style="padding: 0.75rem;"><span class="priority-tag priority-${g.priority}">${g.priority}</span></td>
            <td style="padding: 0.75rem;"><span class="badge ${getBadgeClass(g.status)}">${g.status}</span></td>
            <td style="padding: 0.75rem; color: var(--text-muted);">${g.assignedOfficer || 'Unassigned'}</td>
            <td style="padding: 0.75rem;">
              <button class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="openAdminModal('${g.id}')">Update</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// EVENT HANDLERS & MODAL CONTROL
// -------------------------------------------------------------

function switchTab(tabName, btnElement) {
  state.currentTab = tabName;
  
  // Update Tab Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  // Hide all views
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');

  // Show selected view
  const target = document.getElementById(`tab${capitalize(tabName)}`);
  if (target) target.style.display = 'block';

  // Toolbar visibility
  const toolbar = document.getElementById('toolbarSection');
  if (toolbar) {
    toolbar.style.display = (tabName === 'grievances' || tabName === 'admin') ? 'flex' : 'none';
  }
}

function switchRole(role) {
  state.currentRole = role;
  const citizenBtn = document.getElementById('btnCitizenRole');
  const adminBtn = document.getElementById('btnAdminRole');
  const adminTabBtn = document.getElementById('adminTabBtn');

  if (role === 'admin') {
    citizenBtn.classList.remove('active');
    adminBtn.classList.add('active');
    adminTabBtn.style.display = 'flex';
    showToast('Switched to Municipal Officer / Admin Mode', 'info');
  } else {
    adminBtn.classList.remove('active');
    citizenBtn.classList.add('active');
    adminTabBtn.style.display = 'none';
    if (state.currentTab === 'admin') switchTab('grievances', document.querySelector('.tab-btn'));
    showToast('Switched to Citizen View Mode', 'info');
  }

  renderGrievances();
}

function openSubmitModal() {
  document.getElementById('submitModal').classList.add('active');
}

function closeSubmitModal() {
  document.getElementById('submitModal').classList.remove('active');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const categorySelect = document.getElementById('formCategory');
  const deptName = categorySelect.options[categorySelect.selectedIndex].text;

  const payload = {
    title: document.getElementById('formTitle').value,
    category: categorySelect.value,
    departmentName: deptName,
    priority: document.getElementById('formPriority').value,
    location: document.getElementById('formLocation').value,
    description: document.getElementById('formDescription').value,
    citizenName: document.getElementById('formCitizenName').value,
    citizenPhone: document.getElementById('formCitizenPhone').value,
    citizenEmail: document.getElementById('formCitizenEmail').value,
    imageUrl: document.getElementById('formImageUrl').value
  };

  try {
    const res = await fetch(`${API_BASE}/grievances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      closeSubmitModal();
      document.getElementById('grievanceForm').reset();
      showToast(`Grievance Lodged! Ticket ID: ${data.ticketId}`, 'success');
      
      await fetchGrievances();
      await fetchStats();
    } else {
      showToast('Error submitting grievance. Check inputs.', 'danger');
    }
  } catch (err) {
    console.error('Error submitting form:', err);
    showToast('Network error occurred while submitting.', 'danger');
  }
}

async function viewGrievanceDetails(ticketId) {
  try {
    const res = await fetch(`${API_BASE}/grievances/${ticketId}`);
    if (res.ok) {
      const g = await res.json();
      
      document.getElementById('detailTicketId').innerText = g.id;
      document.getElementById('detailTitle').innerText = g.title;

      const body = document.getElementById('detailsBody');
      const timelineHtml = (g.timeline || []).map(t => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-title">${t.status} - <span style="font-weight: normal; color: var(--text-dim);">${t.updatedBy}</span></div>
          <div class="timeline-time">${new Date(t.timestamp).toLocaleString()}</div>
          <div class="timeline-note">${escapeHTML(t.note)}</div>
        </div>
      `).join('');

      body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <span class="badge ${getBadgeClass(g.status)}">${g.status}</span>
          <span class="priority-tag priority-${g.priority}">${g.priority} Priority</span>
        </div>

        ${g.imageUrl ? `<img src="${g.imageUrl}" style="width: 100%; height: 220px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1rem;" alt="Site Photo">` : ''}

        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 0.3rem;">DEPARTMENT</div>
          <div style="font-weight: 700; color: var(--primary-accent); margin-bottom: 0.75rem;">${g.departmentName}</div>

          <div style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 0.3rem;">LOCATION</div>
          <div style="color: var(--text-main); margin-bottom: 0.75rem;">📍 ${escapeHTML(g.location)}</div>

          <div style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 0.3rem;">DESCRIPTION</div>
          <div style="color: var(--text-muted); font-size: 0.9rem;">${escapeHTML(g.description)}</div>
        </div>

        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 0.3rem;">ASSIGNED OFFICER / CREW</div>
          <div style="font-weight: 600; color: var(--text-main);">${g.assignedOfficer || 'Pending Officer Dispatch'}</div>
        </div>

        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; margin-top: 1.5rem;">Resolution Progress Timeline</h4>
        <div class="timeline">
          ${timelineHtml}
        </div>
      `;

      document.getElementById('detailsModal').classList.add('active');
    }
  } catch (err) {
    console.error('Error fetching details:', err);
  }
}

function closeDetailsModal() {
  document.getElementById('detailsModal').classList.remove('active');
}

function openAdminModal(ticketId) {
  const g = state.grievances.find(item => item.id === ticketId);
  if (!g) return;

  document.getElementById('adminTicketId').value = g.id;
  document.getElementById('adminTicketDisplayId').value = `${g.id} - ${g.title}`;
  document.getElementById('adminStatus').value = g.status;
  document.getElementById('adminPriority').value = g.priority;
  document.getElementById('adminOfficer').value = g.assignedOfficer || '';
  document.getElementById('adminNote').value = '';

  document.getElementById('adminModal').classList.add('active');
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('active');
}

async function handleAdminUpdate(e) {
  e.preventDefault();

  const ticketId = document.getElementById('adminTicketId').value;
  const payload = {
    status: document.getElementById('adminStatus').value,
    priority: document.getElementById('adminPriority').value,
    assignedOfficer: document.getElementById('adminOfficer').value,
    note: document.getElementById('adminNote').value,
    updatedBy: 'Municipal Dispatch Officer'
  };

  try {
    const res = await fetch(`${API_BASE}/grievances/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeAdminModal();
      showToast(`Ticket ${ticketId} updated successfully`, 'success');
      await fetchGrievances();
      await fetchStats();
    } else {
      showToast('Failed to update ticket status', 'danger');
    }
  } catch (err) {
    console.error('Failed admin update:', err);
    showToast('Network error during admin update', 'danger');
  }
}

async function trackTicketByCode() {
  const code = document.getElementById('trackerInput').value.trim();
  if (!code) {
    showToast('Please enter a ticket code', 'warning');
    return;
  }

  viewGrievanceDetails(code);
}

// Search & Filter Handlers
function handleSearch() {
  state.filters.search = document.getElementById('searchInput').value.trim();
  fetchGrievances();
}

function applyFilters() {
  state.filters.category = document.getElementById('filterDept').value;
  state.filters.status = document.getElementById('filterStatus').value;
  state.filters.priority = document.getElementById('filterPriority').value;
  fetchGrievances();
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'success') toast.style.borderLeftColor = 'var(--success)';
  if (type === 'danger') toast.style.borderLeftColor = 'var(--danger)';
  if (type === 'warning') toast.style.borderLeftColor = 'var(--warning)';

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Helpers
function getBadgeClass(status) {
  switch (status) {
    case 'Submitted': return 'badge-submitted';
    case 'Under Review': return 'badge-review';
    case 'Assigned': return 'badge-assigned';
    case 'In Progress': return 'badge-progress';
    case 'Resolved': return 'badge-resolved';
    case 'Rejected': return 'badge-rejected';
    default: return 'badge-submitted';
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
