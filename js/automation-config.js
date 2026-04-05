/**
 * Automation Configuration Panel
 * 
 * Provides UI for users to configure automation features:
 * - Enable/disable automation components
 * - Configure reminder preferences
 * - Set privacy controls
 * - Manage notification settings
 * 
 * Requirements: 2.3
 */

class AutomationConfig {
  constructor() {
    this.config = {
      calendarAutomation: {
        enabled: true,
        autoUpdate: true
      },
      wellnessReminders: {
        enabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        defaultFrequency: 'daily'
      },
      mentalLoadTracking: {
        enabled: true,
        autoCalculate: true,
        delegationThreshold: 70,
        showAlerts: true
      },
      taskAutomation: {
        enabled: true,
        autoCreateTasks: false,
        requireConfirmation: true,
        patternDetection: true
      },
      notifications: {
        enabled: true,
        browserNotifications: true,
        soundEnabled: false
      },
      privacy: {
        storeDataLocally: true,
        shareAnonymousUsage: false
      }
    };

    this.STORAGE_KEY = 'herflow_automation_config';
    this._loadConfig();
  }

  /**
   * Load configuration from localStorage
   */
  _loadConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = { ...this.config, ...parsed };
        console.log('Automation config loaded from storage');
      }
    } catch (error) {
      console.error('Failed to load automation config:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  _saveConfig() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      console.log('Automation config saved to storage');
    } catch (error) {
      console.error('Failed to save automation config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates) {
    // Deep merge the updates
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
        this.config[key] = { ...this.config[key], ...updates[key] };
      } else {
        this.config[key] = updates[key];
      }
    });
    
    this._saveConfig();
    
    // Dispatch config change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('herflow:config:updated', {
        detail: { config: this.config }
      }));
    }
    
    return this.config;
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    // Reset to default values
    this.config = {
      calendarAutomation: {
        enabled: true,
        autoUpdate: true
      },
      wellnessReminders: {
        enabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        defaultFrequency: 'daily'
      },
      mentalLoadTracking: {
        enabled: true,
        autoCalculate: true,
        delegationThreshold: 70,
        showAlerts: true
      },
      taskAutomation: {
        enabled: true,
        autoCreateTasks: false,
        requireConfirmation: true,
        patternDetection: true
      },
      notifications: {
        enabled: true,
        browserNotifications: true,
        soundEnabled: false
      },
      privacy: {
        storeDataLocally: true,
        shareAnonymousUsage: false
      }
    };
    
    localStorage.removeItem(this.STORAGE_KEY);
    this._saveConfig();
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('herflow:config:reset'));
    }
    
    return this.config;
  }

  /**
   * Create configuration panel UI
   */
  createConfigPanel() {
    const panel = document.createElement('div');
    panel.id = 'automation-config-panel';
    panel.className = 'config-panel';
    panel.innerHTML = `
      <div class="config-panel-header">
        <h3>⚙️ Automation Settings</h3>
        <button class="close-btn" onclick="this.closest('.config-panel').style.display='none'">×</button>
      </div>
      
      <div class="config-panel-content">
        <!-- Calendar Automation -->
        <div class="config-section">
          <h4>📅 Calendar Automation</h4>
          <label class="config-toggle">
            <input type="checkbox" id="calendar-enabled" ${this.config.calendarAutomation.enabled ? 'checked' : ''}>
            <span>Enable calendar automation</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="calendar-auto-update" ${this.config.calendarAutomation.autoUpdate ? 'checked' : ''}>
            <span>Auto-update calendar dates</span>
          </label>
        </div>

        <!-- Wellness Reminders -->
        <div class="config-section">
          <h4>🌸 Wellness Reminders</h4>
          <label class="config-toggle">
            <input type="checkbox" id="reminders-enabled" ${this.config.wellnessReminders.enabled ? 'checked' : ''}>
            <span>Enable wellness reminders</span>
          </label>
          
          <div class="config-field">
            <label>Default Frequency:</label>
            <select id="reminder-frequency">
              <option value="daily" ${this.config.wellnessReminders.defaultFrequency === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekdays" ${this.config.wellnessReminders.defaultFrequency === 'weekdays' ? 'selected' : ''}>Weekdays</option>
              <option value="weekends" ${this.config.wellnessReminders.defaultFrequency === 'weekends' ? 'selected' : ''}>Weekends</option>
              <option value="weekly" ${this.config.wellnessReminders.defaultFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
            </select>
          </div>

          <div class="config-field">
            <label>Quiet Hours:</label>
            <div class="time-range">
              <input type="time" id="quiet-start" value="${this.config.wellnessReminders.quietHoursStart || ''}">
              <span>to</span>
              <input type="time" id="quiet-end" value="${this.config.wellnessReminders.quietHoursEnd || ''}">
            </div>
          </div>
        </div>

        <!-- Mental Load Tracking -->
        <div class="config-section">
          <h4>🧠 Mental Load Tracking</h4>
          <label class="config-toggle">
            <input type="checkbox" id="mentalload-enabled" ${this.config.mentalLoadTracking.enabled ? 'checked' : ''}>
            <span>Enable mental load tracking</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="mentalload-auto" ${this.config.mentalLoadTracking.autoCalculate ? 'checked' : ''}>
            <span>Auto-calculate load score</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="mentalload-alerts" ${this.config.mentalLoadTracking.showAlerts ? 'checked' : ''}>
            <span>Show high load alerts</span>
          </label>
          
          <div class="config-field">
            <label>Delegation Threshold: <span id="threshold-value">${this.config.mentalLoadTracking.delegationThreshold}</span></label>
            <input type="range" id="delegation-threshold" min="50" max="90" value="${this.config.mentalLoadTracking.delegationThreshold}">
          </div>
        </div>

        <!-- Task Automation -->
        <div class="config-section">
          <h4>🤖 Task Automation</h4>
          <label class="config-toggle">
            <input type="checkbox" id="taskautomation-enabled" ${this.config.taskAutomation.enabled ? 'checked' : ''}>
            <span>Enable task automation</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="taskautomation-pattern" ${this.config.taskAutomation.patternDetection ? 'checked' : ''}>
            <span>Detect recurring patterns</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="taskautomation-auto" ${this.config.taskAutomation.autoCreateTasks ? 'checked' : ''}>
            <span>Auto-create recurring tasks</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="taskautomation-confirm" ${this.config.taskAutomation.requireConfirmation ? 'checked' : ''}>
            <span>Require confirmation for auto-created tasks</span>
          </label>
        </div>

        <!-- Notifications -->
        <div class="config-section">
          <h4>🔔 Notifications</h4>
          <label class="config-toggle">
            <input type="checkbox" id="notifications-enabled" ${this.config.notifications.enabled ? 'checked' : ''}>
            <span>Enable notifications</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="notifications-browser" ${this.config.notifications.browserNotifications ? 'checked' : ''}>
            <span>Browser notifications</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="notifications-sound" ${this.config.notifications.soundEnabled ? 'checked' : ''}>
            <span>Sound notifications</span>
          </label>
        </div>

        <!-- Privacy -->
        <div class="config-section">
          <h4>🔒 Privacy</h4>
          <label class="config-toggle">
            <input type="checkbox" id="privacy-local" ${this.config.privacy.storeDataLocally ? 'checked' : ''}>
            <span>Store data locally (recommended)</span>
          </label>
          <label class="config-toggle">
            <input type="checkbox" id="privacy-anonymous" ${this.config.privacy.shareAnonymousUsage ? 'checked' : ''}>
            <span>Share anonymous usage data</span>
          </label>
        </div>

        <!-- Actions -->
        <div class="config-actions">
          <button class="btn-primary" id="save-config">Save Settings</button>
          <button class="btn-secondary" id="reset-config">Reset to Defaults</button>
        </div>
      </div>
    `;

    // Add event listeners
    this._attachEventListeners(panel);

    return panel;
  }

  /**
   * Attach event listeners to config panel
   */
  _attachEventListeners(panel) {
    // Threshold slider
    const thresholdSlider = panel.querySelector('#delegation-threshold');
    const thresholdValue = panel.querySelector('#threshold-value');
    if (thresholdSlider && thresholdValue) {
      thresholdSlider.addEventListener('input', (e) => {
        thresholdValue.textContent = e.target.value;
      });
    }

    // Save button
    const saveBtn = panel.querySelector('#save-config');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this._saveConfigFromPanel(panel);
      });
    }

    // Reset button
    const resetBtn = panel.querySelector('#reset-config');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all settings to defaults?')) {
          this.resetConfig();
          // Refresh panel
          const oldPanel = document.getElementById('automation-config-panel');
          if (oldPanel) {
            const newPanel = this.createConfigPanel();
            oldPanel.replaceWith(newPanel);
          }
        }
      });
    }
  }

  /**
   * Save configuration from panel inputs
   */
  _saveConfigFromPanel(panel) {
    const updates = {
      calendarAutomation: {
        enabled: panel.querySelector('#calendar-enabled')?.checked ?? true,
        autoUpdate: panel.querySelector('#calendar-auto-update')?.checked ?? true
      },
      wellnessReminders: {
        enabled: panel.querySelector('#reminders-enabled')?.checked ?? true,
        quietHoursStart: panel.querySelector('#quiet-start')?.value || null,
        quietHoursEnd: panel.querySelector('#quiet-end')?.value || null,
        defaultFrequency: panel.querySelector('#reminder-frequency')?.value || 'daily'
      },
      mentalLoadTracking: {
        enabled: panel.querySelector('#mentalload-enabled')?.checked ?? true,
        autoCalculate: panel.querySelector('#mentalload-auto')?.checked ?? true,
        delegationThreshold: parseInt(panel.querySelector('#delegation-threshold')?.value || '70'),
        showAlerts: panel.querySelector('#mentalload-alerts')?.checked ?? true
      },
      taskAutomation: {
        enabled: panel.querySelector('#taskautomation-enabled')?.checked ?? true,
        autoCreateTasks: panel.querySelector('#taskautomation-auto')?.checked ?? false,
        requireConfirmation: panel.querySelector('#taskautomation-confirm')?.checked ?? true,
        patternDetection: panel.querySelector('#taskautomation-pattern')?.checked ?? true
      },
      notifications: {
        enabled: panel.querySelector('#notifications-enabled')?.checked ?? true,
        browserNotifications: panel.querySelector('#notifications-browser')?.checked ?? true,
        soundEnabled: panel.querySelector('#notifications-sound')?.checked ?? false
      },
      privacy: {
        storeDataLocally: panel.querySelector('#privacy-local')?.checked ?? true,
        shareAnonymousUsage: panel.querySelector('#privacy-anonymous')?.checked ?? false
      }
    };

    this.updateConfig(updates);
    
    // Show success message
    this._showMessage('Settings saved successfully!', 'success');
    
    // Apply configuration to components
    this._applyConfigToComponents();
  }

  /**
   * Apply configuration to automation components
   */
  _applyConfigToComponents() {
    if (!window.HerFlowAutomation) return;

    // Apply wellness reminder config
    if (window.HerFlowAutomation.wellnessReminders) {
      window.HerFlowAutomation.wellnessReminders.updatePreferences({
        enabled: this.config.wellnessReminders.enabled,
        quietHoursStart: this.config.wellnessReminders.quietHoursStart,
        quietHoursEnd: this.config.wellnessReminders.quietHoursEnd,
        defaultFrequency: this.config.wellnessReminders.defaultFrequency
      });
    }

    // Apply mental load config
    if (window.HerFlowAutomation.mentalLoadAgent) {
      window.HerFlowAutomation.mentalLoadAgent.DELEGATION_THRESHOLD = 
        this.config.mentalLoadTracking.delegationThreshold;
    }

    // Apply task automation config
    if (window.HerFlowAutomation.taskAutomation) {
      if (this.config.taskAutomation.enabled && this.config.taskAutomation.patternDetection) {
        // Trigger pattern detection
        window.dispatchEvent(new CustomEvent('herflow:patterns:detect'));
      }
    }
  }

  /**
   * Show message to user
   */
  _showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `config-message config-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      messageEl.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => messageEl.remove(), 300);
    }, 3000);
  }

  /**
   * Show configuration panel
   */
  showPanel() {
    let panel = document.getElementById('automation-config-panel');
    
    if (!panel) {
      panel = this.createConfigPanel();
      document.body.appendChild(panel);
    }
    
    panel.style.display = 'block';
  }

  /**
   * Hide configuration panel
   */
  hidePanel() {
    const panel = document.getElementById('automation-config-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutomationConfig;
}
