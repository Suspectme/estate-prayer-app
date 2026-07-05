 // ============================================================
// CONFIGURATION
// ============================================================
const API_BASE = 'http://localhost:5000';

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let authToken = localStorage.getItem('estate_token') || null;
let prayerData = [];
let announcementData = null;
let socket = null;

// ============================================================
// DOM REFS
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const authView = $('#authView');
const mainView = $('#mainView');
const userBadge = $('#userBadge');
const logoutBtn = $('#logoutBtn');

const loginForm = $('#loginForm');
const registerForm = $('#registerForm');
const authTabs = $$('.auth-tabs button');
const loginBtn = $('#loginBtn');
const registerBtn = $('#registerBtn');
const authError = $('#authError');
const regError = $('#regError');

const prayerGrid = $('#prayerGrid');
const announcementContainer = $('#announcementContainer');
const adminPanel = $('#adminPanel');
const adminAnnouncement = $('#adminAnnouncement');
const publishAnnouncementBtn = $('#publishAnnouncementBtn');
const announcementMsg = $('#announcementMsg');
const prayerEditContainer = $('#prayerEditContainer');
const prayerEditMsg = $('#prayerEditMsg');
const toastContainer = $('#toastContainer');

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format an ISO date to HH:MM AM/PM
 */
function formatTime(iso) {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Show a toast notification
 */
function showToast(title, body, duration = 5000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-body">${body}</div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, duration);
}

/**
 * Get headers with JWT token
 */
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
    };
}

// ============================================================
// API CALLS
// ============================================================

/**
 * Generic fetch wrapper with auth
 */
