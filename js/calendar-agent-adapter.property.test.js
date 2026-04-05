/**
 * Property-Based Tests for CalendarAgentAdapter
 * 
 * Tests universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

const fc = require('fast-check');
const CalendarAgentAdapter = require('./calendar-agent-adapter');

describe('CalendarAgentAdapter - Property-Based Tests', () => {
  let adapter;

  beforeEach(() => {
    adapter = new CalendarAgentAdapter('/api/calendar-agent');
    adapter.clearCache();
  });

  describe('Property 6: Cache Validity', () => {
    /**
     * **Validates: Requirements 5.5**
     * 
     * Property: Cached calendar data is never served if it's older than 24 hours
     * 
     * Formal Definition:
     * ∀ cached data D with timestamp T:
     *   if (currentTime - T) > 24 hours:
     *     CalendarAgentAdapter.getCachedDates() returns null
     *   else:
     *     CalendarAgentAdapter.getCachedDates() returns D
     */

    test('Property 6.1: Cache returns null for data older than 24 hours', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            date: fc.date(),
            day: fc.integer({ min: 1, max: 31 }),
            dayOfWeek: fc.integer({ min: 0, max: 6 })
          }), { minLength: 1, maxLength: 31 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 25, max: 1000 }), // Hours beyond 24
          (testData, cacheKey, hoursOld) => {
            // Set cache data with old timestamp
            adapter._setCacheData(cacheKey, testData);
            
            // Manually set timestamp to be older than 24 hours
            const cached = adapter.cache.get(cacheKey);
            const hoursInMs = hoursOld * 60 * 60 * 1000;
            cached.timestamp = Date.now() - hoursInMs;
            adapter.cache.set(cacheKey, cached);
            
            // Verify cache returns null for expired data
            const result = adapter.getCachedDates(cacheKey);
            
            // Property: Data older than 24 hours must return null
            expect(result).toBeNull();
            
            // Property: Expired cache entry should be deleted
            expect(adapter.cache.has(cacheKey)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6.2: Cache returns data for entries within 24 hours', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            date: fc.date(),
            day: fc.integer({ min: 1, max: 31 }),
            dayOfWeek: fc.integer({ min: 0, max: 6 }),
            formatted: fc.string()
          }), { minLength: 1, maxLength: 31 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 23 }), // Hours within 24
          fc.integer({ min: 0, max: 59 }), // Minutes
          fc.integer({ min: 0, max: 59 }), // Seconds
          (testData, cacheKey, hours, minutes, seconds) => {
            // Set cache data with recent timestamp
            adapter._setCacheData(cacheKey, testData);
            
            // Manually set timestamp to be within 24 hours
            const cached = adapter.cache.get(cacheKey);
            const ageInMs = (hours * 60 * 60 * 1000) + 
                           (minutes * 60 * 1000) + 
                           (seconds * 1000);
            cached.timestamp = Date.now() - ageInMs;
            adapter.cache.set(cacheKey, cached);
            
            // Verify cache returns the data
            const result = adapter.getCachedDates(cacheKey);
            
            // Property: Data within 24 hours must be returned
            expect(result).not.toBeNull();
            expect(result).toEqual(testData);
            
            // Property: Cache entry should still exist
            expect(adapter.cache.has(cacheKey)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6.3: Cache boundary - data beyond 24 hours returns null', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            date: fc.date(),
            day: fc.integer({ min: 1, max: 31 })
          }), { minLength: 1, maxLength: 31 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000 }), // Milliseconds beyond 24 hours (at least 1ms)
          (testData, cacheKey, extraMs) => {
            // Set cache data
            adapter._setCacheData(cacheKey, testData);
            
            // Set timestamp to exactly 24 hours + extraMs ago
            const cached = adapter.cache.get(cacheKey);
            const exactlyOneDayMs = 24 * 60 * 60 * 1000;
            cached.timestamp = Date.now() - exactlyOneDayMs - extraMs;
            adapter.cache.set(cacheKey, cached);
            
            // Verify cache returns null beyond boundary
            const result = adapter.getCachedDates(cacheKey);
            
            // Property: Data beyond 24 hours must return null
            expect(result).toBeNull();
            expect(adapter.cache.has(cacheKey)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6.4: Cache miss for non-existent keys', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (cacheKey) => {
            // Ensure key doesn't exist in cache
            adapter.cache.delete(cacheKey);
            
            // Verify cache returns null for missing key
            const result = adapter.getCachedDates(cacheKey);
            
            // Property: Non-existent keys must return null
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6.5: Cache hit/miss consistency across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(
            fc.array(fc.record({
              date: fc.date(),
              day: fc.integer({ min: 1, max: 31 })
            }), { minLength: 1, maxLength: 10 }),
            fc.integer({ min: 0, max: 48 }) // Age in hours
          ), { minLength: 1, maxLength: 10 }),
          (cacheEntries) => {
            // Generate unique keys for each entry
            const entriesWithKeys = cacheEntries.map((entry, index) => [
              `test-key-${index}`,
              ...entry
            ]);
            
            const CACHE_DURATION = 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            // Set up multiple cache entries with different ages
            entriesWithKeys.forEach(([key, data, ageHours]) => {
              adapter._setCacheData(key, data);
              
              const cached = adapter.cache.get(key);
              // Convert hours to milliseconds
              const ageMs = ageHours * 60 * 60 * 1000;
              // Use the same 'now' timestamp for consistency
              cached.timestamp = now - ageMs;
              adapter.cache.set(key, cached);
            });
            
            // Verify each entry follows the cache validity rule
            // Per implementation: age > CACHE_DURATION returns null
            entriesWithKeys.forEach(([key, data, ageHours]) => {
              const result = adapter.getCachedDates(key);
              const ageMs = ageHours * 60 * 60 * 1000;
              
              // Calculate actual age at time of check
              const actualAge = Date.now() - (now - ageMs);
              
              // Property: Data is valid if age <= 24 hours (not strictly greater)
              if (actualAge <= CACHE_DURATION) {
                // Property: Fresh data (age <= 24 hours) should be returned
                expect(result).toEqual(data);
              } else {
                // Property: Stale data (age > 24 hours) should return null
                expect(result).toBeNull();
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 6.6: Cache validity is independent of data content', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.array(fc.anything(), { minLength: 0, maxLength: 100 }),
            fc.record({
              dates: fc.array(fc.date()),
              metadata: fc.object()
            }),
            fc.constant(null),
            fc.constant([])
          ),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.boolean(),
          (testData, cacheKey, isExpired) => {
            // Set cache data
            adapter._setCacheData(cacheKey, testData);
            
            // Set timestamp based on isExpired flag
            const cached = adapter.cache.get(cacheKey);
            if (isExpired) {
              // Set to 25 hours ago (expired)
              cached.timestamp = Date.now() - (25 * 60 * 60 * 1000);
            } else {
              // Set to 1 hour ago (fresh)
              cached.timestamp = Date.now() - (1 * 60 * 60 * 1000);
            }
            adapter.cache.set(cacheKey, cached);
            
            // Verify cache behavior is consistent regardless of data content
            const result = adapter.getCachedDates(cacheKey);
            
            if (isExpired) {
              // Property: Expired data returns null regardless of content
              expect(result).toBeNull();
            } else {
              // Property: Fresh data returns original data regardless of content
              expect(result).toEqual(testData);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
