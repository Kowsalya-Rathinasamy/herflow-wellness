# Calendar Agent Adapter

## Overview

The `CalendarAgentAdapter` provides a unified interface to the Calendar_Agent API with built-in caching, error handling, and fallback mechanisms.

## Features

- **Dynamic Date Fetching**: Retrieves current month and week dates from Calendar_Agent
- **Intelligent Caching**: Caches date data for 24 hours to improve performance
- **Error Handling**: Exponential backoff retry mechanism with up to 3 retries
- **Fallback Support**: Client-side date calculation when API is unavailable
- **Date Formatting**: Multiple format options for displaying dates
- **Cross-Environment**: Works in both browser and Node.js environments

## Usage

### Basic Setup

```javascript
// Create adapter instance
const adapter = new CalendarAgentAdapter('/api/calendar-agent');

// Fetch current month dates
const monthDates = await adapter.getCurrentMonthDates();

// Fetch week dates
const weekDates = await adapter.getWeekDates(new Date());

// Format a date
const formatted = adapter.formatDate(new Date(), 'short');
```

### API Methods

#### `getCurrentMonthDates()`
Fetches dates for the current month. Returns cached data if available and valid.

**Returns:** `Promise<Array>` - Array of date objects

**Example:**
```javascript
const dates = await adapter.getCurrentMonthDates();
// [
//   { date: Date, day: 1, dayOfWeek: 0, dayName: 'Sun', isToday: false, formatted: 'Jan 1' },
//   ...
// ]
```

#### `getWeekDates(startDate)`
Fetches dates for a week starting from the given date.

**Parameters:**
- `startDate` (Date) - Starting date for the week

**Returns:** `Promise<Array>` - Array of 7 date objects

**Example:**
```javascript
const weekDates = await adapter.getWeekDates(new Date('2024-01-15'));
```

#### `formatDate(date, format)`
Formats a date according to the specified format.

**Parameters:**
- `date` (Date) - Date to format
- `format` (string) - Format type: 'short', 'long', 'iso', 'dayName', 'monthYear'

**Returns:** `string` - Formatted date string

**Example:**
```javascript
const date = new Date('2024-01-15');
adapter.formatDate(date, 'short');     // "Jan 15"
adapter.formatDate(date, 'long');      // "Monday, January 15, 2024"
adapter.formatDate(date, 'iso');       // "2024-01-15"
adapter.formatDate(date, 'dayName');   // "Mon"
```

#### `getCachedDates(key)`
Retrieves cached date data if available and not expired.

**Parameters:**
- `key` (string) - Cache key

**Returns:** `Array|null` - Cached data or null if expired/missing

#### `clearCache()`
Clears all cached data.

#### `getCacheStats()`
Returns statistics about the cache.

**Returns:** `Object` - Cache statistics including size, keys, oldest and newest entries

## Error Handling

The adapter implements robust error handling:

1. **Exponential Backoff**: Retries failed requests with increasing delays (1s, 2s, 4s)
2. **Maximum Retries**: Attempts up to 3 retries before falling back
3. **Fallback Calculation**: Uses client-side date calculation when API is unavailable
4. **Graceful Degradation**: Always returns valid data, even during failures

## Caching

- Cache duration: 24 hours
- Cache keys: `month-{year}-{month}` and `week-{ISO-date}`
- Automatic expiration: Expired cache entries are automatically removed
- Performance: Cached data is served immediately without API calls

## Requirements Satisfied

- **5.1**: Calendar_Agent fetches current month dates on page load ✓
- **5.3**: Calendar_Agent provides date formatting utilities ✓
- **5.4**: Error handling for failed date fetching operations ✓
- **5.5**: Calendar_Agent caches date data for performance ✓

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Integration Example

```javascript
// Initialize adapter
const calendarAdapter = new CalendarAgentAdapter('/api/calendar-agent');

// Fetch and display current month
async function initializeCalendar() {
  try {
    const dates = await calendarAdapter.getCurrentMonthDates();
    renderCalendar(dates);
  } catch (error) {
    console.error('Calendar initialization failed:', error);
  }
}

// Update calendar view
async function updateWeekView(startDate) {
  const weekDates = await calendarAdapter.getWeekDates(startDate);
  renderWeekView(weekDates);
}

// Initialize on page load
initializeCalendar();
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `fetch` API support
- Uses `Map` for caching
- Compatible with Node.js for testing

## License

MIT
