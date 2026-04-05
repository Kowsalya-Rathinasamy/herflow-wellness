/**
 * CalendarAgentAdapter - Unified interface to Calendar_Agent
 * 
 * Provides date fetching, formatting, and caching capabilities
 * with error handling and fallback mechanisms.
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.5
 */

class CalendarAgentAdapter {
  constructor(agentEndpoint = '/api/calendar-agent') {
    this.endpoint = agentEndpoint;
    this.cache = new Map();
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.MAX_RETRIES = 3;
    this.INITIAL_RETRY_DELAY = 1000; // 1 second
  }

  /**
   * Fetch current month dates from Calendar_Agent
   * @returns {Promise<Array>} Array of date objects for current month
   */
  async getCurrentMonthDates() {
    const now = new Date();
    const cacheKey = `month-${now.getFullYear()}-${now.getMonth()}`;
    
    // Check cache first
    const cached = this.getCachedDates(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const dates = await this._fetchWithRetry('/current-month');
      this._setCacheData(cacheKey, dates);
      return dates;
    } catch (error) {
      console.error('Failed to fetch current month dates:', error);
      // Fallback to client-side calculation
      return this._calculateCurrentMonthDates();
    }
  }

  /**
   * Fetch week dates starting from a specific date
   * @param {Date} startDate - Starting date for the week
   * @returns {Promise<Array>} Array of date objects for the week
   */
  async getWeekDates(startDate) {
    const cacheKey = `week-${startDate.toISOString().split('T')[0]}`;
    
    // Check cache first
    const cached = this.getCachedDates(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const dates = await this._fetchWithRetry('/week', {
        startDate: startDate.toISOString()
      });
      this._setCacheData(cacheKey, dates);
      return dates;
    } catch (error) {
      console.error('Failed to fetch week dates:', error);
      // Fallback to client-side calculation
      return this._calculateWeekDates(startDate);
    }
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @param {string} format - Format string ('short', 'long', 'iso', 'custom')
   * @returns {string} Formatted date string
   */
  formatDate(date, format = 'short') {
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error('Invalid date provided');
    }

    const formats = {
      short: { month: 'short', day: 'numeric' },
      long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
      iso: null, // Handle separately
      dayName: { weekday: 'short' },
      monthYear: { year: 'numeric', month: 'long' }
    };

    if (format === 'iso') {
      return date.toISOString().split('T')[0];
    }

    if (formats[format]) {
      return date.toLocaleDateString('en-US', formats[format]);
    }

    // Default to short format
    return date.toLocaleDateString('en-US', formats.short);
  }

  /**
   * Retrieve cached date data
   * @param {string} key - Cache key
   * @returns {Array|null} Cached data or null if expired/missing
   */
  getCachedDates(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    // Cache is invalid if older than 24 hours
    if (age > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache data with timestamp
   * @private
   */
  _setCacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch data from Calendar_Agent with exponential backoff retry
   * @private
   */
  async _fetchWithRetry(path, params = {}, retryCount = 0) {
    try {
      // Support both browser and Node.js environments
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost';
      
      const url = new URL(this.endpoint + path, baseUrl);
      Object.keys(params).forEach(key => 
        url.searchParams.append(key, params[key])
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(`Retry ${retryCount + 1}/${this.MAX_RETRIES} after ${delay}ms`);
        
        await this._sleep(delay);
        return this._fetchWithRetry(path, params, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fallback: Calculate current month dates client-side
   * @private
   */
  _calculateCurrentMonthDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const dates = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      dates.push({
        date: date,
        day: day,
        dayOfWeek: date.getDay(),
        dayName: this.formatDate(date, 'dayName'),
        isToday: this._isToday(date),
        formatted: this.formatDate(date, 'short')
      });
    }
    
    return dates;
  }

  /**
   * Fallback: Calculate week dates client-side
   * @private
   */
  _calculateWeekDates(startDate) {
    const dates = [];
    const start = new Date(startDate);
    
    // Adjust to start of week (Sunday)
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      dates.push({
        date: date,
        day: date.getDate(),
        dayOfWeek: date.getDay(),
        dayName: this.formatDate(date, 'dayName'),
        isToday: this._isToday(date),
        formatted: this.formatDate(date, 'short')
      });
    }
    
    return dates;
  }

  /**
   * Check if a date is today
   * @private
   */
  _isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      oldestEntry: null,
      newestEntry: null
    };

    let oldest = Infinity;
    let newest = 0;

    this.cache.forEach((value) => {
      if (value.timestamp < oldest) oldest = value.timestamp;
      if (value.timestamp > newest) newest = value.timestamp;
    });

    if (oldest !== Infinity) {
      stats.oldestEntry = new Date(oldest);
      stats.newestEntry = new Date(newest);
    }

    return stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarAgentAdapter;
}
