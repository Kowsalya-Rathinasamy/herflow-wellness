/**
 * WellnessReminderSystem - Manages automated wellness activity reminders
 * 
 * Handles reminder scheduling, delivery, completion tracking, and pattern analysis
 * using Kiro hooks for notifications and localStorage for persistence.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

class WellnessReminderSystem {
  constructor(kiroHooks = null) {
    this.hooks = kiroHooks;
    this.reminders = [];
    this.userPreferences = {
      enabled: true,
      defaultFrequency: 'daily',
      quietHoursStart: null,
      quietHoursEnd: null
    };
    this.completionHistory = [];
    this.notificationQueue = [];
    this.checkInterval = null;
    this.STORAGE_KEY_REMINDERS = 'herflow_reminders';
    this.STORAGE_KEY_PREFERENCES = 'herflow_reminder_preferences';
    this.STORAGE_KEY_HISTORY = 'herflow_completion_history';
    this.CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
    this.MAX_RETRIES = 3;
    
    // Load persisted data
    this._loadFromStorage();
  }

  /**
   * Schedule a wellness reminder
   * Requirements: 2.1, 2.3
   * 
   * @param {string} activity - Activity name/description
   * @param {string} time - Time in HH:MM format (24-hour)
   * @param {string} frequency - 'daily', 'weekly', 'weekdays', 'weekends', or specific days
   * @returns {Object} Created reminder object
   */
  scheduleReminder(activity, time, frequency = 'daily') {
    if (!activity || typeof activity !== 'string') {
      throw new Error('Activity name is required');
    }

    if (!this._isValidTime(time)) {
      throw new Error('Invalid time format. Use HH:MM (24-hour)');
    }

    const reminder = {
      id: this._generateId(),
      activity,
      time,
      frequency,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastDelivered: null,
      retryCount: 0,
      nextScheduled: this._calculateNextScheduledTime(time, frequency)
    };

    this.reminders.push(reminder);
    this._saveToStorage();

    console.log(`Reminder scheduled: ${activity} at ${time} (${frequency})`);
    return reminder;
  }

  /**
   * Send a reminder notification
   * Requirements: 2.1, 2.4
   * 
   * @param {Object} reminder - Reminder object to send
   * @returns {Promise<boolean>} Success status
   */
  async sendReminder(reminder) {
    if (!reminder || !reminder.id) {
      throw new Error('Invalid reminder object');
    }

    // Check quiet hours
    if (this._isQuietHours()) {
      console.log(`Reminder ${reminder.id} delayed due to quiet hours`);
      this._queueForRetry(reminder);
      return false;
    }

    try {
      // Send via Kiro hooks if available
      if (this.hooks && typeof this.hooks.sendNotification === 'function') {
        await this.hooks.sendNotification({
          title: '🌸 Wellness Reminder',
          message: reminder.activity,
          type: 'wellness',
          timestamp: new Date().toISOString(),
          actions: [
            { label: 'Complete', action: 'complete', reminderId: reminder.id },
            { label: 'Snooze', action: 'snooze', reminderId: reminder.id }
          ]
        });
      } else {
        // Fallback to browser notification
        await this._sendBrowserNotification(reminder);
      }

      // Update reminder status
      reminder.lastDelivered = new Date().toISOString();
      reminder.retryCount = 0;
      reminder.nextScheduled = this._calculateNextScheduledTime(reminder.time, reminder.frequency);
      
      this._saveToStorage();
      console.log(`Reminder delivered: ${reminder.activity}`);
      return true;

    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
      this._queueForRetry(reminder);
      return false;
    }
  }

  /**
   * Track activity completion
   * Requirements: 2.2, 2.5
   * 
   * @param {string} activityId - Activity or reminder ID
   * @param {Object} metadata - Optional completion metadata
   */
  trackCompletion(activityId, metadata = {}) {
    if (!activityId) {
      throw new Error('Activity ID is required');
    }

    const completion = {
      activityId,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.completionHistory.push(completion);
    
    // Keep only last 90 days of history
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.completionHistory = this.completionHistory.filter(c => 
      new Date(c.timestamp).getTime() > ninetyDaysAgo
    );

    this._saveToStorage();
    console.log(`Completion tracked for activity: ${activityId}`);

    // Trigger pattern analysis
    this.analyzePatterns();
  }

  /**
   * Analyze completion patterns to optimize reminders
   * Requirements: 2.2, 2.5
   * 
   * @returns {Object} Pattern analysis results
   */
  analyzePatterns() {
    if (this.completionHistory.length < 7) {
      return {
        hasEnoughData: false,
        message: 'Need at least 7 completions for pattern analysis'
      };
    }

    const patterns = {
      hasEnoughData: true,
      completionRate: this._calculateCompletionRate(),
      bestTimeOfDay: this._findBestTimeOfDay(),
      bestDayOfWeek: this._findBestDayOfWeek(),
      streaks: this._calculateStreaks(),
      recommendations: []
    };

    // Generate recommendations based on patterns
    if (patterns.completionRate < 0.5) {
      patterns.recommendations.push({
        type: 'frequency',
        message: 'Consider reducing reminder frequency to avoid notification fatigue'
      });
    }

    if (patterns.bestTimeOfDay) {
      patterns.recommendations.push({
        type: 'timing',
        message: `You complete activities most often around ${patterns.bestTimeOfDay}. Consider scheduling reminders for this time.`
      });
    }

    console.log('Pattern analysis complete:', patterns);
    return patterns;
  }

  /**
   * Start background reminder checking
   * Requirements: 2.1, 2.4
   */
  startReminderChecking() {
    if (this.checkInterval) {
      console.warn('Reminder checking already started');
      return;
    }

    console.log('Starting reminder checking...');
    
    // Initial check
    this._checkReminders();

    // Set up interval
    this.checkInterval = setInterval(() => {
      this._checkReminders();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop background reminder checking
   */
  stopReminderChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Reminder checking stopped');
    }
  }

  /**
   * Get all active reminders
   * @returns {Array} Array of active reminders
   */
  getActiveReminders() {
    return this.reminders.filter(r => r.enabled);
  }

  /**
   * Update reminder
   * @param {string} reminderId - Reminder ID
   * @param {Object} updates - Fields to update
   */
  updateReminder(reminderId, updates) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      throw new Error(`Reminder not found: ${reminderId}`);
    }

    Object.assign(reminder, updates);
    
    // Recalculate next scheduled time if time or frequency changed
    if (updates.time || updates.frequency) {
      reminder.nextScheduled = this._calculateNextScheduledTime(
        reminder.time,
        reminder.frequency
      );
    }

    this._saveToStorage();
    console.log(`Reminder updated: ${reminderId}`);
  }

  /**
   * Delete reminder
   * @param {string} reminderId - Reminder ID
   */
  deleteReminder(reminderId) {
    const index = this.reminders.findIndex(r => r.id === reminderId);
    if (index === -1) {
      throw new Error(`Reminder not found: ${reminderId}`);
    }

    this.reminders.splice(index, 1);
    this._saveToStorage();
    console.log(`Reminder deleted: ${reminderId}`);
  }

  /**
   * Update user preferences
   * @param {Object} preferences - Preference updates
   */
  updatePreferences(preferences) {
    Object.assign(this.userPreferences, preferences);
    this._saveToStorage();
    console.log('Preferences updated:', this.userPreferences);
  }

  /**
   * Get completion history for an activity
   * @param {string} activityId - Activity ID
   * @returns {Array} Completion history
   */
  getCompletionHistory(activityId) {
    if (activityId) {
      return this.completionHistory.filter(c => c.activityId === activityId);
    }
    return this.completionHistory;
  }

  /**
   * Check if reminders are due and send them
   * @private
   */
  async _checkReminders() {
    if (!this.userPreferences.enabled) {
      return;
    }

    const now = new Date();
    const currentTime = this._formatTimeForComparison(now);

    for (const reminder of this.getActiveReminders()) {
      if (this._shouldSendReminder(reminder, now, currentTime)) {
        await this.sendReminder(reminder);
      }
    }

    // Process retry queue
    await this._processRetryQueue();
  }

  /**
   * Determine if a reminder should be sent
   * @private
   */
  _shouldSendReminder(reminder, now, currentTime) {
    // Check if it's time to send
    const reminderTime = reminder.time.replace(':', '');
    if (currentTime !== reminderTime) {
      return false;
    }

    // Check if already sent today
    if (reminder.lastDelivered) {
      const lastDelivered = new Date(reminder.lastDelivered);
      if (this._isSameDay(lastDelivered, now)) {
        return false;
      }
    }

    // Check frequency
    return this._matchesFrequency(reminder.frequency, now);
  }

  /**
   * Check if current time matches reminder frequency
   * @private
   */
  _matchesFrequency(frequency, date) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    switch (frequency) {
      case 'daily':
        return true;
      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6;
      case 'weekly':
        return dayOfWeek === 1; // Monday
      default:
        // Handle specific days like 'monday,wednesday,friday'
        if (frequency.includes(',')) {
          const days = frequency.toLowerCase().split(',');
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          return days.includes(dayNames[dayOfWeek]);
        }
        return true;
    }
  }

  /**
   * Queue reminder for retry
   * @private
   */
  _queueForRetry(reminder) {
    if (reminder.retryCount >= this.MAX_RETRIES) {
      console.error(`Max retries reached for reminder: ${reminder.id}`);
      return;
    }

    reminder.retryCount++;
    
    if (!this.notificationQueue.find(r => r.id === reminder.id)) {
      this.notificationQueue.push(reminder);
    }
  }

  /**
   * Process retry queue
   * @private
   */
  async _processRetryQueue() {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const queue = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const reminder of queue) {
      const success = await this.sendReminder(reminder);
      if (!success && reminder.retryCount < this.MAX_RETRIES) {
        this.notificationQueue.push(reminder);
      }
    }
  }

  /**
   * Send browser notification as fallback
   * @private
   */
  async _sendBrowserNotification(reminder) {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('🌸 Wellness Reminder', {
        body: reminder.activity,
        icon: '/favicon.ico',
        tag: reminder.id
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('🌸 Wellness Reminder', {
          body: reminder.activity,
          icon: '/favicon.ico',
          tag: reminder.id
        });
      }
    }
  }

  /**
   * Calculate next scheduled time for a reminder
   * @private
   */
  _calculateNextScheduledTime(time, frequency) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, move to next occurrence
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    // Adjust for frequency
    if (frequency === 'weekly') {
      // Move to next Monday
      const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
    }

    return next.toISOString();
  }

  /**
   * Calculate completion rate
   * @private
   */
  _calculateCompletionRate() {
    const totalReminders = this.reminders.length;
    if (totalReminders === 0) return 0;

    const completions = this.completionHistory.length;
    const expectedCompletions = totalReminders * 7; // Assume 7 days of data
    
    return Math.min(completions / expectedCompletions, 1);
  }

  /**
   * Find best time of day for completions
   * @private
   */
  _findBestTimeOfDay() {
    if (this.completionHistory.length === 0) return null;

    const hourCounts = new Array(24).fill(0);
    
    this.completionHistory.forEach(completion => {
      const hour = new Date(completion.timestamp).getHours();
      hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    const bestHour = hourCounts.indexOf(maxCount);
    
    return `${bestHour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Find best day of week for completions
   * @private
   */
  _findBestDayOfWeek() {
    if (this.completionHistory.length === 0) return null;

    const dayCounts = new Array(7).fill(0);
    
    this.completionHistory.forEach(completion => {
      const day = new Date(completion.timestamp).getDay();
      dayCounts[day]++;
    });

    const maxCount = Math.max(...dayCounts);
    const bestDay = dayCounts.indexOf(maxCount);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[bestDay];
  }

  /**
   * Calculate completion streaks
   * @private
   */
  _calculateStreaks() {
    if (this.completionHistory.length === 0) {
      return { current: 0, longest: 0 };
    }

    const sortedHistory = [...this.completionHistory].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedHistory.length; i++) {
      const prevDate = new Date(sortedHistory[i - 1].timestamp);
      const currDate = new Date(sortedHistory[i].timestamp);
      
      const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (dayDiff > 1) {
        tempStreak = 1;
      }
    }

    // Check if streak is current
    const lastCompletion = new Date(sortedHistory[sortedHistory.length - 1].timestamp);
    const today = new Date();
    const daysSinceLastCompletion = Math.floor((today - lastCompletion) / (1000 * 60 * 60 * 24));
    
    currentStreak = daysSinceLastCompletion <= 1 ? tempStreak : 0;

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Check if current time is within quiet hours
   * @private
   */
  _isQuietHours() {
    if (!this.userPreferences.quietHoursStart || !this.userPreferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.userPreferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.userPreferences.quietHoursEnd.split(':').map(Number);
    
    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    if (quietStart < quietEnd) {
      return currentTime >= quietStart && currentTime < quietEnd;
    } else {
      // Quiet hours span midnight
      return currentTime >= quietStart || currentTime < quietEnd;
    }
  }

  /**
   * Validate time format
   * @private
   */
  _isValidTime(time) {
    if (typeof time !== 'string') return false;
    const match = time.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    return match !== null;
  }

  /**
   * Format time for comparison (HHMM)
   * @private
   */
  _formatTimeForComparison(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + minutes;
  }

  /**
   * Check if two dates are the same day
   * @private
   */
  _isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load data from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const reminders = localStorage.getItem(this.STORAGE_KEY_REMINDERS);
      if (reminders) {
        this.reminders = JSON.parse(reminders);
      }

      const preferences = localStorage.getItem(this.STORAGE_KEY_PREFERENCES);
      if (preferences) {
        this.userPreferences = { ...this.userPreferences, ...JSON.parse(preferences) };
      }

      const history = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      if (history) {
        this.completionHistory = JSON.parse(history);
      }

      console.log('Reminder data loaded from storage');
    } catch (error) {
      console.error('Failed to load reminder data from storage:', error);
    }
  }

  /**
   * Save data to localStorage
   * @private
   */
  _saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY_REMINDERS, JSON.stringify(this.reminders));
      localStorage.setItem(this.STORAGE_KEY_PREFERENCES, JSON.stringify(this.userPreferences));
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.completionHistory));
    } catch (error) {
      console.error('Failed to save reminder data to storage:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopReminderChecking();
    this._saveToStorage();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WellnessReminderSystem;
}
