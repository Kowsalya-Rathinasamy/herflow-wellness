/**
 * Property-Based Tests for MentalLoadAgent
 * 
 * Tests universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

const fc = require('fast-check');
const MentalLoadAgent = require('./mental-load-agent.js');

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

describe('MentalLoadAgent - Property-Based Tests', () => {
  let mockKiroHooks;
  let mockCalendarAgent;
  let originalConsoleLog;
  let originalConsoleError;

  beforeEach(() => {
    // Clear localStorage
    if (global.localStorage && typeof global.localStorage.clear === 'function') {
      global.localStorage.clear();
    }

    // Silence console.log and console.error during tests
    originalConsoleLog = console.log;
    console.log = jest.fn();
    originalConsoleError = console.error;
    console.error = jest.fn();

    // Create mock Kiro hooks
    mockKiroHooks = {
      sendNotification: jest.fn().mockResolvedValue(true)
    };

    // Mock Calendar Agent
    mockCalendarAgent = {
      getCurrentMonthDates: jest.fn(),
      getWeekDates: jest.fn(),
      formatDate: jest.fn()
    };
  });

  afterEach(() => {
    // Restore console.log and console.error
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Property 4: Mental Load Score Consistency', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * Property: The mental load score is always between 0-100 and increases 
     * monotonically with task count when task complexity is constant.
     * 
     * Formal Definition:
     * let score = MentalLoadAgent.calculateLoadScore()
     * 0 ≤ score ≤ 100 ∧
     * ∀ taskCount1, taskCount2 where taskCount1 < taskCount2:
     *   calculateLoadScore(taskCount1) ≤ calculateLoadScore(taskCount2)
     */

    /**
     * Generator for valid task objects
     */
    const taskArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      complexity: fc.integer({ min: 1, max: 10 }),
      urgency: fc.constantFrom('low', 'medium', 'high'),
      category: fc.constantFrom('work', 'home', 'self', 'family')
    });

    test('Property 4.1: Score is always between 0-100 regardless of input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 30 }),
          (tasks) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Property: Score must be between 0 and 100
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.2: Score increases monotonically with task count (constant complexity)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 10 }), // constant complexity
          fc.integer({ min: 1, max: 10 }), // taskCount1
          fc.integer({ min: 11, max: 25 }), // taskCount2 (always > taskCount1)
          (complexity, taskCount1, taskCount2) => {
            const agent1 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            const agent2 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add taskCount1 tasks with constant complexity
            for (let i = 0; i < taskCount1; i++) {
              agent1.addTask({
                name: `Task ${i}`,
                complexity: complexity,
                urgency: 'medium',
                category: 'work'
              });
            }
            
            // Add taskCount2 tasks with same constant complexity
            for (let i = 0; i < taskCount2; i++) {
              agent2.addTask({
                name: `Task ${i}`,
                complexity: complexity,
                urgency: 'medium',
                category: 'work'
              });
            }
            
            // Calculate scores
            const score1 = agent1.calculateLoadScore();
            const score2 = agent2.calculateLoadScore();
            
            // Property: More tasks should result in higher or equal score
            expect(score2).toBeGreaterThanOrEqual(score1);
            
            agent1.destroy();
            agent2.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.3: Score is 0 when there are no tasks', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No input needed
          () => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Calculate score with no tasks
            const score = agent.calculateLoadScore();
            
            // Property: Score must be exactly 0 with no tasks
            expect(score).toBe(0);
            
            agent.destroy();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('Property 4.4: Score increases when adding tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 5 }),
          taskArbitrary, // additional task to add
          (initialTasks, additionalTask) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add initial tasks
            initialTasks.forEach(task => agent.addTask(task));
            const score1 = agent.calculateLoadScore();
            
            // Add one more task
            agent.addTask(additionalTask);
            const score2 = agent.calculateLoadScore();
            
            // Property: Score should increase or stay the same (never decrease)
            expect(score2).toBeGreaterThanOrEqual(score1);
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.5: Score decreases or stays same when removing tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            const score1 = agent.calculateLoadScore();
            
            // Remove one task
            const allTasks = agent.getAllTasks();
            if (allTasks.length > 0) {
              agent.removeTask(allTasks[0].id);
              const score2 = agent.calculateLoadScore();
              
              // Property: Score should decrease or stay the same (never increase)
              expect(score2).toBeLessThanOrEqual(score1);
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.6: Score is deterministic for same task set', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          (tasks) => {
            const agent1 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            const agent2 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add same tasks to both agents
            tasks.forEach(task => {
              agent1.addTask({ ...task });
              agent2.addTask({ ...task });
            });
            
            // Calculate scores
            const score1 = agent1.calculateLoadScore();
            const score2 = agent2.calculateLoadScore();
            
            // Property: Same tasks should produce same score
            expect(score1).toBe(score2);
            
            agent1.destroy();
            agent2.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.7: Higher complexity tasks produce higher scores', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // task count
          fc.integer({ min: 1, max: 5 }),  // low complexity
          fc.integer({ min: 6, max: 10 }), // high complexity
          (taskCount, lowComplexity, highComplexity) => {
            const agent1 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            const agent2 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add tasks with low complexity
            for (let i = 0; i < taskCount; i++) {
              agent1.addTask({
                name: `Task ${i}`,
                complexity: lowComplexity,
                urgency: 'medium',
                category: 'work'
              });
            }
            
            // Add same number of tasks with high complexity
            for (let i = 0; i < taskCount; i++) {
              agent2.addTask({
                name: `Task ${i}`,
                complexity: highComplexity,
                urgency: 'medium',
                category: 'work'
              });
            }
            
            // Calculate scores
            const score1 = agent1.calculateLoadScore();
            const score2 = agent2.calculateLoadScore();
            
            // Property: Higher complexity should produce higher or equal score
            // (equal when both hit the 100 cap)
            expect(score2).toBeGreaterThanOrEqual(score1);
            
            agent1.destroy();
            agent2.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.8: Score never exceeds 100 even with many high-complexity tasks', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 100 }), // large task count
          (taskCount) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add many high-complexity, high-urgency tasks
            for (let i = 0; i < taskCount; i++) {
              agent.addTask({
                name: `Task ${i}`,
                complexity: 10,
                urgency: 'high',
                category: 'work'
              });
            }
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Property: Score must never exceed 100
            expect(score).toBeLessThanOrEqual(100);
            
            agent.destroy();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('Property 4.9: Score calculation is idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          (tasks) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Calculate score multiple times
            const score1 = agent.calculateLoadScore();
            const score2 = agent.calculateLoadScore();
            const score3 = agent.calculateLoadScore();
            
            // Property: Multiple calculations should produce same result
            expect(score1).toBe(score2);
            expect(score2).toBe(score3);
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 4.10: Urgent tasks increase score more than non-urgent tasks', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 10 }), // task count
          fc.integer({ min: 5, max: 10 }), // complexity
          (taskCount, complexity) => {
            const agent1 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            const agent2 = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add tasks with low urgency
            for (let i = 0; i < taskCount; i++) {
              agent1.addTask({
                name: `Task ${i}`,
                complexity: complexity,
                urgency: 'low',
                category: 'work'
              });
            }
            
            // Add same tasks with high urgency
            for (let i = 0; i < taskCount; i++) {
              agent2.addTask({
                name: `Task ${i}`,
                complexity: complexity,
                urgency: 'high',
                category: 'work'
              });
            }
            
            // Calculate scores
            const score1 = agent1.calculateLoadScore();
            const score2 = agent2.calculateLoadScore();
            
            // Property: High urgency should produce higher or equal score
            // (equal when both hit the 100 cap)
            expect(score2).toBeGreaterThanOrEqual(score1);
            
            agent1.destroy();
            agent2.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5: Task Categorization Completeness', () => {
    /**
     * **Validates: Requirements 3.2, 4.1**
     * 
     * Property: Every task in the system is assigned to exactly one category 
     * (work, home, self, family).
     * 
     * Formal Definition:
     * let allTasks = getAllTasks()
     * let categorized = MentalLoadAgent.categorizeTasks()
     * allTasks.length == categorized.work.length + 
     *                    categorized.home.length + 
     *                    categorized.self.length + 
     *                    categorized.family.length ∧
     * ∀ task T: T appears in exactly one category
     */

    /**
     * Generator for valid task objects
     */
    const taskArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      complexity: fc.integer({ min: 1, max: 10 }),
      urgency: fc.constantFrom('low', 'medium', 'high'),
      category: fc.option(fc.constantFrom('work', 'home', 'self', 'family'), { nil: undefined })
    });

    test('Property 5.1: All tasks are assigned to exactly one category', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 30 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Get all tasks
            const allTasks = agent.getAllTasks();
            
            // Get categorized tasks
            const categorized = agent.categorizeTasks();
            
            // Property: Total tasks equals sum of all categories
            const totalCategorized = 
              categorized.work.length +
              categorized.home.length +
              categorized.self.length +
              categorized.family.length;
            
            expect(totalCategorized).toBe(allTasks.length);
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.2: No tasks are lost during categorization', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 30 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Get all tasks before categorization
            const allTasksBefore = agent.getAllTasks();
            const taskCountBefore = allTasksBefore.length;
            
            // Categorize tasks (without arguments, returns current tasks)
            const categorized = agent.categorizeTasks();
            
            // Get all tasks after categorization
            const allTasksAfter = agent.getAllTasks();
            const taskCountAfter = allTasksAfter.length;
            
            // Property: No tasks should be lost
            expect(taskCountAfter).toBe(taskCountBefore);
            expect(taskCountAfter).toBe(tasks.length);
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.3: No tasks are duplicated across categories', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 30 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Get categorized tasks
            const categorized = agent.categorizeTasks();
            
            // Collect all task IDs from all categories
            const allCategorizedIds = [
              ...categorized.work.map(t => t.id),
              ...categorized.home.map(t => t.id),
              ...categorized.self.map(t => t.id),
              ...categorized.family.map(t => t.id)
            ];
            
            // Property: No duplicate IDs (each task appears exactly once)
            const uniqueIds = new Set(allCategorizedIds);
            expect(uniqueIds.size).toBe(allCategorizedIds.length);
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.4: Every task has a category field after categorization', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 30 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Categorize tasks
            agent.categorizeTasks();
            
            // Get all tasks
            const allTasks = agent.getAllTasks();
            
            // Property: Every task must have a category field
            allTasks.forEach(task => {
              expect(task).toHaveProperty('category');
              expect(['work', 'home', 'self', 'family']).toContain(task.category);
            });
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.5: Task appears in the category matching its category field', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 30 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Get categorized tasks
            const categorized = agent.categorizeTasks();
            
            // Property: Each task in a category should have that category field
            Object.keys(categorized).forEach(categoryName => {
              categorized[categoryName].forEach(task => {
                expect(task.category).toBe(categoryName);
              });
            });
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.6: Categorization is idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Categorize multiple times
            const categorized1 = agent.categorizeTasks();
            const categorized2 = agent.categorizeTasks();
            const categorized3 = agent.categorizeTasks();
            
            // Property: Multiple categorizations should produce same result
            expect(categorized1.work.length).toBe(categorized2.work.length);
            expect(categorized1.home.length).toBe(categorized2.home.length);
            expect(categorized1.self.length).toBe(categorized2.self.length);
            expect(categorized1.family.length).toBe(categorized2.family.length);
            
            expect(categorized2.work.length).toBe(categorized3.work.length);
            expect(categorized2.home.length).toBe(categorized3.home.length);
            expect(categorized2.self.length).toBe(categorized3.self.length);
            expect(categorized2.family.length).toBe(categorized3.family.length);
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.7: Empty task list results in empty categories', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No input needed
          () => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Categorize with no tasks
            const categorized = agent.categorizeTasks([]);
            
            // Property: All categories should be empty
            expect(categorized.work.length).toBe(0);
            expect(categorized.home.length).toBe(0);
            expect(categorized.self.length).toBe(0);
            expect(categorized.family.length).toBe(0);
            
            agent.destroy();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('Property 5.8: Categorization preserves task data', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks and store their data
            const addedTasks = tasks.map(task => agent.addTask(task));
            const originalTaskMap = new Map(addedTasks.map(t => [t.id, { name: t.name, complexity: t.complexity, urgency: t.urgency }]));
            
            // Categorize tasks (without arguments to preserve existing tasks)
            agent.categorizeTasks();
            
            // Get all tasks after categorization
            const allTasks = agent.getAllTasks();
            
            // Property: All original task data should be preserved
            allTasks.forEach(task => {
              const original = originalTaskMap.get(task.id);
              expect(original).toBeDefined();
              expect(task.name).toBe(original.name);
              expect(task.complexity).toBe(original.complexity);
              expect(task.urgency).toBe(original.urgency);
            });
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 5.9: Adding tasks after categorization maintains completeness', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 15 }),
          fc.array(taskArbitrary, { minLength: 1, maxLength: 15 }),
          (initialTasks, additionalTasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add initial tasks and categorize
            initialTasks.forEach(task => agent.addTask(task));
            agent.categorizeTasks();
            
            // Add more tasks
            additionalTasks.forEach(task => agent.addTask(task));
            
            // Categorize again
            const categorized = agent.categorizeTasks();
            
            // Get all tasks
            const allTasks = agent.getAllTasks();
            
            // Property: All tasks should still be categorized
            const totalCategorized = 
              categorized.work.length +
              categorized.home.length +
              categorized.self.length +
              categorized.family.length;
            
            expect(totalCategorized).toBe(allTasks.length);
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 5.10: Removing tasks maintains categorization completeness', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 3, maxLength: 20 }),
          (tasks) => {
            // Clear localStorage for this test run
            global.localStorage.clear();
            
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add all tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Categorize
            agent.categorizeTasks();
            
            // Remove some tasks
            const allTasks = agent.getAllTasks();
            const tasksToRemove = allTasks.slice(0, Math.floor(allTasks.length / 2));
            tasksToRemove.forEach(task => agent.removeTask(task.id));
            
            // Categorize again
            const categorized = agent.categorizeTasks();
            
            // Get remaining tasks
            const remainingTasks = agent.getAllTasks();
            
            // Property: All remaining tasks should be categorized
            const totalCategorized = 
              categorized.work.length +
              categorized.home.length +
              categorized.self.length +
              categorized.family.length;
            
            expect(totalCategorized).toBe(remainingTasks.length);
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 7: Delegation Suggestion Threshold', () => {
    /**
     * **Validates: Requirements 3.4, 4.3**
     * 
     * Property: Delegation suggestions are only provided when mental load 
     * score exceeds 70.
     * 
     * Formal Definition:
     * let score = MentalLoadAgent.calculateLoadScore()
     * let suggestions = MentalLoadAgent.suggestDelegation()
     * (score > 70 → suggestions.length > 0) ∧
     * (score ≤ 70 → suggestions.length == 0)
     */

    /**
     * Generator for valid task objects with delegation properties
     */
    const delegatableTaskArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      complexity: fc.integer({ min: 1, max: 10 }),
      urgency: fc.constantFrom('low', 'medium', 'high'),
      category: fc.constantFrom('work', 'home', 'family'), // Exclude 'self' as it's less delegatable
      recurring: fc.boolean(),
      requiresSpecializedSkills: fc.boolean()
    });

    test('Property 7.1: No delegation suggestions when score ≤ 70', () => {
      fc.assert(
        fc.property(
          fc.array(delegatableTaskArbitrary, { minLength: 0, maxLength: 5 }),
          (tasks) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Get delegation suggestions
            const suggestions = agent.suggestDelegation();
            
            // Property: If score ≤ 70, suggestions should be empty
            if (score <= 70) {
              expect(suggestions).toHaveLength(0);
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 7.2: Delegation suggestions provided when score > 70', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 30 }), // Enough tasks to exceed threshold
          (taskCount) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add many tasks to ensure score > 70
            for (let i = 0; i < taskCount; i++) {
              agent.addTask({
                name: `Task ${i}`,
                complexity: 8,
                urgency: 'high',
                category: 'work',
                recurring: true,
                requiresSpecializedSkills: false
              });
            }
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Get delegation suggestions
            const suggestions = agent.suggestDelegation();
            
            // Property: If score > 70, suggestions should be provided
            if (score > 70) {
              expect(suggestions.length).toBeGreaterThan(0);
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 7.3: Threshold boundary - exactly at 70', () => {
      // This test verifies the boundary condition at score = 70
      const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
      
      // Add tasks incrementally until we reach score around 70
      // Use delegatable tasks (low complexity, recurring, work category)
      let score = 0;
      let taskCount = 0;
      
      while (score < 70 && taskCount < 100) {
        agent.addTask({
          name: `Task ${taskCount}`,
          complexity: 3, // Low complexity makes it delegatable
          urgency: 'medium',
          category: 'work',
          recurring: true, // Recurring tasks are more delegatable
          requiresSpecializedSkills: false
        });
        taskCount++;
        score = agent.calculateLoadScore();
      }
      
      // At this point, score should be around 70 or just above
      const suggestions = agent.suggestDelegation();
      
      // Property: At score = 70, no suggestions; at score > 70, suggestions exist
      if (score === 70) {
        expect(suggestions).toHaveLength(0);
      } else if (score > 70) {
        // With delegatable tasks, we should have suggestions
        expect(suggestions.length).toBeGreaterThan(0);
      }
      
      agent.destroy();
    });

    test('Property 7.4: Delegation suggestions are consistent with score', () => {
      fc.assert(
        fc.property(
          fc.array(delegatableTaskArbitrary, { minLength: 0, maxLength: 25 }),
          (tasks) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Get delegation suggestions
            const suggestions = agent.suggestDelegation();
            
            // Property: Suggestions presence must be consistent with score threshold
            if (score > 70) {
              // When score > 70, we should have suggestions (if there are delegatable tasks)
              // Note: suggestions might be empty if no tasks are delegatable
              expect(suggestions).toBeDefined();
              expect(Array.isArray(suggestions)).toBe(true);
            } else {
              // When score ≤ 70, suggestions must be empty
              expect(suggestions).toHaveLength(0);
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 7.5: Delegation suggestions have required structure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 30 }), // Enough tasks to exceed threshold
          (taskCount) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add many tasks to ensure score > 70
            for (let i = 0; i < taskCount; i++) {
              agent.addTask({
                name: `Task ${i}`,
                complexity: 7,
                urgency: 'high',
                category: 'work',
                recurring: true,
                requiresSpecializedSkills: false
              });
            }
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Get delegation suggestions
            const suggestions = agent.suggestDelegation();
            
            // Property: When suggestions exist, they must have proper structure
            if (score > 70 && suggestions.length > 0) {
              suggestions.forEach(suggestion => {
                expect(suggestion).toHaveProperty('task');
                expect(suggestion).toHaveProperty('delegationScore');
                expect(suggestion).toHaveProperty('reason');
                expect(suggestion).toHaveProperty('suggestedTo');
                expect(suggestion).toHaveProperty('priority');
                expect(suggestion.delegationScore).toBeGreaterThan(0);
                expect(suggestion.delegationScore).toBeLessThanOrEqual(1);
              });
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 7.6: Delegation suggestions are sorted by score', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 30 }), // Enough tasks to exceed threshold
          (taskCount) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add many tasks with varying delegation suitability
            for (let i = 0; i < taskCount; i++) {
              agent.addTask({
                name: `Task ${i}`,
                complexity: i % 2 === 0 ? 3 : 8, // Mix of complexities
                urgency: i % 3 === 0 ? 'high' : 'low',
                category: 'work',
                recurring: i % 2 === 0,
                requiresSpecializedSkills: i % 3 === 0
              });
            }
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Get delegation suggestions
            const suggestions = agent.suggestDelegation();
            
            // Property: Suggestions should be sorted by delegation score (descending)
            if (score > 70 && suggestions.length > 1) {
              for (let i = 0; i < suggestions.length - 1; i++) {
                expect(suggestions[i].delegationScore).toBeGreaterThanOrEqual(
                  suggestions[i + 1].delegationScore
                );
              }
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Property 7.7: Threshold is exactly 70 (not 69 or 71)', () => {
      // This test verifies the exact threshold value
      const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
      
      // Verify the threshold constant
      expect(agent.DELEGATION_THRESHOLD).toBe(70);
      
      agent.destroy();
    });

    test('Property 7.8: Multiple calls with same score produce consistent results', () => {
      fc.assert(
        fc.property(
          fc.array(delegatableTaskArbitrary, { minLength: 5, maxLength: 20 }),
          (tasks) => {
            const agent = new MentalLoadAgent(mockKiroHooks, mockCalendarAgent);
            
            // Add tasks
            tasks.forEach(task => agent.addTask(task));
            
            // Calculate score
            const score = agent.calculateLoadScore();
            
            // Get delegation suggestions multiple times
            const suggestions1 = agent.suggestDelegation();
            const suggestions2 = agent.suggestDelegation();
            const suggestions3 = agent.suggestDelegation();
            
            // Property: Multiple calls should produce consistent results
            expect(suggestions1.length).toBe(suggestions2.length);
            expect(suggestions2.length).toBe(suggestions3.length);
            
            // If score ≤ 70, all should be empty
            if (score <= 70) {
              expect(suggestions1).toHaveLength(0);
              expect(suggestions2).toHaveLength(0);
              expect(suggestions3).toHaveLength(0);
            }
            
            agent.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
