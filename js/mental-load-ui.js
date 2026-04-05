/**
 * Mental Load UI Integration
 * 
 * Connects MentalLoadAgent to the HerFlow UI components
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1
 */

// Global mental load agent instance
let mentalLoadAgent = null;

/**
 * Initialize Mental Load Agent and connect to UI
 */
function initializeMentalLoadAgent() {
  try {
    // Create agent instance
    mentalLoadAgent = new MentalLoadAgent();
    
    // Load existing tasks from UI
    syncTasksFromUI();
    
    // Update UI with calculated scores
    updateMentalLoadUI();
    
    // Set up event listeners
    setupMentalLoadEventListeners();
    
    console.log('Mental Load Agent initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mental Load Agent:', error);
  }
}

/**
 * Sync tasks from UI to agent
 */
function syncTasksFromUI() {
  const tasks = [];
  
  // Extract tasks from each category
  const categories = ['work', 'home', 'family', 'self'];
  
  categories.forEach(category => {
    const itemsContainer = document.getElementById(`${category}-items`);
    if (!itemsContainer) return;
    
    const items = itemsContainer.querySelectorAll('.lc-item');
    items.forEach((item, index) => {
      const text = item.querySelector('span')?.textContent?.trim();
      if (!text) return;
      
      const isDone = item.classList.contains('done');
      
      tasks.push({
        id: `${category}_${index}_${Date.now()}`,
        name: text,
        category: category,
        completed: isDone,
        complexity: estimateComplexity(text),
        urgency: estimateUrgency(text)
      });
    });
  });
  
  // Categorize tasks in agent
  mentalLoadAgent.categorizeTasks(tasks);
}

/**
 * Estimate task complexity from text
 */
function estimateComplexity(text) {
  const lowComplexityKeywords = ['call', 'email', 'reply', 'pay', 'book', 'order'];
  const highComplexityKeywords = ['project', 'presentation', 'review', 'plan', 'prepare', 'document'];
  
  const lowerText = text.toLowerCase();
  
  if (highComplexityKeywords.some(kw => lowerText.includes(kw))) {
    return 7;
  }
  if (lowComplexityKeywords.some(kw => lowerText.includes(kw))) {
    return 3;
  }
  return 5; // Default medium complexity
}

/**
 * Estimate task urgency from text
 */
function estimateUrgency(text) {
  const urgentKeywords = ['today', 'deadline', 'urgent', 'asap', 'due', 'now'];
  const lowerText = text.toLowerCase();
  
  return urgentKeywords.some(kw => lowerText.includes(kw)) ? 'high' : 'medium';
}

/**
 * Update all Mental Load UI components
 */
function updateMentalLoadUI() {
  updateLoadMeter();
  updateCategoryBreakdowns();
  updateDelegationPanel();
  updateDashboardInsights();
}

/**
 * Update the circular load meter
 */
function updateLoadMeter() {
  const score = mentalLoadAgent.getCurrentScore();
  
  // Update dashboard load meter
  const loadPct = document.querySelector('.load-pct');
  const loadSub = document.querySelector('.load-sub');
  const loadFg = document.querySelector('.load-fg');
  
  if (loadPct) {
    loadPct.textContent = `${score}%`;
  }
  
  if (loadSub) {
    if (score >= 80) {
      loadSub.textContent = 'critical';
    } else if (score >= 60) {
      loadSub.textContent = 'overloaded';
    } else if (score >= 40) {
      loadSub.textContent = 'moderate';
    } else {
      loadSub.textContent = 'balanced';
    }
  }
  
  if (loadFg) {
    // Calculate stroke-dashoffset for circular progress
    const circumference = 314; // 2 * PI * radius (50)
    const offset = circumference - (score / 100) * circumference;
    loadFg.setAttribute('stroke-dashoffset', offset);
    
    // Update color based on score
    if (score >= 80) {
      loadFg.setAttribute('stroke', '#B91C1C'); // Red
    } else if (score >= 60) {
      loadFg.setAttribute('stroke', 'var(--rose)');
    } else {
      loadFg.setAttribute('stroke', 'var(--sage)');
    }
  }
}

/**
 * Update category breakdown bars
 */
function updateCategoryBreakdowns() {
  const categories = ['work', 'home', 'family', 'self'];
  const allTasks = mentalLoadAgent.getAllTasks();
  const totalTasks = allTasks.length;
  
  if (totalTasks === 0) return;
  
  categories.forEach(category => {
    const categoryTasks = mentalLoadAgent.getTasksByCategory(category);
    const percentage = Math.round((categoryTasks.length / totalTasks) * 100);
    
    // Update dashboard breakdown bars using a more robust selector
    const categoryLabel = getCategoryLabel(category);
    const allLbRows = document.querySelectorAll('.lb-row');
    
    allLbRows.forEach(row => {
      const label = row.querySelector('.lb-label');
      if (label && label.textContent.trim() === categoryLabel) {
        const barElement = row.querySelector('.lb-bar');
        const pctElement = row.querySelector('.lb-pct');
        
        if (barElement) {
          barElement.style.width = `${percentage}%`;
        }
        
        if (pctElement) {
          pctElement.textContent = `${percentage}%`;
        }
      }
    });
    
    // Update Mental Load tab progress bars
    const categoryBar = document.getElementById(`${category}-bar`);
    if (categoryBar) {
      categoryBar.style.width = `${percentage}%`;
    }
    
    // Update category count
    const categoryCount = document.getElementById(`${category}-count`);
    if (categoryCount) {
      categoryCount.textContent = categoryTasks.length;
    }
  });
}

/**
 * Get display label for category
 */
