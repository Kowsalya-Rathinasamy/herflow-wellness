/**
 * Unit tests for TaskAutomationAgent
 * Tests recurring pattern detection, automatic task creation, and learning
 */

const TaskAutomationAgent = require('./task-automation-agent');
const MentalLoadAgent = require('./mental-load-agent');

describe('TaskAutomationAgent', () => {
  let agent;
  let mentalLoadAgent;
  let mockKiroHooks;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock Kiro hooks
    mockKiroHooks = {
      sendNotification: jest.fn().mockResolvedValue(true)
    };

    mentalLoadAgent = new MentalLoadAgent(mockKiroHooks);
    agent = new TaskAutomationAgent(mentalLoadAgent, null, mockKiroHooks);
  });

  afterEach(() => {
    agent.destroy();
    mentalLoadAgent.destroy();
  });

  describe('Pattern Detection', () => {
    test('detects recurring patterns from task history', () => {
      // Add similar tasks over time
      const baseDate = new Date('2024-01-01');
      
      for (let i = 0; i < 5; i++) {
        const task = {
          id: `task_${i}`,
          name: 'Weekly team meeting',
          category: 'work',
          createdAt: new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        agent.addTaskToHistory(task);
      }

      const patterns = agent.detectRecurringPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].template.name).toBe('Weekly team meeting');
      expect(patterns[0].frequency).toBe('weekly');
      expect(patterns[0].occurrences).toBe(5);
    });

    test('requires minimum occurrences for pattern detection', () => {
      agent.addTaskToHistory({
        id: 'task_1',
        name: 'Rare task',
        createdAt: new Date().toISOString()
      });

      const patterns = agent.detectRecurringPatterns();
      expect(patterns.length).toBe(0);
    });

    test('groups similar tasks correctly', () => {
      const tasks = [
        { id: '1', name: 'Buy groceries', createdAt: '2024-01-01' },
        { id: '2', name: 'Buy groceries', createdAt: '2024-01-08' },
        { id: '3', name: 'Buy groceries', createdAt: '2024-01-15' },
        { id: '4', name: 'Different task', createdAt: '2024-01-02' }
      ];

      tasks.forEach(t => agent.addTaskToHistory(t));
      const patterns = agent.detectRecurringPatterns();

      expect(patterns.length).toBe(1);
      expect(patterns[0].template.name).toBe('Buy groceries');
    });

    test('calculates pattern confidence correctly', () => {
      const baseDate = new Date('2024-01-01');
      
      // Add tasks with consistent intervals
      for (let i = 0; i < 4; i++) {
        agent.addTaskToHistory({
          id: `task_${i}`,
          name: 'Consistent task',
          createdAt: new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      const patterns = agent.detectRecurringPatterns();
      expect(patterns[0].confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Automatic Task Creation', () => {
    test('creates task from pattern with confirmation', async () => {
      const pattern = {
        id: 'pattern_1',
        template: {
          name: 'Weekly review',
          category: 'work',
          complexity: 5
        },
        frequency: 'weekly',
        confidence: 0.9
      };

      const result = await agent.createAutomaticTask(pattern, true);

      expect(result.status).toBe('pending_confirmation');
      expect(result.task.name).toBe('Weekly review');
      expect(result.task.autoCreated).toBe(true);
      expect(agent.getPendingConfirmations().length).toBe(1);
    });

    test('creates task without confirmation when disabled', async () => {
      const pattern = {
        id: 'pattern_1',
        template: {
          name: 'Daily standup',
          category: 'work'
        },
        frequency: 'daily',
        confidence: 0.95
      };

      const result = await agent.createAutomaticTask(pattern, false);

      expect(result.status).toBe('created');
      expect(result.task.autoCreated).toBe(true);
      expect(mockKiroHooks.sendNotification).toHaveBeenCalled();
    });

    test('adds created task to mental load agent', async () => {
      const pattern = {
        id: 'pattern_1',
        template: {
          name: 'Test task',
          category: 'home'
        },
        frequency: 'daily',
        confidence: 0.8
      };

      await agent.createAutomaticTask(pattern, false);

      const tasks = mentalLoadAgent.getAllTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe('Test task');
    });

    test('handles confirmation approval', async () => {
      const pattern = {
        id: 'pattern_1',
        template: { name: 'Task', category: 'work' },
        frequency: 'weekly',
        confidence: 0.8
      };

      const result = await agent.createAutomaticTask(pattern, true);
      await agent.confirmTaskCreation(result.task.id, true);

      expect(agent.getPendingConfirmations().length).toBe(0);
      expect(mentalLoadAgent.getAllTasks().length).toBe(1);
    });

    test('handles confirmation rejection', async () => {
      const pattern = {
        id: 'pattern_1',
        template: { name: 'Task', category: 'work' },
        frequency: 'weekly',
        confidence: 0.8
      };

      const result = await agent.createAutomaticTask(pattern, true);
      await agent.confirmTaskCreation(result.task.id, false);

      expect(agent.getPendingConfirmations().length).toBe(0);
      expect(mentalLoadAgent.getAllTasks().length).toBe(0);
    });
  });

  describe('Learning from User Behavior', () => {
    test('tracks task modifications', () => {
      const original = {
        id: 'task_1',
        name: 'Original name',
        complexity: 5
      };

      const modified = {
        id: 'task_1',
        name: 'Modified name',
        complexity: 7
      };

      agent.trackModification(original, modified);

      expect(agent.userBehaviorData.modifications.length).toBe(1);
      expect(agent.userBehaviorData.modifications[0].changes.length).toBe(2);
    });

    test('tracks task deletions', () => {
      const task = {
        id: 'task_1',
        name: 'Deleted task',
        category: 'work'
      };

      agent.trackDeletion(task, 'No longer needed');

      expect(agent.userBehaviorData.deletions.length).toBe(1);
      expect(agent.userBehaviorData.deletions[0].reason).toBe('No longer needed');
    });

    test('reduces pattern confidence when auto-created task is deleted', () => {
      const pattern = {
        id: 'pattern_1',
        template: { name: 'Task', category: 'work' },
        frequency: 'daily',
        confidence: 0.9
      };

      agent.recurringPatterns.push(pattern);

      const task = {
        id: 'task_1',
        name: 'Task',
        autoCreated: true,
        patternId: 'pattern_1'
      };

      agent.autoCreatedTasks.push(task);
      agent.trackDeletion(task);

      expect(pattern.confidence).toBeLessThan(0.9);
    });

    test('disables pattern when confidence drops too low', () => {
      const pattern = {
        id: 'pattern_1',
        template: { name: 'Task', category: 'work' },
        frequency: 'daily',
        confidence: 0.6
      };

      agent.recurringPatterns.push(pattern);

      const task = {
        id: 'task_1',
        autoCreated: true,
        patternId: 'pattern_1'
      };

      agent.autoCreatedTasks.push(task);
      agent.trackDeletion(task);

      expect(pattern.enabled).toBe(false);
    });

    test('learns from modification patterns', () => {
      const original = { id: '1', name: 'Task', complexity: 5 };
      const modified = { id: '1', name: 'Task', complexity: 8 };

      agent.trackModification(original, modified);

      expect(agent.userBehaviorData.preferences.modify_complexity).toBeDefined();
      expect(agent.userBehaviorData.preferences.modify_complexity.count).toBe(1);
    });
  });

  describe('AI Companion Integration', () => {
    test('provides automation insights', () => {
      agent.recurringPatterns = [
        {
          id: 'pattern_1',
          template: { name: 'Task 1' },
          frequency: 'daily',
          confidence: 0.9
        }
      ];

      const insights = agent.getAutomationInsights();

      expect(insights.recurringPatterns).toBe(1);
      expect(insights.suggestions).toBeDefined();
      expect(insights.learningStats).toBeDefined();
    });

    test('suggests task creation for patterns without active tasks', () => {
      agent.recurringPatterns = [
        {
          id: 'pattern_1',
          template: { name: 'Weekly report' },
          frequency: 'weekly',
          confidence: 0.85
        }
      ];

      const insights = agent.getAutomationInsights();

      expect(insights.suggestions.length).toBeGreaterThan(0);
      expect(insights.suggestions[0].type).toBe('create_task');
    });

    test('suggests delegation when mental load is high', () => {
      // Add tasks to increase mental load
      for (let i = 0; i < 20; i++) {
        mentalLoadAgent.addTask({
          id: `task_${i}`,
          name: `Task ${i}`,
          category: 'work',
          complexity: 7,
          recurring: true // Make tasks delegatable
        });
      }

      const insights = agent.getAutomationInsights();
      
      // Should have suggestions (either delegation or optimization)
      expect(insights.suggestions.length).toBeGreaterThan(0);
      
      // Mental load should be high
      expect(mentalLoadAgent.getCurrentScore()).toBeGreaterThan(70);
    });

    test('configures automation via chat', () => {
      agent.recurringPatterns = [
        { id: 'pattern_1', template: { name: 'Task' }, enabled: true }
      ];

      const config = {
        patternId: 'pattern_1',
        enablePattern: false
      };

      const result = agent.configureViaChat(config);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(agent.recurringPatterns[0].enabled).toBe(false);
    });

    test('adjusts pattern frequency via chat', () => {
      agent.recurringPatterns = [
        { id: 'pattern_1', template: { name: 'Task' }, frequency: 'daily' }
      ];

      const config = {
        patternId: 'pattern_1',
        adjustFrequency: 'weekly'
      };

      const result = agent.configureViaChat(config);

      expect(result.success).toBe(true);
      expect(agent.recurringPatterns[0].frequency).toBe('weekly');
    });
  });

  describe('Data Persistence', () => {
    test('persists task history to localStorage', () => {
      const task = {
        id: 'task_1',
        name: 'Test task',
        createdAt: new Date().toISOString()
      };

      agent.addTaskToHistory(task);

      const stored = JSON.parse(localStorage.getItem('herflow_task_history'));
      expect(stored.length).toBe(1);
      expect(stored[0].name).toBe('Test task');
    });

    test('persists recurring patterns to localStorage', () => {
      agent.recurringPatterns = [
        {
          id: 'pattern_1',
          template: { name: 'Task' },
          frequency: 'daily'
        }
      ];

      agent._saveToStorage();

      const stored = JSON.parse(localStorage.getItem('herflow_recurring_patterns'));
      expect(stored.length).toBe(1);
      expect(stored[0].template.name).toBe('Task');
    });

    test('loads data from localStorage on initialization', () => {
      const taskHistory = [
        { id: 'task_1', name: 'Task 1' }
      ];

      localStorage.setItem('herflow_task_history', JSON.stringify(taskHistory));

      const newAgent = new TaskAutomationAgent(mentalLoadAgent);
      expect(newAgent.taskHistory.length).toBe(1);
      expect(newAgent.taskHistory[0].name).toBe('Task 1');

      newAgent.destroy();
    });

    test('persists user behavior data', () => {
      agent.trackModification(
        { id: '1', name: 'Original' },
        { id: '1', name: 'Modified' }
      );

      const stored = JSON.parse(localStorage.getItem('herflow_user_behavior'));
      expect(stored.modifications.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty task history', () => {
      const patterns = agent.detectRecurringPatterns();
      expect(patterns).toEqual([]);
    });

    test('handles invalid pattern in createAutomaticTask', async () => {
      await expect(agent.createAutomaticTask(null)).rejects.toThrow();
    });

    test('handles invalid task in trackModification', () => {
      expect(() => agent.trackModification(null, {})).toThrow();
    });

    test('handles invalid task in trackDeletion', () => {
      expect(() => agent.trackDeletion(null)).toThrow();
    });

    test('handles non-existent confirmation', async () => {
      await expect(agent.confirmTaskCreation('invalid_id', true)).rejects.toThrow();
    });

    test('handles invalid configuration', () => {
      expect(() => agent.configureViaChat(null)).toThrow();
    });
  });
});
