/**
 * Wellness Reminders UI Integration
 * 
 * Handles UI interactions for the wellness reminder system
 * Requirements: 2.3, 4.6
 */

// ─── WELLNESS REMINDERS ───────────────────────
let wellnessReminderSystem = null;

function initializeWellnessReminders() {
  try {
    // Initialize with mock Kiro hooks (replace with actual hooks when available)
    const mockKiroHooks = {
      sendNotification: async (notification) => {
        console.log('Kiro notification:', notification);
        // Fallback to browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      }
    };

    wellnessReminderSystem = new WellnessReminderSystem(mockKiroHooks);
    wellnessReminderSystem.startReminderChecking();
    
    // Render existing reminders
    renderReminderList();
    
    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
    
    console.log('Wellness reminder system ready');
  } catch (error) {
    console.error('Failed to initialize wellness reminders:', error);
  }
}

function openReminderModal() {
  document.getElementById('reminder-modal').classList.add('open');
  document.getElementById('reminder-activity').value = '';
  document.getElementById('reminder-time').value = '09:00';
  document.getElementById('reminder-frequency').value = 'daily';
}

function closeReminderModal() {
  document.getElementById('reminder-modal').classList.remove('open');
}

function saveReminder() {
  const activity = document.getElementById('reminder-activity').value.trim();
  const time = document.getElementById('reminder-time').value;
  const frequency = document.getElementById('reminder-frequency').value;

  if (!activity) {
    alert('Please enter an activity name');
    return;
  }

  if (!wellnessReminderSystem) {
    alert('Reminder system not initialized');
    return;
  }

  try {
    wellnessReminderSystem.scheduleReminder(activity, time, frequency);
    renderReminderList();
    closeReminderModal();
    
    // Show success message
    console.log(`Reminder scheduled: ${activity} at ${time} (${frequency})`);
  } catch (error) {
    alert('Failed to schedule reminder: ' + error.message);
  }
}

function renderReminderList() {
  if (!wellnessReminderSystem) return;

  const listEl = document.getElementById('reminder-list');
  if (!listEl) return;

  const reminders = wellnessReminderSystem.getActiveReminders();

  if (reminders.length === 0) {
    listEl.innerHTML = `
      <div class="reminder-empty">
        <div class="reminder-empty-icon">🌸</div>
        <div>No reminders yet. Add one to stay on track with your wellness goals.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = reminders.map(reminder => {
    const frequencyText = {
      'daily': 'Every day',
      'weekdays': 'Weekdays',
      'weekends': 'Weekends',
      'weekly': 'Weekly (Mon)'
    }[reminder.frequency] || reminder.frequency;

    return `
      <div class="reminder-item">
        <div class="reminder-info">
          <div class="reminder-activity">${escapeHtml(reminder.activity)}</div>
          <div class="reminder-schedule">
            <span>🕐 ${reminder.time}</span>
            <span>•</span>
            <span>${frequencyText}</span>
          </div>
        </div>
        <div class="reminder-actions">
          <div class="reminder-toggle ${reminder.enabled ? 'active' : ''}" 
               onclick="toggleReminder('${reminder.id}')"></div>
          <button class="reminder-delete" onclick="deleteReminder('${reminder.id}')" title="Delete reminder">
            ×
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleReminder(reminderId) {
  if (!wellnessReminderSystem) return;

  try {
    const reminder = wellnessReminderSystem.reminders.find(r => r.id === reminderId);
    if (reminder) {
      wellnessReminderSystem.updateReminder(reminderId, { enabled: !reminder.enabled });
      renderReminderList();
    }
  } catch (error) {
    console.error('Failed to toggle reminder:', error);
  }
}

function deleteReminder(reminderId) {
  if (!wellnessReminderSystem) return;

  if (confirm('Are you sure you want to delete this reminder?')) {
    try {
      wellnessReminderSystem.deleteReminder(reminderId);
      renderReminderList();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize wellness reminders when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWellnessReminders);
} else {
  initializeWellnessReminders();
}