function getCategoryLabel(category) {
  const labels = {
    work: 'Work',
    home: 'Home mgmt',
    family: 'Family care',
    self: 'Self-care'
  };
  return labels[category] || category;
}

/**
 * Update delegation suggestions panel
 */
function updateDelegationPanel() {
  const suggestions = mentalLoadAgent.suggestDelegation();
  const delegationBox = document.querySelector('.delegation-box');
  
  if (!delegationBox) return;
  
  // Hide if no suggestions
  if (suggestions.length === 0) {
    delegationBox.style.display = 'none';
    return;
  }
  
  delegationBox.style.display = 'block';
  
  // Update delegation items
  const delegateItems = delegationBox.querySelector('.delegate-items');
  if (!delegateItems) return;
  
  // Clear existing items
  delegateItems.innerHTML = '';
  
  // Add new suggestions
  suggestions.slice(0, 5).forEach(suggestion => {
    const item = document.createElement('div');
    item.className = 'delegate-item';
    
    const suggestedTo = Array.isArray(suggestion.suggestedTo) 
      ? suggestion.suggestedTo[0] 
      : suggestion.suggestedTo;
    
    item.innerHTML = `
      <span class="delegate-text">${suggestion.task.name}</span>
      <span class="delegate-to">→ ${suggestedTo}</span>
      <button class="delegate-btn" onclick="handleDelegation('${suggestion.task.id}', this)">Delegate ✓</button>
    `;
    
    delegateItems.appendChild(item);
  });
}

/**
 * Handle delegation button click
 */
function handleDelegation(taskId, button) {
  // Mark as delegated
  button.textContent = '✓ Delegated';
  button.style.background = 'var(--sage-light)';
  button.style.color = 'var(--sage)';
  button.style.borderColor = 'var(--sage)';
  button.disabled = true;
  
  // Remove task from agent
  mentalLoadAgent.removeTask(taskId);
  
  // Update UI
  updateMentalLoadUI();
}

/**
 * Update dashboard insights
 */
function updateDashboardInsights() {
  const allTasks = mentalLoadAgent.getAllTasks();
  const totalTasks = allTasks.length;
  
  // Update "Tasks in your head" insight
  const tasksInsight = document.querySelector('.insight-card:first-child .insight-a');
  if (tasksInsight) {
    tasksInsight.textContent = totalTasks;
  }
}

/**
 * Set up event listeners for task changes
 */
function setupMentalLoadEventListeners() {
  // Override existing toggleLC function to trigger updates
  const originalToggleLC = window.toggleLC;
  window.toggleLC = function(el) {
    originalToggleLC(el);
    
    // Delay to allow DOM update
    setTimeout(() => {
      syncTasksFromUI();
      updateMentalLoadUI();
    }, 100);
  };
  
  // Override existing addTask function to trigger updates
  const originalAddTask = window.addTask;
  window.addTask = function(e, listId, countId, qaId) {
    originalAddTask(e, listId, countId, qaId);
    
    // Delay to allow DOM update
    setTimeout(() => {
      syncTasksFromUI();
      updateMentalLoadUI();
    }, 100);
  };
}

/**
 * Add trend visualization to Mental Load tab
 */
function addTrendVisualization() {
  const trends = mentalLoadAgent.trackTrends();
  
  if (!trends.hasEnoughData) {
    return;
  }
  
  // Find Mental Load tab
  const mentalLoadTab = document.getElementById('tab-load');
  if (!mentalLoadTab) return;
  
  // Check if trend chart already exists
  let trendCard = mentalLoadTab.querySelector('.trend-card');
  
  if (!trendCard) {
    // Create trend card
    trendCard = document.createElement('div');
    trendCard.className = 'card trend-card';
    trendCard.style.marginTop = '16px';
    
    mentalLoadTab.appendChild(trendCard);
  }
  
  // Update trend card content
  const directionIcon = trends.direction === 'increasing' ? '📈' : 
                        trends.direction === 'decreasing' ? '📉' : '➡️';
  
  const directionColor = trends.direction === 'increasing' ? 'var(--rose)' : 
                         trends.direction === 'decreasing' ? 'var(--sage)' : 'var(--ink-mid)';
  
  trendCard.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:var(--ink);margin-bottom:12px">
      ${directionIcon} Mental Load Trend
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <div style="font-size:11px;color:var(--ink-light);margin-bottom:4px">CURRENT</div>
        <div style="font-family:var(--font-display);font-size:24px;color:var(--ink)">${trends.current}%</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--ink-light);margin-bottom:4px">7-DAY AVG</div>
        <div style="font-family:var(--font-display);font-size:24px;color:var(--ink)">${Math.round(trends.recentAverage)}%</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--ink-light);margin-bottom:4px">TREND</div>
        <div style="font-family:var(--font-display);font-size:24px;color:${directionColor}">
          ${trends.direction === 'increasing' ? '+' : trends.direction === 'decreasing' ? '-' : ''}${Math.abs(Math.round(trends.changePercent))}%
        </div>
      </div>
    </div>
    ${trends.recommendations.length > 0 ? `
      <div style="background:var(--rose-pale);border-radius:8px;padding:10px;font-size:12px;color:var(--ink-mid)">
        <strong style="color:var(--ink)">💡 Insight:</strong> ${trends.recommendations[0].message}
      </div>
    ` : ''}
  `;
}

/**
 * Initialize on page load
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeMentalLoadAgent();
    
    // Add trend visualization after a short delay
    setTimeout(() => {
      addTrendVisualization();
    }, 1000);
  });
} else {
  initializeMentalLoadAgent();
  
  // Add trend visualization after a short delay
  setTimeout(() => {
    addTrendVisualization();
  }, 1000);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeMentalLoadAgent,
    updateMentalLoadUI,
    handleDelegation
  };
}
