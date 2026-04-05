/**
 * TaskAutomationAgent - AI-powered task automation with pattern learning
 * 
 * Detects recurring task patterns, automatically creates tasks, learns from user behavior,
 * and integrates with AI Companion for intelligent task management.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

class TaskAutomationAgent {
  constructor(mentalLoadAgent = null, calendarAgent = null, kiroHooks = null) {
    this.mentalLoadAgent = mentalLoadAgent;
    this.calendarAgent = calendarAgent;
    this.hooks = kiroHooks;
    
    this.taskHistory = [];
    this.recurringPatterns = [];
    this.userBehaviorData = {
      modifications: [],
      deletions: [],
      preferences: {}
    };
    this.autoCreatedTasks = [];
    this.pendingConfirmations = [];
    
    this.STORAGE_KEY_HISTORY = 'herflow_task_history';
    this.STORAGE_KEY_PATTERNS = 'herflow_recurring_patterns';
    this.STORAGE_KEY_BEHAVIOR = 'herflow_user_behavior';
    this.STORAGE_KEY_AUTO_TASKS = 'herflow_auto_tasks';
    
    this.MIN_PATTERN_OCCURRENCES = 3;
    this.PATTERN_DETECTION_WINDOW_DAYS = 30;
    
    this._loadFromStorage();
  }

  /**
   * Analyze task patterns to identify recurring tasks
   * Requirements: 4.1
   * 
   * @returns {Array} Detected recurring patterns
   */
  detectRecurringPatterns() {
    if (this.taskHistory.length < this.MIN_PATTERN_OCCURRENCES) {
      return [];
    }

    const patterns = [];
    const taskGroups = this._groupSimilarTasks();

    taskGroups.forEach(group => {
      if (group.tasks.length >= this.MIN_PATTERN_OCCURRENCES) {
        const pattern = this._analyzeTaskGroup(group);
        
        if (pattern.confidence > 0.7) {
          patterns.push(pattern);
        }
      }
    });

    this.recurringPatterns = patterns;
    this._saveToStorage();
    
    console.log(`Detected ${patterns.length} recurring patterns`);
    return patterns;
  }

  /**
   * Create tasks automatically based on detected patterns
   * Requirements: 4.1
   * 
   * @param {Object} pattern - Recurring pattern to create task from
   * @param {boolean} requireConfirmation - Whether to require user confirmation
   * @returns {Object} Created task or pending confirmation
   */
  async createAutomaticTask(pattern, requireConfirmation = true) {
    if (!pattern || !pattern.template) {
      throw new Error('Valid pattern with template is required');
    }

    const task = this._generateTaskFromPattern(pattern);
    
    if (requireConfirmation) {
      this.pendingConfirmations.push({
        id: task.id,
        task,
        pattern,
        createdAt: new Date().toISOString()
      });
      
      await this._requestUserConfirmation(task, pattern);
      return { status: 'pending_confirmation', task };
    }

    return await this._executeTaskCreation(task, pattern);
  }

  /**
   * Track user task modifications
   * Requirements: 4.4
   * 
   * @param {Object} originalTask - Original task before modification
   * @param {Object} modifiedTask - Task after modification
   */
  trackModification(originalTask, modifiedTask) {
    if (!originalTask || !modifiedTask) {
      throw new Error('Both original and modified tasks are required');
    }

    const modification = {
      id: this._generateId(),
      originalTask: { ...originalTask },
      modifiedTask: { ...modifiedTask },
      changes: this._detectChanges(originalTask, modifiedTask),
      timestamp: new Date().toISOString()
    };

    this.userBehaviorData.modifications.push(modification);
    this._learnFromModification(modification);
    this._saveToStorage();
    
    console.log('Task modification tracked:', modification.id);
  }

  /**
   * Track user task deletions
   * Requirements: 4.4
   * 
   * @param {Object} deletedTask - Task that was deleted
   * @param {string} reason - Optional reason for deletion
   */
  trackDeletion(deletedTask, reason = null) {
    if (!deletedTask) {
      throw new Error('Deleted task is required');
    }

    const deletion = {
      id: this._generateId(),
      task: { ...deletedTask },
      reason,
      timestamp: new Date().toISOString(),
      wasAutoCreated: this.autoCreatedTasks.some(t => t.id === deletedTask.id)
    };

    this.userBehaviorData.deletions.push(deletion);
    this._learnFromDeletion(deletion);
    this._saveToStorage();
    
    console.log('Task deletion tracked:', deletion.id);
  }

  /**
   * Get automation insights for AI Companion
   * Requirements: 4.2, 4.4
   * 
   * @returns {Object} Insights and suggestions for AI chat
   */
  getAutomationInsights() {
    const insights = {
      recurringPatterns: this.recurringPatterns.length,
      autoCreatedTasks: this.autoCreatedTasks.length,
      pendingConfirmations: this.pendingConfirmations.length,
      suggestions: [],
      learningStats: this._getLearningStats()
    };

    // Generate suggestions based on patterns
    this.recurringPatterns.forEach(pattern => {
      if (!this._hasActiveTaskForPattern(pattern)) {
        insights.suggestions.push({
          type: 'create_task',
          pattern,
          message: `I noticed you usually ${pattern.template.name} ${pattern.frequency}. Would you like me to create this task?`,
          confidence: pattern.confidence
        });
      }
    });

    // Suggest schedule optimization
    if (this.mentalLoadAgent && this.mentalLoadAgent.getCurrentScore() > 70) {
      insights.suggestions.push({
        type: 'optimize_schedule',
        message: 'Your mental load is high. I can help reschedule some tasks to better times.',
        action: 'optimize'
      });
    }

    // Suggest delegation
    const delegationSuggestions = this.mentalLoadAgent?.suggestDelegation() || [];
    if (delegationSuggestions.length > 0) {
      insights.suggestions.push({
        type: 'delegation',
        message: `I found ${delegationSuggestions.length} tasks that could be delegated.`,
        tasks: delegationSuggestions.slice(0, 3)
      });
    }

    return insights;
  }

  /**
   * Configure automation via AI chat
   * Requirements: 4.2, 4.4
   * 
   * @param {Object} config - Configuration from chat interface
   * @returns {Object} Configuration result
   */
  configureViaChat(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Valid configuration object is required');
    }

    const result = {
      success: false,
      changes: [],
      errors: []
    };

    // Handle pattern enabling/disabling
    if (config.enablePattern !== undefined) {
      const pattern = this.recurringPatterns.find(p => p.id === config.patternId);
      if (pattern) {
        pattern.enabled = config.enablePattern;
        result.changes.push(`Pattern ${pattern.template.name} ${config.enablePattern ? 'enabled' : 'disabled'}`);
      }
    }

    // Handle auto-creation preferences
    if (config.autoCreate !== undefined) {
      this.userBehaviorData.preferences.autoCreate = config.autoCreate;
      result.changes.push(`Auto-creation ${config.autoCreate ? 'enabled' : 'disabled'}`);
    }

    // Handle confirmation requirements
    if (config.requireConfirmation !== undefined) {
      this.userBehaviorData.preferences.requireConfirmation = config.requireConfirmation;
      result.changes.push(`Confirmation requirement ${config.requireConfirmation ? 'enabled' : 'disabled'}`);
    }

    // Handle pattern frequency adjustments
    if (config.adjustFrequency && config.patternId) {
      const pattern = this.recurringPatterns.find(p => p.id === config.patternId);
      if (pattern) {
        pattern.frequency = config.adjustFrequency;
        result.changes.push(`Pattern frequency adjusted to ${config.adjustFrequency}`);
      }
    }

    result.success = result.changes.length > 0;
    this._saveToStorage();
    
    console.log('Automation configured via chat:', result);
    return result;
  }

  /**
   * Add task to history for pattern detection
   * @param {Object} task - Task to add to history
   */
  addTaskToHistory(task) {
    if (!task) return;

    const historyEntry = {
      ...task,
      addedToHistoryAt: new Date().toISOString()
    };

    this.taskHistory.push(historyEntry);
    
    // Keep only last 90 days
    const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.taskHistory = this.taskHistory.filter(t => 
      new Date(t.addedToHistoryAt).getTime() > cutoffDate
    );

    this._saveToStorage();
  }

  /**
   * Confirm pending task creation
   * @param {string} taskId - ID of pending task
   * @param {boolean} approved - Whether user approved
   */
  async confirmTaskCreation(taskId, approved) {
    const pending = this.pendingConfirmations.find(p => p.id === taskId);
    if (!pending) {
      throw new Error(`Pending confirmation not found: ${taskId}`);
    }

    if (approved) {
      await this._executeTaskCreation(pending.task, pending.pattern);
      this._learnFromConfirmation(pending, true);
    } else {
      this._learnFromConfirmation(pending, false);
    }

    this.pendingConfirmations = this.pendingConfirmations.filter(p => p.id !== taskId);
    this._saveToStorage();
  }

  /**
   * Get all recurring patterns
   * @returns {Array} Recurring patterns
   */
  getRecurringPatterns() {
    return [...this.recurringPatterns];
  }

  /**
   * Get pending confirmations
   * @returns {Array} Pending confirmations
   */
  getPendingConfirmations() {
    return [...this.pendingConfirmations];
  }

  /**
   * Group similar tasks for pattern detection
   * @private
   */
  _groupSimilarTasks() {
    const groups = [];
    const processed = new Set();

    this.taskHistory.forEach((task, index) => {
      if (processed.has(index)) return;

      const similarTasks = [task];
      processed.add(index);

      for (let i = index + 1; i < this.taskHistory.length; i++) {
        if (processed.has(i)) continue;

        if (this._areSimilarTasks(task, this.taskHistory[i])) {
          similarTasks.push(this.taskHistory[i]);
          processed.add(i);
        }
      }

      if (similarTasks.length >= this.MIN_PATTERN_OCCURRENCES) {
        groups.push({
          tasks: similarTasks,
          representative: task
        });
      }
    });

    return groups;
  }

  /**
   * Check if two tasks are similar
   * @private
   */
  _areSimilarTasks(task1, task2) {
    const name1 = (task1.name || '').toLowerCase().trim();
    const name2 = (task2.name || '').toLowerCase().trim();

    // Exact match
    if (name1 === name2) return true;

    // Similarity score based on common words
    const words1 = name1.split(/\s+/);
    const words2 = name2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    return similarity > 0.6;
  }

  /**
   * Analyze task group to extract pattern
   * @private
   */
  _analyzeTaskGroup(group) {
    const tasks = group.tasks;
    const intervals = [];

    // Calculate time intervals between tasks
    for (let i = 1; i < tasks.length; i++) {
      const prev = new Date(tasks[i - 1].createdAt || tasks[i - 1].addedToHistoryAt);
      const curr = new Date(tasks[i].createdAt || tasks[i].addedToHistoryAt);
      const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    // Determine frequency
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const frequency = this._determineFrequency(avgInterval);

    // Calculate confidence based on interval consistency
    const intervalVariance = this._calculateVariance(intervals);
    const confidence = Math.max(0, 1 - (intervalVariance / avgInterval));

    return {
      id: this._generateId(),
      template: {
        name: group.representative.name,
        description: group.representative.description,
        category: group.representative.category,
        complexity: this._calculateAverageComplexity(tasks),
        tags: this._extractCommonTags(tasks)
      },
      frequency,
      avgInterval,
      occurrences: tasks.length,
      confidence: Math.min(1, confidence),
      lastOccurrence: tasks[tasks.length - 1].createdAt || tasks[tasks.length - 1].addedToHistoryAt,
      enabled: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Determine frequency from average interval
   * @private
   */
  _determineFrequency(avgInterval) {
    if (avgInterval < 1.5) return 'daily';
    if (avgInterval < 4) return 'every-few-days';
    if (avgInterval < 8) return 'weekly';
    if (avgInterval < 20) return 'bi-weekly';
    if (avgInterval < 35) return 'monthly';
    return 'occasional';
  }

  /**
   * Generate task from pattern
   * @private
   */
  _generateTaskFromPattern(pattern) {
    return {
      id: this._generateId(),
      name: pattern.template.name,
      description: pattern.template.description,
      category: pattern.template.category,
      complexity: pattern.template.complexity,
      tags: pattern.template.tags,
      createdAt: new Date().toISOString(),
      autoCreated: true,
      patternId: pattern.id,
      confidence: pattern.confidence
    };
  }

  /**
   * Execute task creation
   * @private
   */
  async _executeTaskCreation(task, pattern) {
    // Add to mental load agent if available
    if (this.mentalLoadAgent) {
      this.mentalLoadAgent.addTask(task);
    }

    // Add to auto-created tasks list
    this.autoCreatedTasks.push({
      ...task,
      executedAt: new Date().toISOString()
    });

    // Notify via Kiro hooks if available
    if (this.hooks && typeof this.hooks.sendNotification === 'function') {
      await this.hooks.sendNotification({
        title: '✨ Task Auto-Created',
        message: `Created: ${task.name}`,
        type: 'automation',
        taskId: task.id
      });
    }

    this._saveToStorage();
    console.log('Task auto-created:', task.id);
    
    return { status: 'created', task };
  }

  /**
   * Request user confirmation
   * @private
   */
  async _requestUserConfirmation(task, pattern) {
    if (this.hooks && typeof this.hooks.sendNotification === 'function') {
      await this.hooks.sendNotification({
        title: '🤖 Task Suggestion',
        message: `Create "${task.name}"? (${pattern.frequency})`,
        type: 'confirmation',
        taskId: task.id,
        actions: [
          { label: 'Create', action: 'confirm' },
          { label: 'Skip', action: 'reject' }
        ]
      });
    }
  }

  /**
   * Detect changes between tasks
   * @private
   */
  _detectChanges(original, modified) {
    const changes = [];

    Object.keys(modified).forEach(key => {
      if (original[key] !== modified[key]) {
        changes.push({
          field: key,
          from: original[key],
          to: modified[key]
        });
      }
    });

    return changes;
  }

  /**
   * Learn from task modification
   * @private
   */
  _learnFromModification(modification) {
    // Analyze common modification patterns
    modification.changes.forEach(change => {
      const prefKey = `modify_${change.field}`;
      
      if (!this.userBehaviorData.preferences[prefKey]) {
        this.userBehaviorData.preferences[prefKey] = {
          count: 0,
          commonValues: {}
        };
      }

      this.userBehaviorData.preferences[prefKey].count++;
      
      // Track common values
      const value = String(change.to);
      if (!this.userBehaviorData.preferences[prefKey].commonValues[value]) {
        this.userBehaviorData.preferences[prefKey].commonValues[value] = 0;
      }
      this.userBehaviorData.preferences[prefKey].commonValues[value]++;
    });

    // Adjust pattern confidence if auto-created task was modified
    if (modification.originalTask.autoCreated) {
      const pattern = this.recurringPatterns.find(p => p.id === modification.originalTask.patternId);
      if (pattern) {
        pattern.confidence = Math.max(0.5, pattern.confidence - 0.1);
      }
    }
  }

  /**
   * Learn from task deletion
   * @private
   */
  _learnFromDeletion(deletion) {
    // If auto-created task was deleted, reduce pattern confidence
    if (deletion.wasAutoCreated) {
      const task = deletion.task;
      const pattern = this.recurringPatterns.find(p => p.id === task.patternId);
      
      if (pattern) {
        pattern.confidence = Math.max(0.3, pattern.confidence - 0.2);
        
        // Disable pattern if confidence drops too low
        if (pattern.confidence < 0.5) {
          pattern.enabled = false;
          console.log(`Pattern disabled due to low confidence: ${pattern.id}`);
        }
      }
    }
  }

  /**
   * Learn from confirmation response
   * @private
   */
  _learnFromConfirmation(pending, approved) {
    const pattern = pending.pattern;
    
    if (approved) {
      pattern.confidence = Math.min(1, pattern.confidence + 0.05);
    } else {
      pattern.confidence = Math.max(0.3, pattern.confidence - 0.15);
      
      if (pattern.confidence < 0.5) {
        pattern.enabled = false;
      }
    }

    // Update user preferences
    if (!this.userBehaviorData.preferences.confirmationHistory) {
      this.userBehaviorData.preferences.confirmationHistory = {
        approved: 0,
        rejected: 0
      };
    }

    if (approved) {
      this.userBehaviorData.preferences.confirmationHistory.approved++;
    } else {
      this.userBehaviorData.preferences.confirmationHistory.rejected++;
    }
  }

  /**
   * Get learning statistics
   * @private
   */
  _getLearningStats() {
    return {
      totalModifications: this.userBehaviorData.modifications.length,
      totalDeletions: this.userBehaviorData.deletions.length,
      autoCreatedTasks: this.autoCreatedTasks.length,
      patternsDetected: this.recurringPatterns.length,
      activePatterns: this.recurringPatterns.filter(p => p.enabled).length,
      confirmationRate: this._calculateConfirmationRate()
    };
  }

  /**
   * Calculate confirmation rate
   * @private
   */
  _calculateConfirmationRate() {
    const history = this.userBehaviorData.preferences.confirmationHistory;
    if (!history || (history.approved + history.rejected) === 0) {
      return 0;
    }

    return history.approved / (history.approved + history.rejected);
  }

  /**
   * Check if pattern has active task
   * @private
   */
  _hasActiveTaskForPattern(pattern) {
    if (!this.mentalLoadAgent) return false;

    const allTasks = this.mentalLoadAgent.getAllTasks();
    return allTasks.some(task => 
      task.patternId === pattern.id && 
      !task.completed
    );
  }

  /**
   * Calculate average complexity
   * @private
   */
  _calculateAverageComplexity(tasks) {
    const complexities = tasks
      .map(t => t.complexity || 5)
      .filter(c => c > 0);

    if (complexities.length === 0) return 5;

    return Math.round(
      complexities.reduce((a, b) => a + b, 0) / complexities.length
    );
  }

  /**
   * Extract common tags from tasks
   * @private
   */
  _extractCommonTags(tasks) {
    const tagCounts = {};

    tasks.forEach(task => {
      const tags = task.tags || [];
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Return tags that appear in at least 50% of tasks
    const threshold = tasks.length * 0.5;
    return Object.keys(tagCounts).filter(tag => tagCounts[tag] >= threshold);
  }

  /**
   * Calculate variance
   * @private
   */
  _calculateVariance(numbers) {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load data from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const history = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      if (history) {
        this.taskHistory = JSON.parse(history);
      }

      const patterns = localStorage.getItem(this.STORAGE_KEY_PATTERNS);
      if (patterns) {
        this.recurringPatterns = JSON.parse(patterns);
      }

      const behavior = localStorage.getItem(this.STORAGE_KEY_BEHAVIOR);
      if (behavior) {
        this.userBehaviorData = JSON.parse(behavior);
      }

      const autoTasks = localStorage.getItem(this.STORAGE_KEY_AUTO_TASKS);
      if (autoTasks) {
        this.autoCreatedTasks = JSON.parse(autoTasks);
      }

      console.log('Task automation data loaded from storage');
    } catch (error) {
      console.error('Failed to load task automation data:', error);
    }
  }

  /**
   * Save data to localStorage
   * @private
   */
  _saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(this.taskHistory));
      localStorage.setItem(this.STORAGE_KEY_PATTERNS, JSON.stringify(this.recurringPatterns));
      localStorage.setItem(this.STORAGE_KEY_BEHAVIOR, JSON.stringify(this.userBehaviorData));
      localStorage.setItem(this.STORAGE_KEY_AUTO_TASKS, JSON.stringify(this.autoCreatedTasks));
    } catch (error) {
      console.error('Failed to save task automation data:', error);
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
  module.exports = TaskAutomationAgent;
}
