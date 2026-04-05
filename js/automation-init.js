/**
 * Automation Initialization - Main entry point for all automation components
 * 
 * Initializes and wires together all automation components:
 * - CalendarAgentAdapter & CalendarAutomation
 * - WellnessReminderSystem
 * - MentalLoadAgent
 * - TaskAutomationAgent
 * 
 * Provides global error handling and inter-component communication.
 * 
 * Requirements: All
 */

(function() {
  'use strict';

  // Global automation state
  window.HerFlowAutomation = {
    calendarAgent: null,
    calendarAutomation: null,
    wellnessReminders: null,
    mentalLoadAgent: null,
    taskAutomation: null,
    kiroHooks: null,
    config: null,
    initialized: false,
    errors: []
  };

  /**
   * Mock Kiro Hooks implementation
   * Replace with actual Kiro hooks when available
   * 
   * This provides a stub implementation for:
   * - Notification delivery
   * - Mental load monitoring
   * - Event tracking
   */
  class MockKiroHooks {
    constructor() {
      this.notifications = [];
      this.mentalLoadHistory = [];
      this.eventLog = [];
    }

    /**
     * Send notification via Kiro hooks
     * Requirements: 2.4, 3.5
     */
    async sendNotification(notification) {
      console.log('📬 Kiro Notification:', notification);
      
      const enrichedNotification = {
        ...notification,
        id: notification.id || `notif_${Date.now()}`,
        sentAt: new Date().toISOString(),
        status: 'delivered'
      };
      
      this.notifications.push(enrichedNotification);
      this._logEvent('notification_sent', enrichedNotification);

      // Show browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: enrichedNotification.id
        });
      }

      return { success: true, id: enrichedNotification.id };
    }

    /**
     * Track mental load for monitoring
     * Requirements: 3.5
     */
    async trackMentalLoad(score, metadata = {}) {
      const entry = {
        score,
        timestamp: new Date().toISOString(),
        ...metadata
      };
      
      this.mentalLoadHistory.push(entry);
      this._logEvent('mental_load_tracked', entry);
      
      console.log('🧠 Mental Load Tracked:', score);
      
      // Alert if score is critically high
      if (score > 85) {
        await this.sendNotification({
          title: '⚠️ High Mental Load Alert',
          message: `Your mental load is at ${score}. Consider taking a break or delegating tasks.`,
          type: 'alert',
          priority: 'high'
        });
      }
      
      return { success: true };
    }

    /**
     * Get all notifications
     */
    async getNotifications() {
      return [...this.notifications];
    }

    /**
     * Get mental load history
     */
    async getMentalLoadHistory(days = 7) {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      return this.mentalLoadHistory.filter(entry => 
        new Date(entry.timestamp).getTime() > cutoff
      );
    }

    /**
     * Get event log
     */
    async getEventLog(limit = 50) {
      return this.eventLog.slice(-limit);
    }

    /**
     * Log event for debugging
     * @private
     */
    _logEvent(type, data) {
      this.eventLog.push({
        type,
        timestamp: new Date().toISOString(),
        data
      });
      
      // Keep only last 100 events
      if (this.eventLog.length > 100) {
        this.eventLog.shift();
      }
    }

    /**
     * Clear all data (for testing)
     */
    clear() {
      this.notifications = [];
      this.mentalLoadHistory = [];
      this.eventLog = [];
    }
  }

  /**
   * Initialize all automation components
   */
  async function initializeAutomation() {
    console.log('🚀 Initializing HerFlow Automation...');

    try {
      // Initialize Configuration
      window.HerFlowAutomation.config = new AutomationConfig();
      console.log('✓ Automation Config initialized');

      // Initialize Kiro Hooks (mock for now)
      window.HerFlowAutomation.kiroHooks = new MockKiroHooks();
      console.log('✓ Kiro Hooks initialized');

      // Initialize Calendar Agent Adapter
      window.HerFlowAutomation.calendarAgent = new CalendarAgentAdapter('/api/calendar-agent');
      console.log('✓ Calendar Agent Adapter initialized');

      // Initialize Calendar Automation
      window.HerFlowAutomation.calendarAutomation = new CalendarAutomation(
        window.HerFlowAutomation.calendarAgent
      );
      await window.HerFlowAutomation.calendarAutomation.initialize();
      console.log('✓ Calendar Automation initialized');

      // Initialize Wellness Reminder System
      window.HerFlowAutomation.wellnessReminders = new WellnessReminderSystem(
        window.HerFlowAutomation.kiroHooks
      );
      window.HerFlowAutomation.wellnessReminders.startReminderChecking();
      console.log('✓ Wellness Reminder System initialized');

      // Initialize Mental Load Agent
      window.HerFlowAutomation.mentalLoadAgent = new MentalLoadAgent(
        window.HerFlowAutomation.kiroHooks,
        window.HerFlowAutomation.calendarAgent
      );
      console.log('✓ Mental Load Agent initialized');

      // Initialize Task Automation Agent
      window.HerFlowAutomation.taskAutomation = new TaskAutomationAgent(
        window.HerFlowAutomation.mentalLoadAgent,
        window.HerFlowAutomation.calendarAgent,
        window.HerFlowAutomation.kiroHooks
      );
      console.log('✓ Task Automation Agent initialized');

      // Set up inter-component communication
      setupInterComponentCommunication();
      console.log('✓ Inter-component communication established');

      // Set up global error handling
      setupGlobalErrorHandling();
      console.log('✓ Global error handling configured');

      // Request notification permission
      await requestNotificationPermission();

      // Add settings button to UI
      addSettingsButton();
      console.log('✓ Settings button added');

      window.HerFlowAutomation.initialized = true;
      console.log('✅ HerFlow Automation fully initialized');

      // Dispatch initialization event
      window.dispatchEvent(new CustomEvent('herflow:automation:ready', {
        detail: window.HerFlowAutomation
      }));

    } catch (error) {
      console.error('❌ Failed to initialize automation:', error);
      window.HerFlowAutomation.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      });
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('herflow:automation:error', {
        detail: { error }
      }));
    }
  }

  /**
   * Set up inter-component communication
   */
  function setupInterComponentCommunication() {
    // When a task is added/removed, update mental load
    window.addEventListener('herflow:task:added', (event) => {
      const task = event.detail.task;
      if (window.HerFlowAutomation.mentalLoadAgent) {
        window.HerFlowAutomation.mentalLoadAgent.addTask(task);
        
        // Track mental load via Kiro hooks
        const score = window.HerFlowAutomation.mentalLoadAgent.getCurrentScore();
        if (window.HerFlowAutomation.kiroHooks) {
          window.HerFlowAutomation.kiroHooks.trackMentalLoad(score, {
            event: 'task_added',
            taskId: task.id,
            taskCategory: task.category
          });
        }
      }
      if (window.HerFlowAutomation.taskAutomation) {
        window.HerFlowAutomation.taskAutomation.addTaskToHistory(task);
      }
    });

    window.addEventListener('herflow:task:removed', (event) => {
      const taskId = event.detail.taskId;
      if (window.HerFlowAutomation.mentalLoadAgent) {
        window.HerFlowAutomation.mentalLoadAgent.removeTask(taskId);
        
        // Track mental load via Kiro hooks
        const score = window.HerFlowAutomation.mentalLoadAgent.getCurrentScore();
        if (window.HerFlowAutomation.kiroHooks) {
          window.HerFlowAutomation.kiroHooks.trackMentalLoad(score, {
            event: 'task_removed',
            taskId
          });
        }
      }
    });

    window.addEventListener('herflow:task:completed', (event) => {
      const taskId = event.detail.taskId;
      if (window.HerFlowAutomation.mentalLoadAgent) {
        window.HerFlowAutomation.mentalLoadAgent.removeTask(taskId);
        
        // Track mental load via Kiro hooks
        const score = window.HerFlowAutomation.mentalLoadAgent.getCurrentScore();
        if (window.HerFlowAutomation.kiroHooks) {
          window.HerFlowAutomation.kiroHooks.trackMentalLoad(score, {
            event: 'task_completed',
            taskId
          });
        }
      }
    });

    // When mental load changes, check for delegation suggestions
    window.addEventListener('herflow:mentalload:updated', (event) => {
      const score = event.detail.score;
      
      // Track via Kiro hooks
      if (window.HerFlowAutomation.kiroHooks) {
        window.HerFlowAutomation.kiroHooks.trackMentalLoad(score, {
          event: 'manual_update'
        });
      }
      
      if (score > 70 && window.HerFlowAutomation.mentalLoadAgent) {
        const suggestions = window.HerFlowAutomation.mentalLoadAgent.suggestDelegation();
        if (suggestions.length > 0) {
          window.dispatchEvent(new CustomEvent('herflow:delegation:suggested', {
            detail: { suggestions }
          }));
        }
      }
    });

    // When wellness activity is completed, track it
    window.addEventListener('herflow:wellness:completed', (event) => {
      const activityId = event.detail.activityId;
      if (window.HerFlowAutomation.wellnessReminders) {
        window.HerFlowAutomation.wellnessReminders.trackCompletion(activityId);
      }
    });

    // When calendar month changes, update calendar
    window.addEventListener('herflow:calendar:navigate', async (event) => {
      const { month, year } = event.detail;
      if (window.HerFlowAutomation.calendarAutomation) {
        await window.HerFlowAutomation.calendarAutomation.updateCalendar(month, year);
      }
    });

    // Pattern detection trigger
    window.addEventListener('herflow:patterns:detect', () => {
      if (window.HerFlowAutomation.taskAutomation) {
        const patterns = window.HerFlowAutomation.taskAutomation.detectRecurringPatterns();
        window.dispatchEvent(new CustomEvent('herflow:patterns:detected', {
          detail: { patterns }
        }));
      }
    });
  }

  /**
   * Set up global error handling
   */
  function setupGlobalErrorHandling() {
    // Catch unhandled errors in automation components
    window.addEventListener('error', (event) => {
      if (event.filename && event.filename.includes('/js/')) {
        console.error('Automation error:', event.error);
        window.HerFlowAutomation.errors.push({
          timestamp: new Date().toISOString(),
          error: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      window.HerFlowAutomation.errors.push({
        timestamp: new Date().toISOString(),
        error: event.reason?.message || String(event.reason),
        type: 'unhandled_rejection'
      });
    });
  }

  /**
   * Request notification permission
   */
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  /**
   * Add settings button to header
   */
  function addSettingsButton() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) {
      console.warn('Header not found, cannot add settings button');
      return;
    }

    // Check if button already exists
    if (document.getElementById('automation-settings-btn')) {
      return;
    }

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'automation-settings-btn';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = 'Automation Settings';
    settingsBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.2s;
    `;

    settingsBtn.addEventListener('mouseenter', () => {
      settingsBtn.style.background = 'rgba(44,35,32,0.08)';
    });

    settingsBtn.addEventListener('mouseleave', () => {
      settingsBtn.style.background = 'none';
    });

    settingsBtn.addEventListener('click', () => {
      if (window.HerFlowAutomation.config) {
        window.HerFlowAutomation.config.showPanel();
      }
    });

    // Insert before avatar
    const avatar = headerRight.querySelector('.avatar');
    if (avatar) {
      headerRight.insertBefore(settingsBtn, avatar);
    } else {
      headerRight.appendChild(settingsBtn);
    }
  }

  /**
   * Get automation status
   */
  window.HerFlowAutomation.getStatus = function() {
    return {
      initialized: window.HerFlowAutomation.initialized,
      components: {
        calendarAgent: !!window.HerFlowAutomation.calendarAgent,
        calendarAutomation: !!window.HerFlowAutomation.calendarAutomation,
        wellnessReminders: !!window.HerFlowAutomation.wellnessReminders,
        mentalLoadAgent: !!window.HerFlowAutomation.mentalLoadAgent,
        taskAutomation: !!window.HerFlowAutomation.taskAutomation,
        kiroHooks: !!window.HerFlowAutomation.kiroHooks
      },
      errors: window.HerFlowAutomation.errors,
      mentalLoadScore: window.HerFlowAutomation.mentalLoadAgent?.getCurrentScore() || 0,
      activeReminders: window.HerFlowAutomation.wellnessReminders?.getActiveReminders().length || 0,
      recurringPatterns: window.HerFlowAutomation.taskAutomation?.getRecurringPatterns().length || 0
    };
  };

  /**
   * Cleanup on page unload
   */
  window.addEventListener('beforeunload', () => {
    if (window.HerFlowAutomation.calendarAutomation) {
      window.HerFlowAutomation.calendarAutomation.destroy();
    }
    if (window.HerFlowAutomation.wellnessReminders) {
      window.HerFlowAutomation.wellnessReminders.destroy();
    }
    if (window.HerFlowAutomation.mentalLoadAgent) {
      window.HerFlowAutomation.mentalLoadAgent.destroy();
    }
    if (window.HerFlowAutomation.taskAutomation) {
      window.HerFlowAutomation.taskAutomation.destroy();
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAutomation);
  } else {
    initializeAutomation();
  }

})();