async function apiFetch(endpoint, opts = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...opts,
        headers: { ...getHeaders(), ...(opts.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

/**
 * Login user
 */
async function login(email, password) {
    const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    authToken = data.token;
    localStorage.setItem('estate_token', authToken);
    currentUser = data.user;
    return data;
}

/**
 * Register user
 */
async function register(name, email, password, role) {
    const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
    });
    authToken = data.token;
    localStorage.setItem('estate_token', authToken);
    currentUser = data.user;
    return data;
}

/**
 * Get current user profile
 */
async function getMe() {
    const data = await apiFetch('/api/auth/me');
    currentUser = data.user;
    return data;
}

/**
 * Fetch all prayer times
 */
async function fetchPrayerTimes() {
    const data = await apiFetch('/api/prayer');
    prayerData = data.prayers;
    return data;
}

/**
 * Update a single prayer time field
 */
async function updatePrayerTime(prayerId, field, value) {
    const data = await apiFetch(`/api/prayer/${prayerId}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
    });
    prayerData = data.prayers;
    return data;
}

/**
 * Fetch the latest announcement
 */
async function fetchAnnouncement() {
    const data = await apiFetch('/api/announcement/latest');
    announcementData = data.announcement;
    return data;
}

/**
 * Publish a new announcement
 */
async function publishAnnouncement(text) {
    const data = await apiFetch('/api/announcement', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
    announcementData = data.announcement;
    return data;
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

/**
 * Render prayer cards
 */
function renderPrayerTimes() {
    if (!prayerData.length) {
        prayerGrid.innerHTML = `
            <p style="text-align:center;color:var(--text-light);padding:20px 0;">
                Loading prayer times…
            </p>
        `;
        return;
    }

    prayerGrid.innerHTML = prayerData.map(p => `
        <div class="prayer-card" data-id="${p._id}">
            <div class="prayer-name">
                <i class="fas ${p.icon || 'fa-clock'}"></i>
                ${p.name}
            </div>
            <div class="prayer-times">
                <span>
                    <i class="fas fa-clock fa-fw"></i>
                    <span class="time-value">${formatTime(p.prayerTime)}</span>
                </span>
                <span>
                    <i class="fas fa-users fa-fw"></i>
                    <span class="iqama-value">${formatTime(p.iqamaTime)}</span>
                </span>
                <span>
                    <i class="fas fa-phone fa-fw"></i>
                    ${formatTime(p.callingTime)}
                </span>
            </div>
        </div>
    `).join('');

    // If user is admin, render edit rows
    if (currentUser && currentUser.role === 'admin') {
        renderPrayerEditRows();
    }
}

/**
 * Render prayer edit rows (admin only)
 */
function renderPrayerEditRows() {
    if (!prayerData.length) return;

    prayerEditContainer.innerHTML = prayerData.map(p => `
        <div style="background:var(--bg);border-radius:8px;padding:10px 14px;margin-bottom:8px;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-weight:600;font-size:14px;">
                <span style="min-width:70px;">${p.name}</span>
                <span style="font-weight:400;color:var(--text-light);font-size:12px;">Prayer</span>
                <input type="time" class="edit-prayer" data-id="${p._id}" data-field="prayerTime" 
                       value="${p.prayerTime ? new Date(p.prayerTime).toTimeString().slice(0,5) : ''}" />
                <span style="font-weight:400;color:var(--text-light);font-size:12px;">Iqama</span>
                <input type="time" class="edit-prayer" data-id="${p._id}" data-field="iqamaTime" 
                       value="${p.iqamaTime ? new Date(p.iqamaTime).toTimeString().slice(0,5) : ''}" />
                <span style="font-weight:400;color:var(--text-light);font-size:12px;">Call</span>
                <input type="time" class="edit-prayer" data-id="${p._id}" data-field="callingTime" 
                       value="${p.callingTime ? new Date(p.callingTime).toTimeString().slice(0,5) : ''}" />
                <button class="btn-sm save edit-save-btn" data-id="${p._id}">Save</button>
            </div>
        </div>
    `).join('');

    // Attach save events to edit buttons
    prayerEditContainer.querySelectorAll('.edit-save-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.dataset.id;
            const row = btn.closest('div');
            const inputs = row.querySelectorAll('.edit-prayer');
            const updates = {};

            inputs.forEach(inp => {
                const field = inp.dataset.field;
                const val = inp.value;
                if (val) {
                    const [h, m] = val.split(':');
                    const d = new Date();
                    d.setHours(parseInt(h), parseInt(m), 0, 0);
                    updates[field] = d.toISOString();
                }
            });

            try {
                btn.textContent = 'Saving…';
                btn.disabled = true;
                for (const [field, value] of Object.entries(updates)) {
                    await updatePrayerTime(id, field, value);
                }
                await fetchPrayerTimes();
                renderPrayerTimes();
                prayerEditMsg.textContent = '✅ Prayer times updated!';
                prayerEditMsg.className = 'admin-msg success';
                showToast('Prayer Times', 'Updated successfully');
            } catch (err) {
                prayerEditMsg.textContent = '❌ ' + err.message;
                prayerEditMsg.className = 'admin-msg error';
            } finally {
                btn.textContent = 'Save';
                btn.disabled = false;
            }
        });
    });
}

/**
 * Render announcement
 */
function renderAnnouncement() {
    if (announcementData && announcementData.text) {
        const date = new Date(announcementData.createdAt);
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        announcementContainer.innerHTML = `
            <div class="announcement-box">
                <div class="announcement-label">
                    <i class="fas fa-bullhorn"></i> 📢 Announcement
                </div>
                <div class="announcement-text">${announcementData.text}</div>
                <div class="announcement-date">${dateStr}</div>
            </div>
        `;
    } else {
        announcementContainer.innerHTML = `
            <div class="no-announcement">
                <i class="fas fa-info-circle"></i> No announcement for today.
            </div>
        `;
    }
}

/**
 * Render the entire UI
 */
function renderUI() {
    renderPrayerTimes();
    renderAnnouncement();

    // Show/hide admin panel based on role
    if (currentUser && currentUser.role === 'admin') {
        adminPanel.classList.remove('hidden');
        if (announcementData && announcementData.text) {
            adminAnnouncement.value = announcementData.text;
        } else {
            adminAnnouncement.value = '';
        }
    } else {
        adminPanel.classList.add('hidden');
    }

    // Update user badge
    if (currentUser) {
        userBadge.textContent = currentUser.name + (currentUser.role === 'admin' ? ' ⭐' : '');
    } else {
        userBadge.textContent = 'Guest';
    }
}

// ============================================================
// SOCKET.IO (Real-time updates)
// ============================================================

function initSocket() {
    if (socket) return;

    try {
        socket = io(API_BASE, {
            transports: ['polling', 'websocket'],
            withCredentials: true,
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
            if (authToken) {
                socket.emit('authenticate', authToken);
            }
        });

        socket.on('prayer-updated', (data) => {
            console.log('📢 prayer-updated', data);
            showToast(
                '🕌 Prayer Time Changed',
                `${data.prayerName} updated to ${formatTime(data.newTime)}`
            );
            fetchPrayerTimes().then(() => renderPrayerTimes());
        });

        socket.on('announcement-published', (data) => {
            console.log('📢 announcement-published', data);
            showToast('📢 New Announcement', data.text);
            fetchAnnouncement().then(() => renderAnnouncement());
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });
    } catch (e) {
        console.warn('Socket.io not available — falling back to polling.');
    }
}

// ============================================================
// AUTH HANDLERS
// ============================================================

async function handleLogin() {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value.trim();

    if (!email || !password) {
        authError.textContent = 'Please fill in all fields.';
        return;
    }

    authError.textContent = '';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
        await login(email, password);
        afterAuthSuccess();
    } catch (err) {
        authError.textContent = err.message || 'Login failed.';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

async function handleRegister() {
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value.trim();
    const role = $('#regRole').value;

    if (!name || !email || !password) {
        regError.textContent = 'Please fill in all fields.';
        return;
    }

    regError.textContent = '';
    registerBtn.disabled = true;
    registerBtn.textContent = 'Creating...';

    try {
        await register(name, email, password, role);
        afterAuthSuccess();
    } catch (err) {
        regError.textContent = err.message || 'Registration failed.';
        registerBtn.disabled = false;
        registerBtn.textContent = 'Create Account';
    }
}

function afterAuthSuccess() {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
    registerBtn.disabled = false;
    registerBtn.textContent = 'Create Account';

    authView.classList.add('hidden');
    mainView.classList.remove('hidden');

    Promise.all([fetchPrayerTimes(), fetchAnnouncement()])
        .then(() => {
            renderUI();
            initSocket();
        })
        .catch(err => {
            console.error('Failed to load data:', err);
            renderUI();
        });
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('estate_token');
    currentUser = null;
    prayerData = [];
    announcementData = null;

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    authView.classList.remove('hidden');
    mainView.classList.add('hidden');
    renderUI();
    showToast('👋 Logged out', 'See you soon!');
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Auth tab switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        if (target === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }

        authError.textContent = '';
        regError.textContent = '';
    });
});

// Login / Register buttons
loginBtn.addEventListener('click', handleLogin);
registerBtn.addEventListener('click', handleRegister);

// Enter key support
$('#loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
});
$('#regPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
});

// Logout
logoutBtn.addEventListener('click', handleLogout);

// Publish announcement (admin only)
publishAnnouncementBtn.addEventListener('click', async () => {
    const text = adminAnnouncement.value.trim();

    if (!text) {
        announcementMsg.textContent = 'Please write an announcement.';
        announcementMsg.className = 'admin-msg error';
        return;
    }

    announcementMsg.textContent = 'Publishing…';
    announcementMsg.className = 'admin-msg';

    try {
        await publishAnnouncement(text);
        announcementMsg.textContent = '✅ Announcement published!';
        announcementMsg.className = 'admin-msg success';
        await fetchAnnouncement();
        renderAnnouncement();
        showToast('📢 Announcement', 'Published successfully');
    } catch (err) {
        announcementMsg.textContent = '❌ ' + err.message;
        announcementMsg.className = 'admin-msg error';
    }
});

// ============================================================
// INITIALIZATION
// ============================================================

async function initApp() {
    // Check if we have a saved token
    if (authToken) {
        try {
            await getMe();
            await Promise.all([fetchPrayerTimes(), fetchAnnouncement()]);
            authView.classList.add('hidden');
            mainView.classList.remove('hidden');
            renderUI();
            initSocket();
        } catch (err) {
            // Token is invalid
            console.warn('Token invalid, clearing…');
            authToken = null;
            localStorage.removeItem('estate_token');
            currentUser = null;
            authView.classList.remove('hidden');
            mainView.classList.add('hidden');
            renderUI();
        }
    } else {
        // No token — show auth view
        authView.classList.remove('hidden');
        mainView.classList.add('hidden');
        renderUI();
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);