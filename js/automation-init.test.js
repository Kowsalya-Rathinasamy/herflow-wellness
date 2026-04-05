/**
 * Integration tests for automation initialization
 * Tests that all components wire together correctly
 */

describe('Automation Initialization Integration', () => {
  beforeEach(() => {
    // Mock localStorage
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
  });

  afterEach(() => {
    delete global.localStorage;
  });

  test('All component classes are available', () => {
    const CalendarAgentAdapter = require('./calendar-agent-adapter.js');
    const CalendarAutomation = require('./calendar-automation.js');
    const WellnessReminderSystem = require('./wellness-reminders.js');
    const MentalLoadAgent = require('./mental-load-agent.js');
    const TaskAutomationAgent = require('./task-automation-agent.js');
    const AutomationConfig = require('./automation-config.js');

    expect(CalendarAgentAdapter).toBeDefined();
    expect(CalendarAutomation).toBeDefined();
    expect(WellnessReminderSystem).toBeDefined();
    expect(MentalLoadAgent).toBeDefined();
    expect(TaskAutomationAgent).toBeDefined();
    expect(AutomationConfig).toBeDefined();
  });

  test('CalendarAgentAdapter can be instantiated', () => {
    const CalendarAgentAdapter = require('./calendar-agent-adapter.js');
    const adapter = new CalendarAgentAdapter('/api/test');
    
    expect(adapter).toBeDefined();
    expect(adapter.endpoint).toBe('/api/test');
    expect(adapter.cache).toBeDefined();
    expect(adapter.cache.size).toBe(0);
  });

  test('AutomationConfig loads and saves preferences', () => {
    const AutomationConfig = require('./automation-config.js');
    const config = new AutomationConfig();
    
    // Check default config
    expect(config.config.calendarAutomation.enabled).toBe(true);
    expect(config.config.wellnessReminders.enabled).toBe(true);
    expect(config.config.mentalLoadTracking.enabled).toBe(true);
    expect(config.config.taskAutomation.enabled).toBe(true);

    // Update config
    const updated = config.updateConfig({
      wellnessReminders: {
        enabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        defaultFrequency: 'daily'
      }
    });

    expect(updated.wellnessReminders.enabled).toBe(false);
    expect(updated.wellnessReminders.quietHoursStart).toBe('22:00');

    // Verify saved to localStorage
    const stored = JSON.parse(global.localStorage.getItem('herflow_automation_config'));
    expect(stored.wellnessReminders.enabled).toBe(false);
  });

  test('WellnessReminderSystem can be instantiated', () => {
    const WellnessReminderSystem = require('./wellness-reminders.js');
    const system = new WellnessReminderSystem(null);
    
    expect(system).toBeDefined();
    expect(system.reminders).toEqual([]);
    expect(system.userPreferences.enabled).toBe(true);
  });

  test('MentalLoadAgent can be instantiated', () => {
    const MentalLoadAgent = require('./mental-load-agent.js');
    const agent = new MentalLoadAgent(null, null);
    
    expect(agent).toBeDefined();
    expect(agent.loadScore).toBe(0);
    expect(agent.tasks).toBeDefined();
    expect(agent.tasks.work).toEqual([]);
    expect(agent.tasks.home).toEqual([]);
    expect(agent.tasks.self).toEqual([]);
    expect(agent.tasks.family).toEqual([]);
  });

  test('TaskAutomationAgent can be instantiated', () => {
    const TaskAutomationAgent = require('./task-automation-agent.js');
    const agent = new TaskAutomationAgent(null, null, null);
    
    expect(agent).toBeDefined();
    expect(agent.taskHistory).toEqual([]);
    expect(agent.recurringPatterns).toEqual([]);
    expect(agent.autoCreatedTasks).toEqual([]);
  });

  test('Components integrate correctly', () => {
    const CalendarAgentAdapter = require('./calendar-agent-adapter.js');
    const MentalLoadAgent = require('./mental-load-agent.js');
    const TaskAutomationAgent = require('./task-automation-agent.js');

    const calendarAgent = new CalendarAgentAdapter('/api/test');
    const mentalLoadAgent = new MentalLoadAgent(null, calendarAgent);
    const taskAutomation = new TaskAutomationAgent(mentalLoadAgent, calendarAgent, null);

    expect(taskAutomation.mentalLoadAgent).toBe(mentalLoadAgent);
    expect(taskAutomation.calendarAgent).toBe(calendarAgent);
    expect(mentalLoadAgent.calendarAgent).toBe(calendarAgent);
  });

  test('Configuration can be reset', () => {
    const AutomationConfig = require('./automation-config.js');
    const config = new AutomationConfig();
    
    // Modify config
    config.updateConfig({
      wellnessReminders: { enabled: false }
    });
    expect(config.config.wellnessReminders.enabled).toBe(false);

    // Reset
    config.resetConfig();
    expect(config.config.wellnessReminders.enabled).toBe(true);
  });
});
