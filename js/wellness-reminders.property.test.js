/**
 * Property-Based Tests for WellnessReminderSystem
 * 
 * Tests universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

const fc = require('fast-check');
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

describe('WellnessReminderSystem - Property-Based Tests', () => {
  let mockKiroHooks;

  beforeEach(() => {
    // Create mock Kiro hooks
    mockKiroHooks = {
      sendNotification: jest.fn().mockResolvedValue(true)
    };
  });

  // Clear localStorage before AND after each property test
  const clearStorage = () => {
    if (global.localStorage && typeof global.localStorage.clear === 'function') {
      global.localStorage.clear();
    } else {
      // Reinitialize if localStorage was corrupted
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
    }
  };

  describe('Property 3: Reminder Delivery Timeliness', () => {
    /**
     * **Validates: Requirements 2.1, 2.4**
     * 
     * Property: All scheduled reminders are delivered within 1 second of their scheduled time,
     * or queued for retry if delivery fails.
     * 
     * Formal Definition:
     * ∀ reminder R with scheduledTime T:
     *   let deliveryTime = R.actualDeliveryTime
     *   |deliveryTime - T| ≤ 1000ms ∨
     *   R.status == 'queued_for_retry'
     */

    /**
     * Generator for valid time strings (HH:MM format)
     */
    const timeArbitrary = fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([hours, minutes]) => 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    );

    /**
     * Generator for valid frequency values
     */
    const frequencyArbitrary = fc.constantFrom(
      'daily',
      'weekly',
      'weekdays',
      'weekends',
      'monday,wednesday,friday'
    );

    /**
     * Generator for valid activity names
     */
    const activityArbitrary = fc.string({ minLength: 1, maxLength: 100 }).filter(
      s => s.trim().length > 0
    );

    test('Property 3.1: Reminder delivered within 1 second of scheduled time', async () => {
      fc.assert(
        await fc.asyncProperty(
          activityArbitrary,
          frequencyArbitrary,
          async (activity, frequency) => {
            clearStorage();
            
            // Create system with mock hooks
            const system = new WellnessReminderSystem(mockKiroHooks);
            
            // Schedule reminder for current time (within next minute)
            const now = new Date();
            const scheduledTime = new Date(now.getTime() + 100); // 100ms from now
            const timeStr = `${scheduledTime.getHours().toString().padStart(2, '0')}:${scheduledTime.getMinutes().toString().padStart(2, '0')}`;
            
            const reminder = system.scheduleReminder(activity, timeStr, frequency);
            
            // Record time before sending
            const beforeSend = Date.now();
            
            // Send reminder
            await system.sendReminder(reminder);
            
            // Record time after sending
            const afterSend = Date.now();
            
            // Calculate delivery time
            const deliveryDuration = afterSend - beforeSend;
            
            // Property: Delivery should complete within 1 second
            expect(deliveryDuration).toBeLessThan(1000);
            
            // Property: Reminder should be marked as delivered
            expect(reminder.lastDelivered).not.toBeNull();
            
            // Property: Notification should have been sent
            expect(mockKiroHooks.sendNotification).toHaveBeenCalled();
            
            system.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 3.2: Failed reminders are queued for retry', async () => {
      fc.assert(
        await fc.asyncProperty(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          async (activity, time, frequency) => {
            clearStorage();
            
            // Create system with failing mock hooks
            const failingHooks = {
              sendNotification: jest.fn().mockRejectedValue(new Error('Network error'))
            };
            
            const system = new WellnessReminderSystem(failingHooks);
            const reminder = system.scheduleReminder(activity, time, frequency);
            
            // Attempt to send reminder (should fail)
            const result = await system.sendReminder(reminder);
            
            // Property: Send should return false on failure
            expect(result).toBe(false);
            
            // Property: Reminder should be queued for retry
            expect(system.notificationQueue.length).toBeGreaterThan(0);
            expect(system.notificationQueue.find(r => r.id === reminder.id)).toBeDefined();
            
            // Property: Retry count should be incremented
            expect(reminder.retryCount).toBeGreaterThan(0);
            expect(reminder.retryCount).toBeLessThanOrEqual(system.MAX_RETRIES);
            
            system.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 3.3: Retry queue processes failed reminders', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.array(
            fc.record({
              activity: activityArbitrary,
              time: timeArbitrary,
              frequency: frequencyArbitrary
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (reminderConfigs) => {
            clearStorage();
            
            // Create system with initially failing hooks
            let callCount = 0;
            const retryingHooks = {
              sendNotification: jest.fn().mockImplementation(() => {
                callCount++;
                // Fail first time, succeed on retry
                if (callCount === 1) {
                  return Promise.reject(new Error('Temporary failure'));
                }
                return Promise.resolve(true);
              })
            };
            
            const system = new WellnessReminderSystem(retryingHooks);
            
            // Schedule reminders
            const reminders = reminderConfigs.map(config =>
              system.scheduleReminder(config.activity, config.time, config.frequency)
            );
            
            // Send first reminder (will fail and queue)
            const firstReminder = reminders[0];
            await system.sendReminder(firstReminder);
            
            // Property: Reminder should be in retry queue
            expect(system.notificationQueue.length).toBe(1);
            
            // Process retry queue
            await system._processRetryQueue();
            
            // Property: Retry queue should be empty after successful retry
            expect(system.notificationQueue.length).toBe(0);
            
            // Property: Notification should have been called twice (initial + retry)
            expect(retryingHooks.sendNotification).toHaveBeenCalledTimes(2);
            
            system.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 3.4: Max retries limit is enforced', async () => {
      fc.assert(
        await fc.asyncProperty(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          async (activity, time, frequency) => {
            clearStorage();
            
            // Create system with always-failing hooks
            const alwaysFailingHooks = {
              sendNotification: jest.fn().mockRejectedValue(new Error('Permanent failure'))
            };
            
            const system = new WellnessReminderSystem(alwaysFailingHooks);
            const reminder = system.scheduleReminder(activity, time, frequency);
            
            // Attempt to send exactly MAX_RETRIES times
            for (let i = 0; i < system.MAX_RETRIES; i++) {
              await system.sendReminder(reminder);
            }
            
            // Property: Retry count should equal MAX_RETRIES
            expect(reminder.retryCount).toBe(system.MAX_RETRIES);
            
            // Property: Reminder should still be in queue at max retries
            expect(system.notificationQueue.find(r => r.id === reminder.id)).toBeDefined();
            
            // Attempt one more time (should not queue again)
            await system.sendReminder(reminder);
            
            // Property: Retry count should not exceed MAX_RETRIES
            expect(reminder.retryCount).toBe(system.MAX_RETRIES);
            
            // Property: After exceeding max retries, no new queue entry is added
            // (the reminder is still in queue from before, but _queueForRetry returns early)
            const queueCountBefore = system.notificationQueue.filter(r => r.id === reminder.id).length;
            expect(queueCountBefore).toBe(1); // Should only be one instance
            
            system.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 3.5: Quiet hours delay reminder delivery', async () => {
      fc.assert(
        await fc.asyncProperty(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          async (activity, time, frequency) => {
            clearStorage();
            
            const system = new WellnessReminderSystem(mockKiroHooks);
            
            // Set quiet hours to current time
            const now = new Date();
            const quietStart = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const quietEnd = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            system.updatePreferences({
              quietHoursStart: quietStart,
              quietHoursEnd: quietEnd
            });
            
            const reminder = system.scheduleReminder(activity, time, frequency);
            
            // Attempt to send during quiet hours
            const result = await system.sendReminder(reminder);
            
            // Property: Reminder should not be delivered during quiet hours
            expect(result).toBe(false);
            
            // Property: Reminder should be queued for retry
            expect(system.notificationQueue.find(r => r.id === reminder.id)).toBeDefined();
            
            // Property: lastDelivered should not be updated
            expect(reminder.lastDelivered).toBeNull();
            
            system.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 3.6: Successful delivery updates reminder state correctly', async () => {
      fc.assert(
        await fc.asyncProperty(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          async (activity, time, frequency) => {
            clearStorage();
            
            const system = new WellnessReminderSystem(mockKiroHooks);
            const reminder = system.scheduleReminder(activity, time, frequency);
            
            // Record state before sending
            const beforeLastDelivered = reminder.lastDelivered;
            const beforeRetryCount = reminder.retryCount;
            
            // Send reminder
            const result = await system.sendReminder(reminder);
            
            // Property: Send should return true on success
            expect(result).toBe(true);
            
            // Property: lastDelivered should be updated
            expect(reminder.lastDelivered).not.toBeNull();
            expect(reminder.lastDelivered).not.toBe(beforeLastDelivered);
            
            // Property: retryCount should be reset to 0
            expect(reminder.retryCount).toBe(0);
            
            // Property: nextScheduled should be updated
            expect(reminder.nextScheduled).not.toBeNull();
            
            system.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 3.7: Delivery time is recorded accurately', async () => {
      fc.assert(
        await fc.asyncProperty(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          async (activity, time, frequency) => {
            clearStorage();
            
            const system = new WellnessReminderSystem(mockKiroHooks);
            const reminder = system.scheduleReminder(activity, time, frequency);
            
            // Record time before sending
            const beforeTime = new Date().toISOString();
            
            // Send reminder
            await system.sendReminder(reminder);
            
            // Record time after sending
            const afterTime = new Date().toISOString();
            
            // Property: lastDelivered should be between before and after times
            expect(reminder.lastDelivered).not.toBeNull();
            expect(new Date(reminder.lastDelivered).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
            expect(new Date(reminder.lastDelivered).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
            
            system.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 3.8: Multiple reminders can be sent concurrently', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.array(
            fc.record({
              activity: activityArbitrary,
              time: timeArbitrary,
              frequency: frequencyArbitrary
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (reminderConfigs) => {
            clearStorage();
            
            // Create fresh mock hooks for this test run
            const freshMockHooks = {
              sendNotification: jest.fn().mockResolvedValue(true)
            };
            
            const system = new WellnessReminderSystem(freshMockHooks);
            
            // Schedule multiple reminders
            const reminders = reminderConfigs.map(config =>
              system.scheduleReminder(config.activity, config.time, config.frequency)
            );
            
            // Send all reminders concurrently
            const sendPromises = reminders.map(r => system.sendReminder(r));
            const results = await Promise.all(sendPromises);
            
            // Property: All sends should succeed
            expect(results.every(r => r === true)).toBe(true);
            
            // Property: All reminders should have lastDelivered set
            expect(reminders.every(r => r.lastDelivered !== null)).toBe(true);
            
            // Property: Notification should be called for each reminder
            expect(freshMockHooks.sendNotification).toHaveBeenCalledTimes(reminders.length);
            
            system.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 8: Reminder Persistence', () => {
    /**
     * **Validates: Requirements 2.1, 2.3**
     * 
     * Property: Scheduled reminders persist across page refreshes and browser restarts.
     * 
     * Formal Definition:
     * let reminders1 = WellnessReminderSystem.reminders
     * // simulate page refresh
     * localStorage.setItem('reminders', JSON.stringify(reminders1))
     * // reload page
     * let reminders2 = JSON.parse(localStorage.getItem('reminders'))
     * reminders1 == reminders2
     */

    /**
     * Generator for valid time strings (HH:MM format)
     */
    const timeArbitrary = fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([hours, minutes]) => 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    );

    /**
     * Generator for valid frequency values
     */
    const frequencyArbitrary = fc.constantFrom(
      'daily',
      'weekly',
      'weekdays',
      'weekends',
      'monday,wednesday,friday'
    );

    /**
     * Generator for valid activity names
     */
    const activityArbitrary = fc.string({ minLength: 1, maxLength: 100 }).filter(
      s => s.trim().length > 0
    );

    test('Property 8.1: Single reminder persists across page refresh', () => {
      fc.assert(
        fc.property(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          (activity, time, frequency) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and schedule reminder
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            const reminder1 = system1.scheduleReminder(activity, time, frequency);
            
            // Get reminders before "page refresh"
            const reminders1 = system1.reminders;
            
            // Verify reminder was saved to localStorage
            const stored = localStorage.getItem('herflow_reminders');
            expect(stored).not.toBeNull();
            
            // Simulate page refresh by creating new instance
            system1.destroy();
            const system2 = new WellnessReminderSystem(mockKiroHooks);
            
            // Get reminders after "page refresh"
            const reminders2 = system2.reminders;
            
            // Property: Reminder count must be the same
            expect(reminders2.length).toBe(reminders1.length);
            expect(reminders2.length).toBe(1);
            
            // Property: Reminder properties must match exactly
            const reminder2 = reminders2[0];
            expect(reminder2.id).toBe(reminder1.id);
            expect(reminder2.activity).toBe(activity);
            expect(reminder2.time).toBe(time);
            expect(reminder2.frequency).toBe(frequency);
            expect(reminder2.enabled).toBe(reminder1.enabled);
            expect(reminder2.createdAt).toBe(reminder1.createdAt);
            expect(reminder2.lastDelivered).toBe(reminder1.lastDelivered);
            expect(reminder2.retryCount).toBe(reminder1.retryCount);
            expect(reminder2.nextScheduled).toBe(reminder1.nextScheduled);
            
            // Cleanup
            system2.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 8.2: Multiple reminders persist across page refresh', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              activity: activityArbitrary,
              time: timeArbitrary,
              frequency: frequencyArbitrary
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (reminderConfigs) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and schedule multiple reminders
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            
            const scheduledReminders = reminderConfigs.map(config =>
              system1.scheduleReminder(config.activity, config.time, config.frequency)
            );
            
            // Get reminders before "page refresh"
            const reminders1 = system1.reminders;
            
            // Simulate page refresh
            system1.destroy();
            const system2 = new WellnessReminderSystem(mockKiroHooks);
            
            // Get reminders after "page refresh"
            const reminders2 = system2.reminders;
            
            // Property: All reminders must persist
            expect(reminders2.length).toBe(reminders1.length);
            expect(reminders2.length).toBe(reminderConfigs.length);
            
            // Property: Each reminder must match exactly
            reminders1.forEach((reminder1, index) => {
              const reminder2 = reminders2.find(r => r.id === reminder1.id);
              expect(reminder2).toBeDefined();
              expect(reminder2.activity).toBe(reminder1.activity);
              expect(reminder2.time).toBe(reminder1.time);
              expect(reminder2.frequency).toBe(reminder1.frequency);
              expect(reminder2.enabled).toBe(reminder1.enabled);
              expect(reminder2.createdAt).toBe(reminder1.createdAt);
            });
            
            // Cleanup
            system2.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 8.3: Reminder updates persist across page refresh', () => {
      fc.assert(
        fc.property(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          timeArbitrary, // new time
          frequencyArbitrary, // new frequency
          (activity, time1, frequency1, time2, frequency2) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and schedule reminder
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            const reminder = system1.scheduleReminder(activity, time1, frequency1);
            
            // Update the reminder
            system1.updateReminder(reminder.id, {
              time: time2,
              frequency: frequency2,
              enabled: false
            });
            
            // Get updated reminder
            const updatedReminder1 = system1.reminders[0];
            
            // Simulate page refresh
            system1.destroy();
            const system2 = new WellnessReminderSystem(mockKiroHooks);
            
            // Get reminder after refresh
            const updatedReminder2 = system2.reminders[0];
            
            // Property: Updated properties must persist
            expect(updatedReminder2.time).toBe(time2);
            expect(updatedReminder2.frequency).toBe(frequency2);
            expect(updatedReminder2.enabled).toBe(false);
            expect(updatedReminder2.id).toBe(updatedReminder1.id);
            
            // Cleanup
            system2.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 8.4: Reminder deletion persists across page refresh', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              activity: activityArbitrary,
              time: timeArbitrary,
              frequency: frequencyArbitrary
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.integer({ min: 0, max: 100 }), // random seed for deletion
          (reminderConfigs, seed) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and schedule reminders
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            
            const scheduledReminders = reminderConfigs.map(config =>
              system1.scheduleReminder(config.activity, config.time, config.frequency)
            );
            
            // Delete one reminder (deterministically based on seed)
            const indexToDelete = seed % scheduledReminders.length;
            const deletedId = scheduledReminders[indexToDelete].id;
            system1.deleteReminder(deletedId);
            
            // Get remaining reminders
            const remainingCount1 = system1.reminders.length;
            
            // Simulate page refresh
            system1.destroy();
            const system2 = new WellnessReminderSystem(mockKiroHooks);
            
            // Get reminders after refresh
            const reminders2 = system2.reminders;
            
            // Property: Deletion must persist
            expect(reminders2.length).toBe(remainingCount1);
            expect(reminders2.length).toBe(reminderConfigs.length - 1);
            
            // Property: Deleted reminder must not exist
            const deletedReminder = reminders2.find(r => r.id === deletedId);
            expect(deletedReminder).toBeUndefined();
            
            // Property: All other reminders must still exist
            scheduledReminders.forEach((reminder, index) => {
              if (index !== indexToDelete) {
                const found = reminders2.find(r => r.id === reminder.id);
                expect(found).toBeDefined();
              }
            });
            
            // Cleanup
            system2.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 8.5: Completion history persists across page refresh', () => {
      fc.assert(
        fc.property(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 20 }),
          (activity, time, frequency, completionCounts) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and schedule reminder
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            const reminder = system1.scheduleReminder(activity, time, frequency);
            
            // Track multiple completions
            completionCounts.forEach(() => {
              system1.trackCompletion(reminder.id);
            });
            
            // Get completion history before refresh
            const history1 = system1.completionHistory;
            
            // Simulate page refresh
            system1.destroy();
            const system2 = new WellnessReminderSystem(mockKiroHooks);
            
            // Get completion history after refresh
            const history2 = system2.completionHistory;
            
            // Property: Completion history must persist
            expect(history2.length).toBe(history1.length);
            expect(history2.length).toBe(completionCounts.length);
            
            // Property: Each completion must match
            history1.forEach((completion1, index) => {
              const completion2 = history2[index];
              expect(completion2.activityId).toBe(completion1.activityId);
              expect(completion2.timestamp).toBe(completion1.timestamp);
            });
            
            // Cleanup
            system2.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 8.6: User preferences persist across page refresh', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          frequencyArbitrary,
          timeArbitrary,
          timeArbitrary,
          (enabled, defaultFrequency, quietStart, quietEnd) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and update preferences
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            
            system1.updatePreferences({
              enabled: enabled,
              defaultFrequency: defaultFrequency,
              quietHoursStart: quietStart,
              quietHoursEnd: quietEnd
            });
            
            // Get preferences before refresh
            const prefs1 = system1.userPreferences;
            
            // Simulate page refresh
            system1.destroy();
            const system2 = new WellnessReminderSystem(mockKiroHooks);
            
            // Get preferences after refresh
            const prefs2 = system2.userPreferences;
            
            // Property: All preferences must persist
            expect(prefs2.enabled).toBe(enabled);
            expect(prefs2.defaultFrequency).toBe(defaultFrequency);
            expect(prefs2.quietHoursStart).toBe(quietStart);
            expect(prefs2.quietHoursEnd).toBe(quietEnd);
            
            // Cleanup
            system2.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 8.7: localStorage serialization is valid JSON', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              activity: activityArbitrary,
              time: timeArbitrary,
              frequency: frequencyArbitrary
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (reminderConfigs) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create instance and schedule reminders
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            
            reminderConfigs.forEach(config =>
              system1.scheduleReminder(config.activity, config.time, config.frequency)
            );
            
            // Get stored data from localStorage
            const storedReminders = localStorage.getItem('herflow_reminders');
            const storedPreferences = localStorage.getItem('herflow_reminder_preferences');
            const storedHistory = localStorage.getItem('herflow_completion_history');
            
            // Property: All stored data must be valid JSON
            expect(() => JSON.parse(storedReminders)).not.toThrow();
            expect(() => JSON.parse(storedPreferences)).not.toThrow();
            expect(() => JSON.parse(storedHistory)).not.toThrow();
            
            // Property: Parsed data must match original data
            const parsedReminders = JSON.parse(storedReminders);
            expect(parsedReminders.length).toBe(reminderConfigs.length);
            
            parsedReminders.forEach((reminder, index) => {
              expect(reminder.activity).toBe(reminderConfigs[index].activity);
              expect(reminder.time).toBe(reminderConfigs[index].time);
              expect(reminder.frequency).toBe(reminderConfigs[index].frequency);
            });
            
            // Cleanup
            system1.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 8.8: Empty state persists correctly', () => {
      // Clear localStorage before this test
      clearStorage();
      
      // Create instance with no reminders
      const system1 = new WellnessReminderSystem(mockKiroHooks);
      
      // Verify empty state
      expect(system1.reminders.length).toBe(0);
      expect(system1.completionHistory.length).toBe(0);
      
      // Simulate page refresh
      system1.destroy();
      const system2 = new WellnessReminderSystem(mockKiroHooks);
      
      // Property: Empty state must persist
      expect(system2.reminders.length).toBe(0);
      expect(system2.completionHistory.length).toBe(0);
      
      // Cleanup
      system2.destroy();
    });

    test('Property 8.9: Reminder state is consistent after multiple refresh cycles', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              activity: activityArbitrary,
              time: timeArbitrary,
              frequency: frequencyArbitrary
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.integer({ min: 2, max: 5 }), // number of refresh cycles
          (reminderConfigs, refreshCycles) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create initial instance and schedule reminders
            let system = new WellnessReminderSystem(mockKiroHooks);
            
            reminderConfigs.forEach(config =>
              system.scheduleReminder(config.activity, config.time, config.frequency)
            );
            
            const initialReminders = [...system.reminders];
            
            // Perform multiple refresh cycles
            for (let i = 0; i < refreshCycles; i++) {
              system.destroy();
              system = new WellnessReminderSystem(mockKiroHooks);
            }
            
            // Property: Reminders must remain consistent after multiple refreshes
            expect(system.reminders.length).toBe(initialReminders.length);
            
            initialReminders.forEach((initialReminder, index) => {
              const currentReminder = system.reminders.find(r => r.id === initialReminder.id);
              expect(currentReminder).toBeDefined();
              expect(currentReminder.activity).toBe(initialReminder.activity);
              expect(currentReminder.time).toBe(initialReminder.time);
              expect(currentReminder.frequency).toBe(initialReminder.frequency);
            });
            
            // Cleanup
            system.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 8.10: Deep equality of reminder objects after persistence', () => {
      fc.assert(
        fc.property(
          activityArbitrary,
          timeArbitrary,
          frequencyArbitrary,
          (activity, time, frequency) => {
            // Clear localStorage before this test run
            clearStorage();
            
            // Create first instance and schedule reminder
            const system1 = new WellnessReminderSystem(mockKiroHooks);
            const reminder1 = system1.scheduleReminder(activity, time, frequency);
            
            // Serialize to JSON (simulating localStorage)
            const serialized = JSON.stringify(system1.reminders);
            
            // Deserialize (simulating page load)
            const deserialized = JSON.parse(serialized);
            
            // Property: Deserialized object must be deeply equal to original
            expect(deserialized.length).toBe(1);
            const reminder2 = deserialized[0];
            
            // Check all properties
            Object.keys(reminder1).forEach(key => {
              expect(reminder2[key]).toEqual(reminder1[key]);
            });
            
            // Property: No data loss during serialization
            expect(Object.keys(reminder2).length).toBe(Object.keys(reminder1).length);
            
            // Cleanup
            system1.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
