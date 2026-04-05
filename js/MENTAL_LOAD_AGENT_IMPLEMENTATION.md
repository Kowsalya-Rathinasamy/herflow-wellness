# Mental Load Agent Implementation

## Overview

The Mental Load Agent is a comprehensive system for tracking and analyzing mental load patterns with AI-powered insights. It automatically categorizes tasks, calculates load scores, provides delegation suggestions, tracks trends over time, and optimizes task scheduling.

## Implementation Summary

### Files Created

1. **js/mental-load-agent.js** - Main MentalLoadAgent class implementation
2. **js/mental-load-agent.test.js** - Comprehensive unit tests (51 tests, all passing)
3. **js/MENTAL_LOAD_AGENT_IMPLEMENTATION.md** - This documentation

## Core Features Implemented

### 1. Mental Load Score Calculation (Requirement 3.1)

**Algorithm:**
- Base score from task count (0-60 points) using logarithmic scale
- Complexity multiplier (1.0-2.0) based on average task complexity
- Urgency factor (0-20 points) for high-priority tasks
- Category balance factor (0-20 points) penalizing imbalanced loads
- Final score capped at 0-100 range

**Key Methods:**
- `calculateLoadScore()` - Computes mental load score
- `_calculateAverageComplexity()` - Analyzes task complexity
- `_calculateUrgencyScore()` - Evaluates urgent tasks
- `_calculateBalanceScore()` - Measures category distribution

### 2. Task Categorization (Requirements 3.2, 4.1)

**Categories:**
- **Work**: Job-related tasks, meetings, projects, deadlines
- **Home**: Household chores, maintenance, groceries
- **Family**: Childcare, school activities, family events
- **Self**: Wellness, exercise, hobbies, personal care

**Key Methods:**
- `categorizeTasks(tasks)` - Categorizes array of tasks
- `_determineCategory(task)` - Keyword-based category detection
- `addTask(task)` - Adds and auto-categorizes single task
- `getTasksByCategory(category)` - Retrieves tasks by category

**Categorization Logic:**
Uses keyword matching on task name, description, and tags to automatically assign categories.

### 3. Delegation Suggestions (Requirements 3.4, 4.3)

**Threshold Logic:**
- Only triggers when mental load score > 70
- Returns empty array when score ≤ 70

**Delegation Scoring Factors:**
- Low complexity tasks (+0.3)
- Recurring/routine tasks (+0.2)
- No specialized skills required (+0.2)
- Work/home categories (+0.2)
- Non-urgent tasks (+0.1)

**Key Methods:**
- `suggestDelegation()` - Generates delegation suggestions
- `_calculateDelegationScore(task)` - Scores task delegatability
- `_getDelegationReason(task)` - Explains why task is delegatable
- `_suggestDelegatee(task)` - Recommends who to delegate to

**Output Format:**
```javascript
{
  task: {...},
  delegationScore: 0.8,
  reason: "Low complexity task, Recurring task",
  suggestedTo: ["Team member", "Colleague"],
  priority: "high" // or "medium"
}
```

### 4. Trend Tracking (Requirement 3.3)

**Historical Data:**
- Stores up to 90 days of load scores
- Includes timestamp and task count with each score
- Automatically prunes old data

**Trend Analysis:**
- Compares recent 7 days vs previous 7 days
- Calculates direction: increasing, decreasing, or stable
- Computes volatility (standard deviation)
- Identifies peak and low scores
- Generates recommendations based on patterns

**Key Methods:**
- `trackTrends()` - Analyzes historical patterns
- `_recordScore(score)` - Stores score with timestamp
- `_getRecentScores(days)` - Retrieves recent scores
- `_determineTrendDirection()` - Calculates trend direction
- `_calculateVolatility()` - Measures score fluctuation

**Recommendations:**
- Alert when load increasing >20%
- Stability advice for high volatility
- Urgent action for score >80

### 5. Schedule Optimization (Requirements 4.2, 4.4)

**Optimization Factors:**
- Historical low-load periods (day of week + time of day)
- Category load distribution
- Task urgency and complexity
- Calendar_Agent integration for scheduling

**Key Methods:**
- `optimizeSchedule(task)` - Generates scheduling recommendations
- `_identifyLowLoadPeriods()` - Finds optimal time slots
- `_getCategoryLoad(category)` - Calculates category percentage

