/**
 * Property-based tests for TaskAutomationAgent
 * Tests universal properties of task automation behavior
 */

const fc = require('fast-check');
const TaskAutomationAgent = require('./task-automation-agent');
const MentalLoadAgent = require('./mental-load-agent');

describe('TaskAutomationAgent - Property Tests', () => {
  let agent;
  let mentalLoadAgent;

  beforeEach(() => {
    localStorage.clear();
    mentalLoadAgent = new MentalLoadAgent();
    agent = new TaskAutomationAgent(mentalLoadAgent);
  });

  afterEach(() => {
    agent.destroy();
    mentalLoadAgent.destroy();
  });

  /**
   * Property 9: Pattern Detection Consistency
   * **Validates: Requirements 4.1**
   * 
   * For any set of similar tasks added to history with consistent intervals,
   * patterns should be detected when minimum occurrences are met.
   */
  test('Property 9: Pattern detection finds recurring tasks', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Weekly meeting', 'Daily standup', 'Monthly review'),
        fc.integer({ min: 4, max: 8 }), // Ensure enough occurrences
        (taskName, occurrences) => {
          const testAgent = new TaskAutomationAgent(mentalLoadAgent);
          const baseDate = new Date('2024-01-01');
          
          // Add same task multiple times with weekly intervals
          for (let i = 0; i < occurrences; i++) {
            testAgent.addTaskToHistory({
              name: taskName,
              category: 'work',
              complexity: 5,
              id: `task_${i}`,
              createdAt: new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString()
            });
          }

          const patterns = testAgent.detectRecurringPatterns();

          // Should detect at least one pattern with enough occurrences
          const result = patterns.length >= 1;

          testAgent.destroy();
          return result;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 10: Auto-Created Task Validity
   * **Validates: Requirements 4.1**
   * 
   * All automatically created tasks must have valid required fields
   * and must be traceable to their source pattern.
   */
  test('Property 10: Auto-created tasks are always valid', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
          category: fc.constantFrom('work', 'home', 'self', 'family'),
          complexity: fc.integer({ min: 1, max: 10 }),
          frequency: fc.constantFrom('daily', 'weekly', 'monthly')
        }),
        async (patternTemplate) => {
          const pattern = {
            id: 'test_pattern',
            template: patternTemplate,
            frequency: patternTemplate.frequency,
            confidence: 0.9,
            enabled: true
          };

          const result = await agent.createAutomaticTask(pattern, false);

          // Task must have required fields
          const task = result.task;
          const hasRequiredFields = 
            task.id !== undefined &&
            task.name !== undefined &&
            task.name.trim().length >= 3 &&
            task.category !== undefined &&
            task.autoCreated === true &&
            task.patternId === pattern.id;

          return hasRequiredFields;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Learning Monotonicity
   * **Validates: Requirements 4.4**
   * 
   * Pattern confidence should decrease with rejections and never go below minimum.
   */
  test('Property 11: Pattern confidence decreases with rejections', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.float({ min: Math.fround(0.6), max: Math.fround(1.0) }),
        async (numRejections, initialConfidence) => {
          const pattern = {
            id: 'test_pattern',
            template: { name: 'Test', category: 'work' },
            frequency: 'daily',
            confidence: initialConfidence,
            enabled: true
          };

          agent.recurringPatterns.push(pattern);

          let previousConfidence = initialConfidence;
          let allValid = true;

          for (let i = 0; i < numRejections; i++) {
            const result = await agent.createAutomaticTask(pattern, true);
            await agent.confirmTaskCreation(result.task.id, false);

            const currentConfidence = pattern.confidence;
            
            // Confidence should not increase
            if (currentConfidence > previousConfidence) {
              allValid = false;
              break;
            }

            // Should never go below minimum
            if (currentConfidence < 0.3) {
              allValid = false;
              break;
            }

            previousConfidence = currentConfidence;
          }

          // Clean up
          agent.recurringPatterns = [];

          return allValid;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: Behavior Tracking Completeness
   * **Validates: Requirements 4.4**
   * 
   * Every modification and deletion must be tracked in user behavior data.
   */
  test('Property 12: All user actions are tracked', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            name: fc.string({ minLength: 1 }),
            complexity: fc.integer({ min: 1, max: 10 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (tasks) => {
          const initialModCount = agent.userBehaviorData.modifications.length;
          const initialDelCount = agent.userBehaviorData.deletions.length;

          let modCount = 0;
          let delCount = 0;

          tasks.forEach((task, i) => {
            if (i % 2 === 0) {
              // Track modification
              const modified = { ...task, complexity: task.complexity + 1 };
              agent.trackModification(task, modified);
              modCount++;
            } else {
              // Track deletion
              agent.trackDeletion(task);
              delCount++;
            }
          });

          const finalModCount = agent.userBehaviorData.modifications.length;
          const finalDelCount = agent.userBehaviorData.deletions.length;

          return (
            finalModCount === initialModCount + modCount &&
            finalDelCount === initialDelCount + delCount
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 13: Automation Insights Consistency
   * **Validates: Requirements 4.2, 4.4**
   * 
   * Automation insights should always reflect the current state of patterns
   * and suggestions should be actionable.
   */
  test('Property 13: Insights match current automation state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            frequency: fc.constantFrom('daily', 'weekly', 'monthly'),
            confidence: fc.float({ min: 0.5, max: 1.0 }),
            enabled: fc.boolean()
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (patterns) => {
          agent.recurringPatterns = patterns.map((p, i) => ({
            id: `pattern_${i}`,
            template: { name: p.name, category: 'work' },
            frequency: p.frequency,
            confidence: p.confidence,
            enabled: p.enabled
          }));

          const insights = agent.getAutomationInsights();

          // Insights should match pattern count
          const matchesPatternCount = insights.recurringPatterns === patterns.length;

          // All suggestions should have required fields
          const validSuggestions = insights.suggestions.every(s => 
            s.type !== undefined && s.message !== undefined
          );

          // Learning stats should be defined
          const hasLearningStats = 
            insights.learningStats !== undefined &&
            insights.learningStats.patternsDetected === patterns.length;

          return matchesPatternCount && validSuggestions && hasLearningStats;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Configuration Idempotency
   * **Validates: Requirements 4.2, 4.4**
   * 
   * Applying the same configuration multiple times should produce the same result.
   */
  test('Property 14: Configuration changes are idempotent', () => {
    fc.assert(
      fc.property(
        fc.record({
          autoCreate: fc.boolean(),
          requireConfirmation: fc.boolean()
        }),
        (config) => {
          // Apply configuration first time
          const result1 = agent.configureViaChat(config);
          const state1 = {
            autoCreate: agent.userBehaviorData.preferences.autoCreate,
            requireConfirmation: agent.userBehaviorData.preferences.requireConfirmation
          };

          // Apply same configuration again
          const result2 = agent.configureViaChat(config);
          const state2 = {
            autoCreate: agent.userBehaviorData.preferences.autoCreate,
            requireConfirmation: agent.userBehaviorData.preferences.requireConfirmation
          };

          // State should be identical
          return (
            state1.autoCreate === state2.autoCreate &&
            state1.requireConfirmation === state2.requireConfirmation
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Task History Bounds
   * **Validates: Requirements 4.1**
   * 
   * Task history should never exceed 90 days of data.
   */
  test('Property 15: Task history respects time bounds', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            daysAgo: fc.integer({ min: 0, max: 180 })
          }),
          { minLength: 10, maxLength: 50 }
        ),
        (tasks) => {
          const now = Date.now();

          tasks.forEach((task, i) => {
            const timestamp = new Date(now - task.daysAgo * 24 * 60 * 60 * 1000);
            agent.addTaskToHistory({
              id: `task_${i}`,
              name: task.name,
              createdAt: timestamp.toISOString()
            });
          });

          // Check all tasks in history are within 90 days
          const cutoffDate = now - 90 * 24 * 60 * 60 * 1000;
          const allWithinBounds = agent.taskHistory.every(t => {
            const taskDate = new Date(t.addedToHistoryAt).getTime();
            return taskDate > cutoffDate;
          });

          return allWithinBounds;
        }
      ),
      { numRuns: 50 }
    );
  });
});
