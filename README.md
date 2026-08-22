# Municipal Citizen Service Request & Grievance Management Platform

A containerized, full-stack municipal web application designed for citizens to lodge service requests and grievances, and for municipal officials to manage field crew assignments, track SLAs, and update ticket statuses in real time.

---

## 🏗️ Architecture & Folder Structure

```
├── backend/
│   ├── data/
│   │   ├── departments.json     # Reference list of municipal departments & contact info
│   │   └── grievances.json      # Persistent JSON data store for citizen complaints
│   ├── Dockerfile               # Node.js 20-Alpine Docker configuration
│   ├── package.json             # Express server dependencies
│   └── server.js                # Express REST API routes, search filters & stats engine
│
├── frontend/
│   ├── app.js                   # Client controller, API fetch calls, role switcher & tabs
│   ├── Dockerfile               # Nginx Alpine web server image configuration
│   ├── index.html               # SPA Layout, grievance forms, tracking drawer & analytics
│   ├── nginx.conf               # Nginx reverse proxy configuration (/api/ -> backend:5000)
│   └── styles.css               # Glassmorphism dark theme, animations & CSS design system
│
└── docker-compose.yml           # Multi-container orchestrator connecting frontend & backend
```

---

## 🚀 Key Features

1. **Citizen Portal**:
   - **Lodge Grievance**: Interactive modal form to register service requests across departments (Water, Power, Sanitation, Roads, Parks, Safety) with category tag, location landmark, urgency priority, and photo attachments.
   - **Live Ticket Tracker**: Search by ticket ID (e.g. `GRV-2026-1001`) to view timeline progression (`Submitted` → `Under Review` → `Assigned` → `In Progress` → `Resolved`).
   - **Multi-Criteria Search & Filter**: Filter grievances by department, status, priority, or instant keyword search.

2. **Municipal Officer & Admin Control Panel**:
   - **Role Switcher**: Live toggle between Citizen View and Admin Officer Mode.
   - **Officer Management Table**: Inspect all tickets, assign field crews/officers, update priority levels, append official notes, and mark resolutions.

3. **Analytics & SLA Dashboard**:
   - Real-time metrics bar (Total Complaints, Resolution Rate %, In-Progress, Critical Escalations).
   - Department workload bar charts and priority distribution statistics.

---

## 🐳 Docker Deployment & Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### Run with Docker Compose

1. **Build and Start Services**:
   ```bash
   docker-compose up --build -d
   ```

2. **Access Applications**:
   - **Frontend App**: [http://localhost:8085](http://localhost:8085)
   - **Backend REST API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

3. **Check Container Status**:
   ```bash
   docker-compose ps
   ```

4. **Stop Services**:
   ```bash
   docker-compose down
   ```

---

## 🛠️ Local Development (Without Docker)

### Run Backend:
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000`*

### Run Frontend:
Simply open `frontend/index.html` in your web browser or serve via static file server (e.g., Live Server or `npx serve frontend`).

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/departments` | Fetch municipal department list |
| `GET` | `/api/grievances` | Fetch list of grievances (supports `search`, `category`, `status`, `priority`) |
| `GET` | `/api/grievances/:id` | Fetch single grievance details & timeline |
| `POST` | `/api/grievances` | Lodge a new grievance request |
| `PATCH` | `/api/grievances/:id` | Update status, assigned officer, or add timeline note (Admin API) |
| `GET` | `/api/stats` | Fetch real-time analytics and resolution statistics |
