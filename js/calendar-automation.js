/**
 * CalendarAutomation - Manages dynamic calendar rendering and updates
 * 
 * Handles calendar initialization, month navigation, week view rendering,
 * and today highlighting using Calendar_Agent for date fetching.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2
 */

class CalendarAutomation {
  constructor(calendarAgent) {
    if (!calendarAgent) {
      throw new Error('CalendarAgentAdapter is required');
    }
    
    this.agent = calendarAgent;
    this.currentMonth = null;
    this.currentYear = null;
    this.weekDates = [];
    this.todayCheckInterval = null;
  }

  /**
   * Initialize calendar on page load
   * Fetches current month dates and renders week view
   * Requirements: 1.1, 5.1
   */
  async initialize() {
    try {
      const now = new Date();
      this.currentMonth = now.getMonth();
      this.currentYear = now.getFullYear();
      
      // Fetch current month dates
      const monthDates = await this.agent.getCurrentMonthDates();
      
      // Get current week dates
      this.weekDates = await this.agent.getWeekDates(now);
      
      // Render week view
      this.renderWeekView(this.weekDates);
      
      // Highlight today
      this.highlightToday();
      
      // Set up midnight rollover check
      this._setupMidnightCheck();
      
      console.log('Calendar automation initialized successfully');
    } catch (error) {
      console.error('Failed to initialize calendar:', error);
      // Fallback to client-side rendering
      await this._initializeFallback();
    }
  }

  /**
   * Update calendar for a specific month and year
   * Requirements: 1.2, 5.2
   * 
   * @param {number} month - Month (0-11)
   * @param {number} year - Year (e.g., 2024)
   */
  async updateCalendar(month, year) {
    try {
      this.currentMonth = month;
      this.currentYear = year;
      
      // Create a date for the first day of the specified month
      const firstDayOfMonth = new Date(year, month, 1);
      
      // Get week dates for the first week of the month
      this.weekDates = await this.agent.getWeekDates(firstDayOfMonth);
      
      // Render updated week view
      this.renderWeekView(this.weekDates);
      
      // Update today highlighting
      this.highlightToday();
      
      console.log(`Calendar updated to ${month + 1}/${year}`);
    } catch (error) {
      console.error('Failed to update calendar:', error);
      throw error;
    }
  }

  /**
   * Render week view with dynamic dates
   * Requirements: 1.4, 5.2
   * 
   * @param {Array} weekDates - Array of date objects from Calendar_Agent
   */
  renderWeekView(weekDates) {
    if (!weekDates || weekDates.length === 0) {
      console.warn('No week dates provided for rendering');
      return;
    }

    const weekHeader = document.querySelector('.week-header');
    if (!weekHeader) {
      console.error('Week header element not found');
      return;
    }

    // Clear existing content
    weekHeader.innerHTML = '';

    // Render each day
    weekDates.forEach((dateObj) => {
      const dayElement = document.createElement('div');
      dayElement.className = 'week-day';
      
      // Add data attribute for date tracking
      dayElement.setAttribute('data-date', this.agent.formatDate(dateObj.date, 'iso'));
      dayElement.setAttribute('data-day', dateObj.day);
      dayElement.setAttribute('data-day-of-week', dateObj.dayOfWeek);
      
      // Create day name element
      const dayName = document.createElement('div');
      dayName.className = 'day-name';
      dayName.textContent = dateObj.dayName;
      
      // Create day number element
      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = dateObj.day;
      
      // Append to day element
      dayElement.appendChild(dayName);
      dayElement.appendChild(dayNum);
      
      // Append to week header
      weekHeader.appendChild(dayElement);
    });

    console.log('Week view rendered with dynamic dates');
  }

  /**
   * Highlight today's date in the calendar
   * Requirements: 1.3
   */
  highlightToday() {
    const weekDays = document.querySelectorAll('.week-day');
    const today = new Date();
    const todayISO = this.agent.formatDate(today, 'iso');

    weekDays.forEach((dayElement) => {
      const dateAttr = dayElement.getAttribute('data-date');
      
      if (dateAttr === todayISO) {
        dayElement.classList.add('today-col');
      } else {
        dayElement.classList.remove('today-col');
      }
    });

    console.log('Today highlighting updated');
  }

  /**
   * Set up interval to check for midnight rollover
   * Updates today highlighting when date changes
   * Requirements: 1.3
   * @private
   */
  _setupMidnightCheck() {
    // Clear existing interval if any
    if (this.todayCheckInterval) {
      clearInterval(this.todayCheckInterval);
    }

    // Check every minute for date change
    this.todayCheckInterval = setInterval(() => {
      const now = new Date();
      const currentDate = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // If date has changed, update highlighting
      if (currentMonth !== this.currentMonth || currentYear !== this.currentYear) {
        // Month or year changed, reinitialize
        this.initialize();
      } else {
        // Just update highlighting
        this.highlightToday();
      }
    }, 60000); // Check every minute
  }

  /**
   * Fallback initialization using client-side date calculation
   * @private
   */
  async _initializeFallback() {
    console.warn('Using fallback calendar initialization');
    
    const now = new Date();
    this.currentMonth = now.getMonth();
    this.currentYear = now.getFullYear();
    
    // Use adapter's fallback methods
    this.weekDates = this.agent._calculateWeekDates(now);
    
    this.renderWeekView(this.weekDates);
    this.highlightToday();
    this._setupMidnightCheck();
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.todayCheckInterval) {
      clearInterval(this.todayCheckInterval);
      this.todayCheckInterval = null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarAutomation;
}
