/**
 * Unit tests for WellnessReminderSystem
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

const WellnessReminderSystem = require('./wellness-reminders.js');

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

describe('WellnessReminderSystem', () => {
  let reminderSystem;
  let mockKiroHooks;

  beforeEach(() => {
    // Clear localStorage before each test
    global.localStorage.clear();

    // Create mock Kiro hooks
    mockKiroHooks = {
      sendNotification: jest.fn().mockResolvedValue(true)
    };

    reminderSystem = new WellnessReminderSystem(mockKiroHooks);
  });

  afterEach(() => {
    if (reminderSystem) {
      reminderSystem.destroy();
    }
  });

  describe('scheduleReminder', () => {
    test('should schedule a reminder with valid inputs', () => {
      const reminder = reminderSystem.scheduleReminder('Take a walk', '09:00', 'daily');

      expect(reminder).toBeDefined();
      expect(reminder.activity).toBe('Take a walk');
      expect(reminder.time).toBe('09:00');
      expect(reminder.frequency).toBe('daily');
      expect(reminder.enabled).toBe(true);
      expect(reminder.id).toBeDefined();
    });

    test('should throw error for invalid activity', () => {
      expect(() => {
        reminderSystem.scheduleReminder('', '09:00', 'daily');
      }).toThrow('Activity name is required');
    });

    test('should throw error for invalid time format', () => {
      expect(() => {
        reminderSystem.scheduleReminder('Walk', '25:00', 'daily');
      }).toThrow('Invalid time format');
    });

    test('should persist reminder to localStorage', () => {
      reminderSystem.scheduleReminder('Meditate', '10:00', 'daily');

      const stored = JSON.parse(localStorage.getItem('herflow_reminders'));
      expect(stored).toHaveLength(1);
      expect(stored[0].activity).toBe('Meditate');
    });
  });

  describe('sendReminder', () => {
    test('should send reminder via Kiro hooks', async () => {
      const reminder = reminderSystem.scheduleReminder('Drink water', '14:00', 'daily');

      const result = await reminderSystem.sendReminder(reminder);

      expect(result).toBe(true);
      expect(mockKiroHooks.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🌸 Wellness Reminder',
          message: 'Drink water',
          type: 'wellness'
        })
      );
    });

    test('should update lastDelivered timestamp', async () => {
      const reminder = reminderSystem.scheduleReminder('Exercise', '15:00', 'daily');
      const beforeTime = new Date().toISOString();

      await reminderSystem.sendReminder(reminder);

      expect(reminder.lastDelivered).toBeDefined();
      expect(new Date(reminder.lastDelivered).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    test('should queue for retry on failure', async () => {
      mockKiroHooks.sendNotification.mockRejectedValue(new Error('Network error'));
      const reminder = reminderSystem.scheduleReminder('Stretch', '16:00', 'daily');

      const result = await reminderSystem.sendReminder(reminder);

      expect(result).toBe(false);
      expect(reminderSystem.notificationQueue).toContainEqual(
        expect.objectContaining({ id: reminder.id })
      );
    });
  });

  describe('trackCompletion', () => {
    test('should track activity completion', () => {
      const reminder = reminderSystem.scheduleReminder('Walk', '09:00', 'daily');

      reminderSystem.trackCompletion(reminder.id);

      expect(reminderSystem.completionHistory).toHaveLength(1);
      expect(reminderSystem.completionHistory[0].activityId).toBe(reminder.id);
    });

    test('should persist completion history', () => {
      const reminder = reminderSystem.scheduleReminder('Meditate', '10:00', 'daily');

      reminderSystem.trackCompletion(reminder.id);

      const stored = JSON.parse(localStorage.getItem('herflow_completion_history'));
      expect(stored).toHaveLength(1);
      expect(stored[0].activityId).toBe(reminder.id);
    });

    test('should throw error for missing activity ID', () => {
      expect(() => {
        reminderSystem.trackCompletion('');
      }).toThrow('Activity ID is required');
    });
  });

  describe('analyzePatterns', () => {
    test('should return insufficient data message with < 7 completions', () => {
      const result = reminderSystem.analyzePatterns();

      expect(result.hasEnoughData).toBe(false);
      expect(result.message).toContain('at least 7 completions');
    });

    test('should analyze patterns with sufficient data', () => {
      const reminder = reminderSystem.scheduleReminder('Walk', '09:00', 'daily');

      // Add 10 completions
      for (let i = 0; i < 10; i++) {
        reminderSystem.trackCompletion(reminder.id);
      }

      const result = reminderSystem.analyzePatterns();

      expect(result.hasEnoughData).toBe(true);
      expect(result.completionRate).toBeDefined();
      expect(result.bestTimeOfDay).toBeDefined();
      expect(result.streaks).toBeDefined();
    });
  });

  describe('getActiveReminders', () => {
    test('should return only enabled reminders', () => {
      const reminder1 = reminderSystem.scheduleReminder('Walk', '09:00', 'daily');
      const reminder2 = reminderSystem.scheduleReminder('Meditate', '10:00', 'daily');

      reminderSystem.updateReminder(reminder2.id, { enabled: false });

      const active = reminderSystem.getActiveReminders();

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(reminder1.id);
    });
  });

  describe('updateReminder', () => {
    test('should update reminder properties', () => {
      const reminder = reminderSystem.scheduleReminder('Walk', '09:00', 'daily');

      reminderSystem.updateReminder(reminder.id, {
        time: '10:00',
        frequency: 'weekdays'
      });

      expect(reminder.time).toBe('10:00');
      expect(reminder.frequency).toBe('weekdays');
    });

    test('should throw error for non-existent reminder', () => {
      expect(() => {
        reminderSystem.updateReminder('invalid-id', { time: '10:00' });
      }).toThrow('Reminder not found');
    });
  });

  describe('deleteReminder', () => {
    test('should delete reminder', () => {
      const reminder = reminderSystem.scheduleReminder('Walk', '09:00', 'daily');

      reminderSystem.deleteReminder(reminder.id);

      expect(reminderSystem.reminders).toHaveLength(0);
    });

    test('should throw error for non-existent reminder', () => {
      expect(() => {
        reminderSystem.deleteReminder('invalid-id');
      }).toThrow('Reminder not found');
    });
  });

  describe('persistence', () => {
    test('should load reminders from localStorage on initialization', () => {
      // Create and save a reminder
      const system1 = new WellnessReminderSystem(mockKiroHooks);
      system1.scheduleReminder('Walk', '09:00', 'daily');
      system1.destroy();

      // Create new instance - should load from storage
      const system2 = new WellnessReminderSystem(mockKiroHooks);

      expect(system2.reminders).toHaveLength(1);
      expect(system2.reminders[0].activity).toBe('Walk');

      system2.destroy();
    });
  });

  describe('frequency matching', () => {
    test('should match daily frequency', () => {
      const result = reminderSystem._matchesFrequency('daily', new Date());
      expect(result).toBe(true);
    });

    test('should match weekdays frequency on Monday', () => {
      const monday = new Date('2024-01-08'); // A Monday
      const result = reminderSystem._matchesFrequency('weekdays', monday);
      expect(result).toBe(true);
    });

    test('should not match weekdays frequency on Sunday', () => {
      const sunday = new Date('2024-01-07'); // A Sunday
      const result = reminderSystem._matchesFrequency('weekdays', sunday);
      expect(result).toBe(false);
    });

    test('should match weekends frequency on Saturday', () => {
      const saturday = new Date('2024-01-06'); // A Saturday
      const result = reminderSystem._matchesFrequency('weekends', saturday);
      expect(result).toBe(true);
    });
  });
});
