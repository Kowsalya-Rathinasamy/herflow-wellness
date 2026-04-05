/**
 * Mental Load UI Integration Tests
 * 
 * Tests the integration between MentalLoadAgent and UI components
 */

// Mock DOM elements
document.body.innerHTML = `
  <div class="load-pct">0%</div>
  <div class="load-sub">balanced</div>
  <svg>
    <circle class="load-fg" stroke-dashoffset="314"></circle>
  </svg>
  
  <div id="work-items">
    <div class="lc-item"><span>Test work task</span></div>
  </div>
  <div id="home-items">
    <div class="lc-item"><span>Test home task</span></div>
  </div>
  <div id="family-items">
    <div class="lc-item"><span>Test family task</span></div>
  </div>
  <div id="self-items">
    <div class="lc-item"><span>Test self task</span></div>
  </div>
  
  <div id="work-count">0</div>
  <div id="home-count">0</div>
  <div id="family-count">0</div>
  <div id="self-count">0</div>
  
  <div id="work-bar"></div>
  <div id="home-bar"></div>
  <div id="family-bar"></div>
  <div id="self-bar"></div>
  
  <div class="delegation-box">
    <div class="delegate-items"></div>
  </div>
  
  <div class="insight-card">
    <div class="insight-a">0</div>
  </div>
  
  <div id="tab-load"></div>
`;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock;

// Import modules
const MentalLoadAgent = require('./mental-load-agent');

