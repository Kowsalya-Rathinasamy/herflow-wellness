/**
 * MentalLoadAgent - Tracks and analyzes mental load patterns with AI assistance
 * 
 * Automatically tracks mental load, provides delegation suggestions, trend analysis,
 * and schedule optimization using Kiro hooks and Calendar_Agent integration.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */

class MentalLoadAgent {
  constructor(kiroHooks = null, calendarAgent = null) {
    this.hooks = kiroHooks;
    this.calendarAgent = calendarAgent;
    this.tasks = {
      work: [],
      home: [],
      self: [],
      family: []
    };
    this.loadScore = 0;
    this.historicalScores = [];
    this.STORAGE_KEY_TASKS = 'herflow_mental_load_tasks';
    this.STORAGE_KEY_SCORES = 'herflow_mental_load_scores';
    this.DELEGATION_THRESHOLD = 70;
    this.MAX_HISTORY_DAYS = 90;
    
    // Load persisted data
    this._loadFromStorage();
  }

  /**
   * Calculate mental load score from tasks
   * Requirements: 3.1
   * 
   * Score calculation algorithm:
   * - Base score from task count (0-60 points)
   * - Complexity multiplier (1.0-2.0)
   * - Urgency factor (0-20 points)
   * - Category balance factor (0-20 points)
   * 
   * @returns {number} Mental load score (0-100)
   */
  calculateLoadScore() {
    const allTasks = this._getAllTasks();
    
    if (allTasks.length === 0) {
      this.loadScore = 0;
      this._recordScore(0);
      return 0;
    }

    // Base score from task count (0-60 points)
    // Uses logarithmic scale to prevent extreme scores
    const taskCountScore = Math.min(60, Math.log(allTasks.length + 1) * 20);

    // Complexity multiplier (1.0-2.0)
    const avgComplexity = this._calculateAverageComplexity(allTasks);
    const complexityMultiplier = 1.0 + (avgComplexity / 10);

    // Urgency factor (0-20 points)
    const urgencyScore = this._calculateUrgencyScore(allTasks);

    // Category balance factor (0-20 points)
    // Penalize imbalanced load across categories
    const balanceScore = this._calculateBalanceScore();

    // Calculate final score
    const rawScore = (taskCountScore * complexityMultiplier) + urgencyScore + balanceScore;
    this.loadScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Record score for trend tracking
    this._recordScore(this.loadScore);

    console.log(`Mental load score calculated: ${this.loadScore}`);
    return this.loadScore;
  }