**Output Format:**
```javascript
{
  task: {...},
  suggestedTimes: [
    {
      dayOfWeek: "Tuesday",
      timeOfDay: "morning",
      expectedLoad: 45,
      confidence: 0.8
    }
  ],
  reasoning: [
    "Based on your patterns, Tuesday morning typically has lower mental load.",
    "Your work category is currently overloaded..."
  ],
  calendarIntegration: {
    available: true,
    message: "Can automatically schedule this task in your calendar"
  }
}
```

## Data Persistence

**localStorage Keys:**
- `herflow_mental_load_tasks` - Task data by category
- `herflow_mental_load_scores` - Historical scores

**Auto-save Triggers:**
- Task addition/removal
- Score calculation
- Category updates

**Auto-load:**
- On agent initialization
- Recalculates current score from loaded tasks

## Integration Points

### Kiro Hooks Integration
- Constructor accepts `kiroHooks` parameter
- Ready for notification integration
- Supports mental load monitoring hooks

### Calendar_Agent Integration
- Constructor accepts `calendarAgent` parameter
- Used in schedule optimization
- Enables automatic calendar scheduling

## API Reference

### Constructor
```javascript
new MentalLoadAgent(kiroHooks = null, calendarAgent = null)
```

### Core Methods

**Score Calculation:**
- `calculateLoadScore()` → number (0-100)
- `getCurrentScore()` → number

**Task Management:**
- `addTask(task)` → categorizedTask
- `removeTask(taskId)` → boolean
- `getAllTasks()` → Array
- `getTasksByCategory(category)` → Array

**Categorization:**
- `categorizeTasks(tasks)` → Object {work, home, self, family}

**Delegation:**
- `suggestDelegation()` → Array of suggestions

**Trends:**
- `trackTrends()` → Object with trend analysis
- `getHistoricalScores(days)` → Array

**Scheduling:**
- `optimizeSchedule(task)` → Object with recommendations

**Cleanup:**
- `destroy()` - Saves data and cleans up resources

## Testing

**Test Coverage:**
- 51 unit tests, all passing
- Tests all core functionality
- Edge case handling
- Persistence verification
- Integration scenarios

**Test Categories:**
1. Constructor initialization
2. Score calculation (10 tests)
3. Task categorization (7 tests)
4. Delegation suggestions (5 tests)
5. Trend tracking (6 tests)
6. Schedule optimization (5 tests)
7. Task management (9 tests)
8. Persistence (4 tests)
9. Edge cases (5 tests)

## Usage Example

```javascript
// Initialize agent
const kiroHooks = { sendNotification: async (data) => {...} };
const calendarAgent = new CalendarAgentAdapter();
const agent = new MentalLoadAgent(kiroHooks, calendarAgent);

// Add tasks
agent.addTask({
  name: 'Finish project report',
  complexity: 7,
  urgency: 'high',
  description: 'Complete Q4 report'
});

agent.addTask({
  name: 'Buy groceries',
  complexity: 3,
  recurring: true
});

// Calculate load
const score = agent.calculateLoadScore();
console.log(`Mental load score: ${score}`);

// Get delegation suggestions (if score > 70)
const suggestions = agent.suggestDelegation();
suggestions.forEach(s => {
  console.log(`Delegate: ${s.task.name} to ${s.suggestedTo[0]}`);
});

// Track trends
const trends = agent.trackTrends();
console.log(`Trend: ${trends.direction}`);
console.log(`Recent average: ${trends.recentAverage}`);

// Optimize schedule
const task = { name: 'Team meeting', category: 'work', complexity: 5 };
const schedule = agent.optimizeSchedule(task);
console.log(`Best time: ${schedule.suggestedTimes[0].dayOfWeek} ${schedule.suggestedTimes[0].timeOfDay}`);

// Cleanup
agent.destroy();
```

## Requirements Validation

✅ **3.1** - Mental load score calculation (0-100 scale)
✅ **3.2** - Task categorization by domain (work, home, self, family)
✅ **3.3** - Trend analysis over time with historical data
✅ **3.4** - Delegation suggestions when load > 70
✅ **4.1** - Automatic task categorization
✅ **4.2** - Optimal task scheduling based on patterns
✅ **4.3** - Task delegation identification
✅ **4.4** - Learning from user behavior (pattern analysis)

## Next Steps

The Mental Load Agent is fully implemented and tested. To integrate with the UI:

1. **Task 7.1-7.4**: Connect agent to Mental Load Tracker tab UI
2. **Task 9**: Implement agentic task automation features
3. **Task 10**: Wire all components together with initialization script

## Notes

- All code follows existing HerFlow patterns
- Comprehensive error handling included
- localStorage persistence implemented
- Ready for Kiro hooks integration
- Calendar_Agent integration prepared
- Extensive test coverage ensures reliability