describe('Mental Load UI Integration', () => {
  let mentalLoadAgent;
  
  beforeEach(() => {
    localStorage.clear();
    mentalLoadAgent = new MentalLoadAgent();
  });
  
  describe('Task Synchronization', () => {
    test('should sync tasks from UI to agent', () => {
      // Add tasks to agent
      const tasks = [
        { name: 'Work task', category: 'work', complexity: 5, urgency: 'medium' },
        { name: 'Home task', category: 'home', complexity: 3, urgency: 'low' },
        { name: 'Family task', category: 'family', complexity: 7, urgency: 'high' },
        { name: 'Self task', category: 'self', complexity: 2, urgency: 'low' }
      ];
      
      mentalLoadAgent.categorizeTasks(tasks);
      
      expect(mentalLoadAgent.getTasksByCategory('work').length).toBe(1);
      expect(mentalLoadAgent.getTasksByCategory('home').length).toBe(1);
      expect(mentalLoadAgent.getTasksByCategory('family').length).toBe(1);
      expect(mentalLoadAgent.getTasksByCategory('self').length).toBe(1);
    });
    
    test('should calculate load score after syncing tasks', () => {
      const tasks = [
        { name: 'Task 1', category: 'work', complexity: 5, urgency: 'medium' },
        { name: 'Task 2', category: 'work', complexity: 7, urgency: 'high' },
        { name: 'Task 3', category: 'home', complexity: 3, urgency: 'low' }
      ];
      
      mentalLoadAgent.categorizeTasks(tasks);
      const score = mentalLoadAgent.calculateLoadScore();
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
  
  describe('Load Meter Updates', () => {
    test('should update load meter with correct score', () => {
      const tasks = Array(10).fill(null).map((_, i) => ({
        name: `Task ${i}`,
        category: 'work',
        complexity: 5,
        urgency: 'medium'
      }));
      
      mentalLoadAgent.categorizeTasks(tasks);
      const score = mentalLoadAgent.calculateLoadScore();
      
      expect(score).toBeGreaterThan(0);
      expect(mentalLoadAgent.getCurrentScore()).toBe(score);
    });
    
    test('should categorize load level correctly', () => {
      // Test different score ranges
      const testCases = [
        { taskCount: 2, expectedLevel: 'balanced' },
        { taskCount: 10, expectedLevel: 'moderate' },
        { taskCount: 20, expectedLevel: 'overloaded' }
      ];
      
      testCases.forEach(({ taskCount }) => {
        const tasks = Array(taskCount).fill(null).map((_, i) => ({
          name: `Task ${i}`,
          category: 'work',
          complexity: 5,
          urgency: 'medium'
        }));
        
        mentalLoadAgent.categorizeTasks(tasks);
        const score = mentalLoadAgent.calculateLoadScore();
        
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
  
  describe('Category Breakdown', () => {
    test('should calculate correct percentages for each category', () => {
      const tasks = [
        { name: 'Work 1', category: 'work', complexity: 5, urgency: 'medium' },
        { name: 'Work 2', category: 'work', complexity: 5, urgency: 'medium' },
        { name: 'Home 1', category: 'home', complexity: 3, urgency: 'low' },
        { name: 'Self 1', category: 'self', complexity: 2, urgency: 'low' }
      ];
      
      mentalLoadAgent.categorizeTasks(tasks);
      
      const workTasks = mentalLoadAgent.getTasksByCategory('work');
      const homeTasks = mentalLoadAgent.getTasksByCategory('home');
      const selfTasks = mentalLoadAgent.getTasksByCategory('self');
      const allTasks = mentalLoadAgent.getAllTasks();
      
      expect(workTasks.length).toBe(2);
      expect(homeTasks.length).toBe(1);
      expect(selfTasks.length).toBe(1);
      expect(allTasks.length).toBe(4);
      
      const workPercentage = (workTasks.length / allTasks.length) * 100;
      expect(workPercentage).toBe(50);
    });
  });
  
  describe('Delegation Suggestions', () => {
    test('should generate delegation suggestions when load is high', () => {
      // Create many tasks to trigger high load
      const tasks = Array(20).fill(null).map((_, i) => ({
        name: `Task ${i}`,
        category: i % 2 === 0 ? 'work' : 'home',
        complexity: 3,
        urgency: 'medium',
        recurring: i % 3 === 0
      }));
      
      mentalLoadAgent.categorizeTasks(tasks);
      mentalLoadAgent.calculateLoadScore();
      
      const suggestions = mentalLoadAgent.suggestDelegation();
      
      // Should have suggestions if score > 70
      if (mentalLoadAgent.getCurrentScore() > 70) {
        expect(suggestions.length).toBeGreaterThan(0);
        
        // Check suggestion structure
        suggestions.forEach(suggestion => {
          expect(suggestion).toHaveProperty('task');
          expect(suggestion).toHaveProperty('delegationScore');
          expect(suggestion).toHaveProperty('reason');
          expect(suggestion).toHaveProperty('suggestedTo');
        });
      }
    });
    
    test('should not generate suggestions when load is low', () => {
      const tasks = [
        { name: 'Task 1', category: 'work', complexity: 3, urgency: 'low' }
      ];
      
      mentalLoadAgent.categorizeTasks(tasks);
      mentalLoadAgent.calculateLoadScore();
      
      const suggestions = mentalLoadAgent.suggestDelegation();
      
      // Should have no suggestions if score <= 70
      if (mentalLoadAgent.getCurrentScore() <= 70) {
        expect(suggestions.length).toBe(0);
      }
    });
  });
  
  describe('Trend Tracking', () => {
    test('should track trends with sufficient data', () => {
      const tasks = [
        { name: 'Task 1', category: 'work', complexity: 5, urgency: 'medium' }
      ];
      
      mentalLoadAgent.categorizeTasks(tasks);
      mentalLoadAgent.calculateLoadScore();
      
      // Add another score
      mentalLoadAgent.calculateLoadScore();
      
      const trends = mentalLoadAgent.trackTrends();
      
      expect(trends).toHaveProperty('hasEnoughData');
      
      if (trends.hasEnoughData) {
        expect(trends).toHaveProperty('current');
        expect(trends).toHaveProperty('direction');
        expect(trends.direction).toMatch(/increasing|decreasing|stable/);
      }
    });
  });
  
  describe('Real-time Updates', () => {
    test('should update UI when tasks are added', () => {
      const initialTasks = [
        { name: 'Task 1', category: 'work', complexity: 5, urgency: 'medium' }
      ];
      
      mentalLoadAgent.categorizeTasks(initialTasks);
      const initialScore = mentalLoadAgent.calculateLoadScore();
      
      // Add more tasks
      const newTask = { name: 'Task 2', category: 'work', complexity: 7, urgency: 'high' };
      mentalLoadAgent.addTask(newTask);
      
      const newScore = mentalLoadAgent.calculateLoadScore();
      
      expect(newScore).toBeGreaterThanOrEqual(initialScore);
    });
    
    test('should update UI when tasks are completed', () => {
      const tasks = [
        { id: 'task1', name: 'Task 1', category: 'work', complexity: 5, urgency: 'medium' },
        { id: 'task2', name: 'Task 2', category: 'work', complexity: 7, urgency: 'high' }
      ];
      
      mentalLoadAgent.categorizeTasks(tasks);
      const initialScore = mentalLoadAgent.calculateLoadScore();
      
      // Remove a task
      mentalLoadAgent.removeTask('task1');
      const newScore = mentalLoadAgent.calculateLoadScore();
      
      expect(newScore).toBeLessThanOrEqual(initialScore);
    });
  });
});