  /**
   * Categorize tasks by domain
   * Requirements: 3.2, 4.1
   * 
   * @param {Array} tasks - Array of task objects to categorize
   * @returns {Object} Tasks organized by category
   */
  categorizeTasks(tasks = []) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { ...this.tasks };
    }

    // Reset categories
    this.tasks = {
      work: [],
      home: [],
      self: [],
      family: []
    };

    // Categorize each task
    tasks.forEach(task => {
      const category = this._determineCategory(task);
      
      // Ensure task has category field
      const categorizedTask = {
        ...task,
        category,
        categorizedAt: new Date().toISOString()
      };

      this.tasks[category].push(categorizedTask);
    });

    this._saveToStorage();
    console.log('Tasks categorized:', {
      work: this.tasks.work.length,
      home: this.tasks.home.length,
      self: this.tasks.self.length,
      family: this.tasks.family.length
    });

    return { ...this.tasks };
  }

  /**
   * Suggest tasks for delegation when load is high
   * Requirements: 3.4, 4.3
   * 
   * @returns {Array} Array of delegation suggestions
   */
  suggestDelegation() {
    // Only suggest delegation if score exceeds threshold
    if (this.loadScore <= this.DELEGATION_THRESHOLD) {
      return [];
    }

    const suggestions = [];
    const allTasks = this._getAllTasks();

    // Identify tasks suitable for delegation
    allTasks.forEach(task => {
      const delegationScore = this._calculateDelegationScore(task);
      
      if (delegationScore > 0.6) {
        suggestions.push({
          task,
          delegationScore,
          reason: this._getDelegationReason(task),
          suggestedTo: this._suggestDelegatee(task),
          priority: delegationScore > 0.8 ? 'high' : 'medium'
        });
      }
    });

    // Sort by delegation score (highest first)
    suggestions.sort((a, b) => b.delegationScore - a.delegationScore);

    console.log(`Generated ${suggestions.length} delegation suggestions`);
    return suggestions;
  }

  /**
   * Track mental load trends over time
   * Requirements: 3.3
   * 
   * @returns {Object} Trend analysis results
   */
  trackTrends() {
    if (this.historicalScores.length < 2) {
      return {
        hasEnoughData: false,
        message: 'Need at least 2 data points for trend analysis'
      };
    }

    const recentScores = this._getRecentScores(7); // Last 7 days
    const olderScores = this._getRecentScores(14).slice(0, 7); // Previous 7 days

    const recentAvg = this._calculateAverage(recentScores);
    const olderAvg = this._calculateAverage(olderScores);

    const trend = {
      hasEnoughData: true,
      current: this.loadScore,
      recentAverage: recentAvg,
      previousAverage: olderAvg,
      direction: this._determineTrendDirection(recentAvg, olderAvg),
      changePercent: olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0,
      peak: Math.max(...this.historicalScores.map(s => s.score)),
      low: Math.min(...this.historicalScores.map(s => s.score)),
      volatility: this._calculateVolatility(recentScores),
      recommendations: []
    };

    // Generate recommendations based on trends
    if (trend.direction === 'increasing' && trend.changePercent > 20) {
      trend.recommendations.push({
        type: 'alert',
        message: 'Your mental load is increasing significantly. Consider delegation or reducing commitments.'
      });
    }

    if (trend.volatility > 20) {
      trend.recommendations.push({
        type: 'stability',
        message: 'Your mental load is fluctuating. Try to establish more consistent routines.'
      });
    }

    if (trend.current > 80) {
      trend.recommendations.push({
        type: 'urgent',
        message: 'Your mental load is critically high. Immediate action recommended.'
      });
    }

    console.log('Trend analysis complete:', trend);
    return trend;
  }

  /**
   * Suggest optimal task timing based on load patterns
   * Requirements: 4.2, 4.4
   * 
   * @param {Object} task - Task to schedule
   * @returns {Object} Scheduling recommendations
   */
  optimizeSchedule(task) {
    if (!task) {
      throw new Error('Task is required for schedule optimization');
    }

    const trends = this.trackTrends();
    const recommendations = {
      task,
      suggestedTimes: [],
      reasoning: []
    };

    // Analyze historical patterns to find low-load periods
    const lowLoadPeriods = this._identifyLowLoadPeriods();

    if (lowLoadPeriods.length > 0) {
      recommendations.suggestedTimes = lowLoadPeriods.map(period => ({
        dayOfWeek: period.dayOfWeek,
        timeOfDay: period.timeOfDay,
        expectedLoad: period.averageLoad,
        confidence: period.confidence
      }));

      recommendations.reasoning.push(
        `Based on your patterns, ${lowLoadPeriods[0].dayOfWeek} ${lowLoadPeriods[0].timeOfDay} typically has lower mental load.`
      );
    }

    // Consider task category and current category loads
    const categoryLoad = this._getCategoryLoad(task.category);
    if (categoryLoad > 70) {
      recommendations.reasoning.push(
        `Your ${task.category} category is currently overloaded. Consider scheduling this task for a later time or delegating it.`
      );
    }

    // Consider task urgency and complexity
    if (task.urgency === 'high' || task.complexity > 7) {
      recommendations.reasoning.push(
        'This is a high-priority or complex task. Schedule it during your peak productivity hours.'
      );
    }

    // Integration with Calendar_Agent
    if (this.calendarAgent) {
      recommendations.calendarIntegration = {
        available: true,
        message: 'Can automatically schedule this task in your calendar'
      };
    }

    console.log('Schedule optimization complete for task:', task.id || task.name);
    return recommendations;
  }

  /**
   * Add a task to the mental load tracker
   * @param {Object} task - Task object
   * @returns {Object} Categorized task
   */
  addTask(task) {
    if (!task || typeof task !== 'object') {
      throw new Error('Valid task object is required');
    }

    const category = this._determineCategory(task);
    const categorizedTask = {
      id: task.id || this._generateId(),
      ...task,
      category,
      addedAt: new Date().toISOString()
    };

    this.tasks[category].push(categorizedTask);
    this._saveToStorage();
    
    // Recalculate load score
    this.calculateLoadScore();

    console.log(`Task added to ${category}:`, categorizedTask.id);
    return categorizedTask;
  }

  /**
   * Remove a task from the mental load tracker
   * @param {string} taskId - Task ID
   * @returns {boolean} Success status
   */
  removeTask(taskId) {
    let removed = false;

    Object.keys(this.tasks).forEach(category => {
      const index = this.tasks[category].findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.tasks[category].splice(index, 1);
        removed = true;
      }
    });

    if (removed) {
      this._saveToStorage();
      this.calculateLoadScore();
      console.log(`Task removed: ${taskId}`);
    }

    return removed;
  }

  /**
   * Get all tasks across categories
   * @returns {Array} All tasks
   */
  getAllTasks() {
    return this._getAllTasks();
  }

  /**
   * Get tasks by category
   * @param {string} category - Category name
   * @returns {Array} Tasks in category
   */
  getTasksByCategory(category) {
    if (!this.tasks[category]) {
      throw new Error(`Invalid category: ${category}`);
    }
    return [...this.tasks[category]];
  }

  /**
   * Get current load score
   * @returns {number} Current load score
   */
  getCurrentScore() {
    return this.loadScore;
  }

  /**
   * Get historical scores
   * @param {number} days - Number of days to retrieve
   * @returns {Array} Historical scores
   */
  getHistoricalScores(days = 30) {
    return this._getRecentScores(days);
  }

  /**
   * Get all tasks as flat array
   * @private
   */
  _getAllTasks() {
    return [
      ...this.tasks.work,
      ...this.tasks.home,
      ...this.tasks.self,
      ...this.tasks.family
    ];
  }

  /**
   * Determine task category based on keywords and context
   * @private
   */
  _determineCategory(task) {
    const text = `${task.name || ''} ${task.description || ''} ${task.tags || ''}`.toLowerCase();

    // Work-related keywords
    if (text.match(/work|job|meeting|project|deadline|client|office|email|report|presentation/)) {
      return 'work';
    }

    // Home-related keywords
    if (text.match(/home|house|clean|cook|grocery|repair|maintenance|chore|laundry|dishes/)) {
      return 'home';
    }

    // Family-related keywords
    if (text.match(/family|child|kid|parent|school|pickup|appointment|birthday|family/)) {
      return 'family';
    }

    // Self-care keywords
    if (text.match(/self|wellness|exercise|meditation|hobby|relax|read|spa|therapy|health/)) {
      return 'self';
    }

    // Default to home if no clear category
    return task.category || 'home';
  }

  /**
   * Calculate average task complexity
   * @private
   */
  _calculateAverageComplexity(tasks) {
    if (tasks.length === 0) return 5;

    const total = tasks.reduce((sum, task) => {
      return sum + (task.complexity || 5);
    }, 0);

    return total / tasks.length;
  }

  /**
   * Calculate urgency score
   * @private
   */
  _calculateUrgencyScore(tasks) {
    const urgentTasks = tasks.filter(t => 
      t.urgency === 'high' || t.urgent === true || t.priority === 'high'
    );

    return Math.min(20, urgentTasks.length * 4);
  }

  /**
   * Calculate category balance score
   * @private
   */
  _calculateBalanceScore() {
    const counts = [
      this.tasks.work.length,
      this.tasks.home.length,
      this.tasks.self.length,
      this.tasks.family.length
    ];

    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    // Calculate standard deviation
    const mean = total / 4;
    const variance = counts.reduce((sum, count) => {
      return sum + Math.pow(count - mean, 2);
    }, 0) / 4;
    const stdDev = Math.sqrt(variance);

    // Higher standard deviation = more imbalance = higher score
    return Math.min(20, stdDev * 2);
  }

  /**
   * Calculate delegation score for a task
   * @private
   */
  _calculateDelegationScore(task) {
    let score = 0;

    // Low complexity tasks are easier to delegate
    if (task.complexity && task.complexity < 5) {
      score += 0.3;
    }

    // Routine/recurring tasks are good delegation candidates
    if (task.recurring || task.routine) {
      score += 0.2;
    }

    // Tasks that don't require specialized skills
    if (!task.requiresSpecializedSkills) {
      score += 0.2;
    }

    // Work and home tasks are often delegatable
    if (task.category === 'work' || task.category === 'home') {
      score += 0.2;
    }

    // Not urgent tasks can be delegated
    if (task.urgency !== 'high') {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Get delegation reason
   * @private
   */
  _getDelegationReason(task) {
    const reasons = [];

    if (task.complexity && task.complexity < 5) {
      reasons.push('Low complexity task');
    }

    if (task.recurring) {
      reasons.push('Recurring task');
    }

    if (task.category === 'home') {
      reasons.push('Household task that can be shared');
    }

    if (task.category === 'work') {
      reasons.push('Work task that could be delegated to team members');
    }

    return reasons.join(', ') || 'Suitable for delegation';
  }

  /**
   * Suggest delegatee based on task category
   * @private
   */
  _suggestDelegatee(task) {
    const suggestions = {
      work: ['Team member', 'Colleague', 'Assistant'],
      home: ['Family member', 'Partner', 'Service provider'],
      family: ['Partner', 'Family member', 'Babysitter'],
      self: ['Not recommended for delegation']
    };

    return suggestions[task.category] || ['Team member', 'Family member'];
  }

  /**
   * Record score for trend tracking
   * @private
   */
  _recordScore(score) {
    this.historicalScores.push({
      score,
      timestamp: new Date().toISOString(),
      taskCount: this._getAllTasks().length
    });

    // Keep only last 90 days
    const cutoffDate = Date.now() - (this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    this.historicalScores = this.historicalScores.filter(s => 
      new Date(s.timestamp).getTime() > cutoffDate
    );

    this._saveToStorage();
  }

  /**
   * Get recent scores
   * @private
   */
  _getRecentScores(days) {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.historicalScores
      .filter(s => new Date(s.timestamp).getTime() > cutoffDate)
      .map(s => s.score);
  }

  /**
   * Calculate average of array
   * @private
   */
  _calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Determine trend direction
   * @private
   */
  _determineTrendDirection(recent, previous) {
    const diff = recent - previous;
    const threshold = 5; // 5 point threshold

    if (Math.abs(diff) < threshold) {
      return 'stable';
    }

    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate volatility (standard deviation)
   * @private
   */
  _calculateVolatility(scores) {
    if (scores.length < 2) return 0;

    const mean = this._calculateAverage(scores);
    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - mean, 2);
    }, 0) / scores.length;

    return Math.sqrt(variance);
  }

  /**
   * Identify low-load periods from historical data
   * @private
   */
  _identifyLowLoadPeriods() {
    if (this.historicalScores.length < 7) {
      return [];
    }

    const periodMap = new Map();

    this.historicalScores.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      const hour = date.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const key = `${dayOfWeek}-${timeOfDay}`;

      if (!periodMap.has(key)) {
        periodMap.set(key, { scores: [], dayOfWeek, timeOfDay });
      }

      periodMap.get(key).scores.push(entry.score);
    });

    // Calculate average load for each period
    const periods = Array.from(periodMap.values()).map(period => ({
      dayOfWeek: period.dayOfWeek,
      timeOfDay: period.timeOfDay,
      averageLoad: this._calculateAverage(period.scores),
      confidence: period.scores.length / this.historicalScores.length
    }));

    // Sort by average load (lowest first)
    periods.sort((a, b) => a.averageLoad - b.averageLoad);

    return periods.slice(0, 3); // Return top 3 low-load periods
  }

  /**
   * Get category load percentage
   * @private
   */
  _getCategoryLoad(category) {
    if (!this.tasks[category]) return 0;

    const categoryTasks = this.tasks[category].length;
    const totalTasks = this._getAllTasks().length;

    if (totalTasks === 0) return 0;

    return (categoryTasks / totalTasks) * 100;
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load data from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const tasks = localStorage.getItem(this.STORAGE_KEY_TASKS);
      if (tasks) {
        this.tasks = JSON.parse(tasks);
      }

      const scores = localStorage.getItem(this.STORAGE_KEY_SCORES);
      if (scores) {
        this.historicalScores = JSON.parse(scores);
      }

      // Recalculate current score
      if (this._getAllTasks().length > 0) {
        this.calculateLoadScore();
      }

      console.log('Mental load data loaded from storage');
    } catch (error) {
      console.error('Failed to load mental load data from storage:', error);
    }
  }

  /**
   * Save data to localStorage
   * @private
   */
  _saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
      localStorage.setItem(this.STORAGE_KEY_SCORES, JSON.stringify(this.historicalScores));
    } catch (error) {
      console.error('Failed to save mental load data to storage:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this._saveToStorage();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MentalLoadAgent;
}
