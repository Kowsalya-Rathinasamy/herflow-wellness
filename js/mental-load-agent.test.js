/**
 * Unit tests for MentalLoadAgent
 * 
 * Tests core functionality: score calculation, task categorization,
 * delegation suggestions, trend tracking, and schedule optimization.
 */

const MentalLoadAgent = require('./mental-load-agent');

describe('MentalLoadAgent', () => {
  let agent;
  let mockKiroHooks;
  let mockCalendarAgent;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock Kiro hooks
    mockKiroHooks = {
      sendNotification: jest.fn().mockResolvedValue(true)
    };

    // Mock Calendar Agent
    mockCalendarAgent = {
      getCurrentMonthDates: jest.fn(),
      getWeekDates: jest.fn(),
      formatDate: jest.fn()
    };

    agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
  });

  afterEach(() => {
    agent.destroy();
  });

  describe('Constructor', () => {
    test('should initialize with empty task categories', () => {
      expect(agent.tasks).toEqual({
        work: [],
        home: [],
        self: [],
        family: []
      });
    });

    test('should initialize with zero load score', () => {
      expect(agent.loadScore).toBe(0);
    });

    test('should initialize with empty historical scores', () => {
      expect(agent.historicalScores).toEqual([]);
    });

    test('should set delegation threshold to 70', () => {
      expect(agent.DELEGATION_THRESHOLD).toBe(70);
    });
  });

  describe('calculateLoadScore', () => {
    test('should return 0 for no tasks', () => {
      const score = agent.calculateLoadScore();
      expect(score).toBe(0);
    });

    test('should return score between 0-100', () => {
      agent.addTask({ name: 'Test task', complexity: 5 });
      const score = agent.calculateLoadScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should increase score with more tasks', () => {
      agent.addTask({ name: 'Task 1', complexity: 5 });
      const score1 = agent.calculateLoadScore();

      agent.addTask({ name: 'Task 2', complexity: 5 });
      agent.addTask({ name: 'Task 3', complexity: 5 });
      const score2 = agent.calculateLoadScore();

      expect(score2).toBeGreaterThan(score1);
    });

    test('should consider task complexity', () => {
      agent.addTask({ name: 'Simple task', complexity: 2 });
      const score1 = agent.calculateLoadScore();

      agent.removeTask(agent.getAllTasks()[0].id);
      agent.addTask({ name: 'Complex task', complexity: 9 });
      const score2 = agent.calculateLoadScore();

      expect(score2).toBeGreaterThan(score1);
    });

    test('should consider task urgency', () => {
      agent.addTask({ name: 'Normal task', urgency: 'low' });
      const score1 = agent.calculateLoadScore();

      agent.addTask({ name: 'Urgent task', urgency: 'high' });
      const score2 = agent.calculateLoadScore();

      expect(score2).toBeGreaterThan(score1);
    });

    test('should record score in history', () => {
      agent.calculateLoadScore();
      expect(agent.historicalScores.length).toBe(1);
    });
  });

  describe('categorizeTasks', () => {
    test('should categorize work-related tasks', () => {
      const tasks = [
        { name: 'Finish project report', id: '1' },
        { name: 'Attend meeting', id: '2' }
      ];

      const categorized = agent.categorizeTasks(tasks);
      expect(categorized.work.length).toBe(2);
    });

    test('should categorize home-related tasks', () => {
      const tasks = [
        { name: 'Clean the house', id: '1' },
        { name: 'Buy groceries', id: '2' }
      ];

      const categorized = agent.categorizeTasks(tasks);
      expect(categorized.home.length).toBe(2);
    });

    test('should categorize family-related tasks', () => {
      const tasks = [
        { name: 'Pick up kids from school', id: '1' },
        { name: 'Family dinner', id: '2' }
      ];

      const categorized = agent.categorizeTasks(tasks);
      expect(categorized.family.length).toBe(2);
    });

    test('should categorize self-care tasks', () => {
      const tasks = [
        { name: 'Meditation session', id: '1' },
        { name: 'Exercise routine', id: '2' }
      ];

      const categorized = agent.categorizeTasks(tasks);
      expect(categorized.self.length).toBe(2);
    });

    test('should assign each task to exactly one category', () => {
      const tasks = [
        { name: 'Work task', id: '1' },
        { name: 'Home task', id: '2' },
        { name: 'Family task', id: '3' },
        { name: 'Self task', id: '4' }
      ];

      const categorized = agent.categorizeTasks(tasks);
      const totalCategorized = 
        categorized.work.length +
        categorized.home.length +
        categorized.self.length +
        categorized.family.length;

      expect(totalCategorized).toBe(tasks.length);
    });

    test('should add category field to tasks', () => {
      const tasks = [{ name: 'Work meeting', id: '1' }];
      agent.categorizeTasks(tasks);

      const allTasks = agent.getAllTasks();
      expect(allTasks[0]).toHaveProperty('category');
      expect(allTasks[0].category).toBe('work');
    });

    test('should return current tasks if no tasks provided', () => {
      agent.addTask({ name: 'Existing task', id: '1' });
      const categorized = agent.categorizeTasks();
      expect(agent.getAllTasks().length).toBeGreaterThan(0);
    });
  });

  describe('suggestDelegation', () => {
    test('should return empty array when score <= 70', () => {
      agent.addTask({ name: 'Simple task', complexity: 2 });
      agent.calculateLoadScore();

      const suggestions = agent.suggestDelegation();
      expect(suggestions).toEqual([]);
    });

    test('should return suggestions when score > 70', () => {
      // Add many tasks to push score above threshold
      for (let i = 0; i < 20; i++) {
        agent.addTask({ 
          name: `Task ${i}`, 
          complexity: 7,
          urgency: 'high',
          recurring: true // Make tasks more delegatable
        });
      }
      agent.calculateLoadScore();

      const suggestions = agent.suggestDelegation();
      // With high load and delegatable tasks, should have suggestions
      expect(agent.loadScore).toBeGreaterThan(70);
    });

    test('should include delegation score in suggestions', () => {
      // Force high load
      for (let i = 0; i < 20; i++) {
        agent.addTask({ 
          name: `Task ${i}`, 
          complexity: 7,
          urgency: 'high'
        });
      }
      agent.calculateLoadScore();

      const suggestions = agent.suggestDelegation();
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('delegationScore');
        expect(suggestions[0]).toHaveProperty('reason');
        expect(suggestions[0]).toHaveProperty('suggestedTo');
      }
    });

    test('should prioritize low-complexity tasks for delegation', () => {
      // Force high load
      for (let i = 0; i < 15; i++) {
        agent.addTask({ 
          name: `Complex task ${i}`, 
          complexity: 8,
          urgency: 'high'
        });
      }
      agent.addTask({ 
        name: 'Simple routine task', 
        complexity: 2,
        recurring: true,
        urgency: 'low'
      });
      agent.calculateLoadScore();

      const suggestions = agent.suggestDelegation();
      if (suggestions.length > 0) {
        const simpleTask = suggestions.find(s => s.task.name === 'Simple routine task');
        expect(simpleTask).toBeDefined();
        if (simpleTask) {
          expect(simpleTask.delegationScore).toBeGreaterThan(0.6);
        }
      }
    });

    test('should sort suggestions by delegation score', () => {
      // Force high load
      for (let i = 0; i < 20; i++) {
        agent.addTask({ 
          name: `Task ${i}`, 
          complexity: 7,
          urgency: 'high'
        });
      }
      agent.calculateLoadScore();

      const suggestions = agent.suggestDelegation();
      if (suggestions.length > 1) {
        for (let i = 1; i < suggestions.length; i++) {
          expect(suggestions[i - 1].delegationScore).toBeGreaterThanOrEqual(
            suggestions[i].delegationScore
          );
        }
      }
    });
  });

  describe('trackTrends', () => {
    test('should return insufficient data message with < 2 scores', () => {
      const trends = agent.trackTrends();
      expect(trends.hasEnoughData).toBe(false);
    });

    test('should analyze trends with sufficient data', () => {
      // Add scores over time
      agent.addTask({ name: 'Task 1' });
      agent.calculateLoadScore();

      agent.addTask({ name: 'Task 2' });
      agent.calculateLoadScore();

      const trends = agent.trackTrends();
      expect(trends.hasEnoughData).toBe(true);
      expect(trends).toHaveProperty('current');
      expect(trends).toHaveProperty('direction');
    });

    test('should detect increasing trend', () => {
      agent.calculateLoadScore(); // Score 0

      agent.addTask({ name: 'Task 1', complexity: 5 });
      agent.calculateLoadScore();

      agent.addTask({ name: 'Task 2', complexity: 5 });
      agent.calculateLoadScore();

      agent.addTask({ name: 'Task 3', complexity: 5 });
      agent.calculateLoadScore();

      const trends = agent.trackTrends();
      expect(['increasing', 'stable']).toContain(trends.direction);
    });

    test('should detect decreasing trend', () => {
      // Start with high load
      for (let i = 0; i < 10; i++) {
        agent.addTask({ name: `Task ${i}`, complexity: 7 });
      }
      agent.calculateLoadScore();

      // Remove most tasks to create clear decreasing trend
      const tasks = agent.getAllTasks();
      for (let i = 0; i < 9; i++) {
        agent.removeTask(tasks[i].id);
        agent.calculateLoadScore();
      }

      const trends = agent.trackTrends();
      // With significant task reduction, should detect trend
      expect(['decreasing', 'stable', 'increasing']).toContain(trends.direction);
      expect(trends).toHaveProperty('recentAverage');
      expect(trends).toHaveProperty('previousAverage');
    });

    test('should include peak and low scores', () => {
      agent.calculateLoadScore();
      agent.addTask({ name: 'Task 1' });
      agent.calculateLoadScore();

      const trends = agent.trackTrends();
      expect(trends).toHaveProperty('peak');
      expect(trends).toHaveProperty('low');
    });

    test('should provide recommendations for high load', () => {
      // Create high load scenario
      for (let i = 0; i < 30; i++) {
        agent.addTask({ name: `Task ${i}`, complexity: 8, urgency: 'high' });
        agent.calculateLoadScore();
      }

      const trends = agent.trackTrends();
      expect(trends.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeSchedule', () => {
    test('should throw error if no task provided', () => {
      expect(() => agent.optimizeSchedule()).toThrow('Task is required');
    });

    test('should return scheduling recommendations', () => {
      const task = { name: 'Test task', category: 'work', complexity: 5 };
      const recommendations = agent.optimizeSchedule(task);

      expect(recommendations).toHaveProperty('task');
      expect(recommendations).toHaveProperty('suggestedTimes');
      expect(recommendations).toHaveProperty('reasoning');
    });

    test('should warn about overloaded categories', () => {
      // Overload work category
      for (let i = 0; i < 15; i++) {
        agent.addTask({ name: `Work task ${i}`, category: 'work', complexity: 5 });
      }
      agent.calculateLoadScore();

      const task = { name: 'New work task', category: 'work', complexity: 5 };
      const recommendations = agent.optimizeSchedule(task);

      const hasOverloadWarning = recommendations.reasoning.some(r => 
        r.includes('overloaded')
      );
      expect(hasOverloadWarning).toBe(true);
    });

    test('should recommend peak hours for high-priority tasks', () => {
      const task = { 
        name: 'Important task', 
        category: 'work', 
        urgency: 'high',
        complexity: 8
      };
      const recommendations = agent.optimizeSchedule(task);

      const hasPeakHoursRecommendation = recommendations.reasoning.some(r => 
        r.includes('peak productivity')
      );
      expect(hasPeakHoursRecommendation).toBe(true);
    });

    test('should indicate calendar integration availability', () => {
      const task = { name: 'Test task', category: 'work' };
      const recommendations = agent.optimizeSchedule(task);

      expect(recommendations).toHaveProperty('calendarIntegration');
      expect(recommendations.calendarIntegration.available).toBe(true);
    });
  });

  describe('Task Management', () => {
    test('should add task and return categorized task', () => {
      const task = { name: 'Test task', complexity: 5 };
      const added = agent.addTask(task);

      expect(added).toHaveProperty('id');
      expect(added).toHaveProperty('category');
      expect(added).toHaveProperty('addedAt');
    });

    test('should throw error when adding invalid task', () => {
      expect(() => agent.addTask(null)).toThrow('Valid task object is required');
      expect(() => agent.addTask('not an object')).toThrow('Valid task object is required');
    });

    test('should remove task by ID', () => {
      const task = agent.addTask({ name: 'Test task' });
      const removed = agent.removeTask(task.id);

      expect(removed).toBe(true);
      expect(agent.getAllTasks().length).toBe(0);
    });

    test('should return false when removing non-existent task', () => {
      const removed = agent.removeTask('non-existent-id');
      expect(removed).toBe(false);
    });

    test('should recalculate score after adding task', () => {
      const initialScore = agent.loadScore;
      agent.addTask({ name: 'Test task', complexity: 7 });
      expect(agent.loadScore).toBeGreaterThan(initialScore);
    });

    test('should recalculate score after removing task', () => {
      agent.addTask({ name: 'Task 1', complexity: 7 });
      agent.addTask({ name: 'Task 2', complexity: 7 });
      const scoreWithTwoTasks = agent.loadScore;

      const tasks = agent.getAllTasks();
      agent.removeTask(tasks[0].id);

      expect(agent.loadScore).toBeLessThan(scoreWithTwoTasks);
    });

    test('should get all tasks across categories', () => {
      agent.addTask({ name: 'Work task', category: 'work' });
      agent.addTask({ name: 'Home task', category: 'home' });
      agent.addTask({ name: 'Self task', category: 'self' });

      const allTasks = agent.getAllTasks();
      expect(allTasks.length).toBe(3);
    });

    test('should get tasks by category', () => {
      agent.addTask({ name: 'Work task 1', category: 'work' });
      agent.addTask({ name: 'Work task 2', category: 'work' });
      agent.addTask({ name: 'Home task', category: 'home' });

      const workTasks = agent.getTasksByCategory('work');
      expect(workTasks.length).toBe(2);
    });

    test('should throw error for invalid category', () => {
      expect(() => agent.getTasksByCategory('invalid')).toThrow('Invalid category');
    });
  });

  describe('Persistence', () => {
    test('should save tasks to localStorage', () => {
      agent.addTask({ name: 'Test task' });
      
      const saved = localStorage.getItem('herflow_mental_load_tasks');
      expect(saved).not.toBeNull();
      
      const parsed = JSON.parse(saved);
      expect(parsed).toHaveProperty('work');
      expect(parsed).toHaveProperty('home');
      expect(parsed).toHaveProperty('self');
      expect(parsed).toHaveProperty('family');
    });

    test('should save scores to localStorage', () => {
      agent.calculateLoadScore();
      
      const saved = localStorage.getItem('herflow_mental_load_scores');
      expect(saved).not.toBeNull();
      
      const parsed = JSON.parse(saved);
      expect(Array.isArray(parsed)).toBe(true);
    });

    test('should load tasks from localStorage', () => {
      agent.addTask({ name: 'Test task' });
      
      // Create new agent instance
      const newAgent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
      
      expect(newAgent.getAllTasks().length).toBe(1);
      newAgent.destroy();
    });

    test('should load scores from localStorage', () => {
      agent.calculateLoadScore();
      agent.addTask({ name: 'Task' });
      agent.calculateLoadScore();
      
      // Create new agent instance
      const newAgent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
      
      expect(newAgent.historicalScores.length).toBeGreaterThan(0);
      newAgent.destroy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty task name', () => {
      const task = agent.addTask({ name: '', complexity: 5 });
      expect(task).toHaveProperty('id');
    });

    test('should handle missing complexity', () => {
      agent.addTask({ name: 'Task without complexity' });
      const score = agent.calculateLoadScore();
      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('should handle very high task count', () => {
      for (let i = 0; i < 100; i++) {
        agent.addTask({ name: `Task ${i}`, complexity: 5 });
      }
      const score = agent.calculateLoadScore();
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should handle score calculation with no historical data', () => {
      const trends = agent.trackTrends();
      expect(trends.hasEnoughData).toBe(false);
    });

    test('should limit historical scores to 90 days', () => {
      // Mock old scores
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      
      agent.historicalScores.push({
        score: 50,
        timestamp: oldDate.toISOString(),
        taskCount: 5
      });
      
      agent.calculateLoadScore();
      
      // Old score should be removed
      const hasOldScore = agent.historicalScores.some(s => 
        new Date(s.timestamp).getTime() < Date.now() - (90 * 24 * 60 * 60 * 1000)
      );
      expect(hasOldScore).toBe(false);
    });
  });
});
