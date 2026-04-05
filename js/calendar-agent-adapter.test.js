/**
 * Unit tests for CalendarAgentAdapter
 * Tests core functionality including caching, error handling, and fallback mechanisms
 */

// Mock fetch for testing
global.fetch = jest.fn();

const CalendarAgentAdapter = require('./calendar-agent-adapter');

describe('CalendarAgentAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new CalendarAgentAdapter('/api/calendar-agent');
    adapter.clearCache();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('initializes with default endpoint', () => {
      const defaultAdapter = new CalendarAgentAdapter();
      expect(defaultAdapter.endpoint).toBe('/api/calendar-agent');
    });

    test('initializes with custom endpoint', () => {
      const customAdapter = new CalendarAgentAdapter('/custom/endpoint');
      expect(customAdapter.endpoint).toBe('/custom/endpoint');
    });

    test('initializes cache as empty Map', () => {
      expect(adapter.cache).toBeInstanceOf(Map);
      expect(adapter.cache.size).toBe(0);
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T12:00:00Z');

    test('formats date in short format', () => {
      const formatted = adapter.formatDate(testDate, 'short');
      expect(formatted).toMatch(/Jan 15/);
    });

    test('formats date in long format', () => {
      const formatted = adapter.formatDate(testDate, 'long');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    test('formats date in ISO format', () => {
      const formatted = adapter.formatDate(testDate, 'iso');
      expect(formatted).toBe('2024-01-15');
    });

    test('formats date with dayName format', () => {
      const formatted = adapter.formatDate(testDate, 'dayName');
      expect(formatted).toMatch(/Mon/);
    });

    test('throws error for invalid date', () => {
      expect(() => adapter.formatDate('invalid')).toThrow('Invalid date provided');
    });

    test('defaults to short format for unknown format', () => {
      const formatted = adapter.formatDate(testDate, 'unknown');
      expect(formatted).toMatch(/Jan 15/);
    });
  });

  describe('Cache Management', () => {
    test('getCachedDates returns null for missing key', () => {
      const result = adapter.getCachedDates('nonexistent');
      expect(result).toBeNull();
    });

    test('getCachedDates returns data within cache duration', () => {
      const testData = [{ date: '2024-01-15' }];
      adapter._setCacheData('test-key', testData);
      
      const result = adapter.getCachedDates('test-key');
      expect(result).toEqual(testData);
    });

    test('getCachedDates returns null for expired cache', () => {
      const testData = [{ date: '2024-01-15' }];
      adapter._setCacheData('test-key', testData);
      
      // Manually set timestamp to 25 hours ago
      const cached = adapter.cache.get('test-key');
      cached.timestamp = Date.now() - (25 * 60 * 60 * 1000);
      adapter.cache.set('test-key', cached);
      
      const result = adapter.getCachedDates('test-key');
      expect(result).toBeNull();
      expect(adapter.cache.has('test-key')).toBe(false);
    });

    test('clearCache removes all cached data', () => {
      adapter._setCacheData('key1', [1, 2, 3]);
      adapter._setCacheData('key2', [4, 5, 6]);
      expect(adapter.cache.size).toBe(2);
      
      adapter.clearCache();
      expect(adapter.cache.size).toBe(0);
    });

    test('getCacheStats returns correct statistics', () => {
      adapter._setCacheData('key1', [1]);
      adapter._setCacheData('key2', [2]);
      
      const stats = adapter.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(['key1', 'key2']);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentMonthDates', () => {
    test('returns cached data if available', async () => {
      const cachedData = [{ date: '2024-01-15' }];
      const now = new Date();
      const cacheKey = `month-${now.getFullYear()}-${now.getMonth()}`;
      adapter._setCacheData(cacheKey, cachedData);
      
      const result = await adapter.getCurrentMonthDates();
      expect(result).toEqual(cachedData);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('fetches from API when cache is empty', async () => {
      const apiData = [{ date: '2024-01-15' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiData
      });
      
      const result = await adapter.getCurrentMonthDates();
      expect(result).toEqual(apiData);
      expect(fetch).toHaveBeenCalled();
    }, 10000); // 10 second timeout

    test('falls back to client-side calculation on API failure', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      const result = await adapter.getCurrentMonthDates();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('day');
      expect(result[0]).toHaveProperty('dayOfWeek');
    }, 10000); // 10 second timeout
  });

  describe('getWeekDates', () => {
    const testDate = new Date('2024-01-15');

    test('returns cached data if available', async () => {
      const cachedData = [{ date: '2024-01-15' }];
      const cacheKey = `week-${testDate.toISOString().split('T')[0]}`;
      adapter._setCacheData(cacheKey, cachedData);
      
      const result = await adapter.getWeekDates(testDate);
      expect(result).toEqual(cachedData);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('fetches from API when cache is empty', async () => {
      const apiData = [{ date: '2024-01-15' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiData
      });
      
      const result = await adapter.getWeekDates(testDate);
      expect(result).toEqual(apiData);
      expect(fetch).toHaveBeenCalled();
    }, 10000); // 10 second timeout

    test('falls back to client-side calculation on API failure', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      const result = await adapter.getWeekDates(testDate);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('dayOfWeek');
    }, 10000); // 10 second timeout
  });

  describe('Fallback Calculations', () => {
    test('_calculateCurrentMonthDates returns correct number of days', () => {
      const result = adapter._calculateCurrentMonthDates();
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      expect(result.length).toBe(daysInMonth);
    });

    test('_calculateCurrentMonthDates marks today correctly', () => {
      const result = adapter._calculateCurrentMonthDates();
      const today = new Date();
      const todayEntry = result.find(d => d.day === today.getDate());
      
      expect(todayEntry.isToday).toBe(true);
    });

    test('_calculateWeekDates returns 7 days', () => {
      const startDate = new Date('2024-01-15');
      const result = adapter._calculateWeekDates(startDate);
      
      expect(result.length).toBe(7);
    });

    test('_calculateWeekDates starts from Sunday', () => {
      const startDate = new Date('2024-01-15'); // Monday
      const result = adapter._calculateWeekDates(startDate);
      
      expect(result[0].dayOfWeek).toBe(0); // Sunday
    });
  });

  describe('Error Handling with Retry', () => {
    test('retries on failure with exponential backoff', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ date: '2024-01-15' }]
        });
      
      const result = await adapter.getCurrentMonthDates();
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual([{ date: '2024-01-15' }]);
    }, 10000); // 10 second timeout for retry delays

    test('falls back after max retries exceeded', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      const result = await adapter.getCurrentMonthDates();
      expect(fetch).toHaveBeenCalledTimes(4); // Initial call + 3 retries
      expect(result).toBeInstanceOf(Array); // Fallback data
    }, 10000); // 10 second timeout for retry delays

    test('handles HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      const result = await adapter.getCurrentMonthDates();
      expect(result).toBeInstanceOf(Array); // Fallback data
    }, 10000); // 10 second timeout for retry delays
  });
});
