const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const DATA_DIR = path.join(__dirname, 'data');
const GRIEVANCES_FILE = path.join(DATA_DIR, 'grievances.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Utility functions for File I/O
function readJSONFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJSONFile(filePath, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Ensure default files exist if empty
if (!fs.existsSync(GRIEVANCES_FILE)) {
  writeJSONFile(GRIEVANCES_FILE, []);
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Municipal Grievance Management API',
    timestamp: new Date().toISOString()
  });
});

// GET Departments
app.get('/api/departments', (req, res) => {
  const departments = readJSONFile(DEPARTMENTS_FILE);
  res.json(departments);
});

// GET Grievances (with filters & search)
app.get('/api/grievances', (req, res) => {
  let grievances = readJSONFile(GRIEVANCES_FILE);
  const { search, category, status, priority } = req.query;

  if (category && category !== 'ALL') {
    grievances = grievances.filter(g => g.category === category);
  }

  if (status && status !== 'ALL') {
    grievances = grievances.filter(g => g.status === status);
  }

  if (priority && priority !== 'ALL') {
    grievances = grievances.filter(g => g.priority === priority);
  }

  if (search) {
    const q = search.toLowerCase();
    grievances = grievances.filter(g =>
      g.id.toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.location.toLowerCase().includes(q) ||
      (g.citizenName && g.citizenName.toLowerCase().includes(q))
    );
  }

  // Sort by newest first
  grievances.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  res.json(grievances);
});

// GET Single Grievance by ID
app.get('/api/grievances/:id', (req, res) => {
  const grievances = readJSONFile(GRIEVANCES_FILE);
  const grievance = grievances.find(g => g.id.toUpperCase() === req.params.id.toUpperCase());

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance ticket not found' });
  }

  res.json(grievance);
});

// POST Create Grievance
app.post('/api/grievances', (req, res) => {
  const { title, category, departmentName, description, location, priority, citizenName, citizenPhone, citizenEmail, imageUrl } = req.body;

  if (!title || !category || !description || !location) {
    return res.status(400).json({ error: 'Missing required fields: title, category, description, location' });
  }

  const grievances = readJSONFile(GRIEVANCES_FILE);
  
  // Generate random tracking ID
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newId = `GRV-2026-${randomNum}`;
  const now = new Date().toISOString();

  const newGrievance = {
    id: newId,
    title: title.trim(),
    category,
    departmentName: departmentName || 'General Municipal Services',
    description: description.trim(),
    location: location.trim(),
    coordinates: req.body.coordinates || { lat: 40.7128 + (Math.random() - 0.5) * 0.1, lng: -74.0060 + (Math.random() - 0.5) * 0.1 },
    priority: priority || 'Medium',
    status: 'Submitted',
    citizenName: citizenName ? citizenName.trim() : 'Anonymous Citizen',
    citizenPhone: citizenPhone ? citizenPhone.trim() : 'N/A',
    citizenEmail: citizenEmail ? citizenEmail.trim() : 'N/A',
    submittedAt: now,
    updatedAt: now,
    assignedOfficer: 'Pending Dispatch',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?w=600&auto=format&fit=crop&q=60',
    timeline: [
      {
        status: 'Submitted',
        timestamp: now,
        note: 'Citizen service request registered in municipal portal.',
        updatedBy: citizenName ? `Citizen (${citizenName})` : 'Citizen'
      }
    ]
  };

  grievances.unshift(newGrievance);
  writeJSONFile(GRIEVANCES_FILE, grievances);

  res.status(201).json({
    message: 'Grievance request submitted successfully',
    ticketId: newId,
    grievance: newGrievance
  });
});

// PATCH Update Grievance Status / Notes (Admin API)
app.patch('/api/grievances/:id', (req, res) => {
  const grievances = readJSONFile(GRIEVANCES_FILE);
  const index = grievances.findIndex(g => g.id.toUpperCase() === req.params.id.toUpperCase());

  if (index === -1) {
    return res.status(404).json({ error: 'Grievance ticket not found' });
  }

  const g = grievances[index];
  const { status, priority, assignedOfficer, note, updatedBy, rating, comment } = req.body;
  const now = new Date().toISOString();

  let changed = false;

  if (status && status !== g.status) {
    g.status = status;
    changed = true;
  }

  if (priority && priority !== g.priority) {
    g.priority = priority;
    changed = true;
  }

  if (assignedOfficer && assignedOfficer !== g.assignedOfficer) {
    g.assignedOfficer = assignedOfficer;
    changed = true;
  }

  if (rating !== undefined) {
    g.feedbackRating = rating;
    g.feedbackComment = comment || '';
    changed = true;
  }

  if (changed || note) {
    g.updatedAt = now;
    if (!g.timeline) g.timeline = [];

    g.timeline.push({
      status: g.status,
      timestamp: now,
      note: note || `Status updated to ${g.status}${assignedOfficer ? ` (Assigned to ${assignedOfficer})` : ''}`,
      updatedBy: updatedBy || 'Municipal Official'
    });
  }

  grievances[index] = g;
  writeJSONFile(GRIEVANCES_FILE, grievances);

  res.json({
    message: 'Grievance ticket updated successfully',
    grievance: g
  });
});

// GET Analytics Stats
app.get('/api/stats', (req, res) => {
  const grievances = readJSONFile(GRIEVANCES_FILE);
  const departments = readJSONFile(DEPARTMENTS_FILE);

  const total = grievances.length;
  const resolved = grievances.filter(g => g.status === 'Resolved').length;
  const inProgress = grievances.filter(g => g.status === 'In Progress').length;
  const assigned = grievances.filter(g => g.status === 'Assigned').length;
  const underReview = grievances.filter(g => g.status === 'Under Review').length;
  const submitted = grievances.filter(g => g.status === 'Submitted').length;
  const critical = grievances.filter(g => g.priority === 'Critical').length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Breakdown by department
  const departmentBreakdown = departments.map(d => {
    const deptGrievances = grievances.filter(g => g.category === d.id);
    const resolvedDept = deptGrievances.filter(g => g.status === 'Resolved').length;
    return {
      id: d.id,
      name: d.name,
      total: deptGrievances.length,
      resolved: resolvedDept,
      pending: deptGrievances.length - resolvedDept
    };
  });

  // Priority breakdown
  const priorityBreakdown = {
    Critical: grievances.filter(g => g.priority === 'Critical').length,
    High: grievances.filter(g => g.priority === 'High').length,
    Medium: grievances.filter(g => g.priority === 'Medium').length,
    Low: grievances.filter(g => g.priority === 'Low').length
  };

  res.json({
    summary: {
      total,
      resolved,
      inProgress,
      assigned,
      underReview,
      submitted,
      critical,
      resolutionRate: `${resolutionRate}%`,
      avgResolutionSLAHours: 18.4
    },
    departmentBreakdown,
    priorityBreakdown
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Municipal Grievance Backend Service running on port ${PORT}`);
});
