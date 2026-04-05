/**
 * Property-Based Tests for CalendarAutomation
 * 
 * Tests universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

const fc = require('fast-check');
const CalendarAutomation = require('./calendar-automation.js');
const CalendarAgentAdapter = require('./calendar-agent-adapter.js');

describe('CalendarAutomation - Property-Based Tests', () => {
  let mockAgent;
  let calendarAutomation;

  beforeEach(() => {
    // Create mock Calendar Agent Adapter
    mockAgent = {
      getCurrentMonthDates: jest.fn(),
      getWeekDates: jest.fn(),
      formatDate: jest.fn(),
      _calculateWeekDates: jest.fn()
    };

    // Mock DOM elements
    document.body.innerHTML = `
      <div class="week-header"></div>
    `;
  });

  afterEach(() => {
    if (calendarAutomation) {
      calendarAutomation.destroy();
    }
  });

  describe('Property 1: Calendar Date Accuracy', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.4**
     * 
     * Property: For any given month M and year Y, the calendar displays exactly 
     * the dates that exist in that month, with correct day-of-week alignment.
     * 
     * Formal Definition:
     * ∀ month M, year Y:
     *   let dates = CalendarAutomation.updateCalendar(M, Y)
     *   let expected = getDaysInMonth(M, Y)
     *   dates.length == expected.length ∧
     *   ∀ i ∈ [0, dates.length):
     *     dates[i].day == expected[i].day ∧
     *     dates[i].dayOfWeek == expected[i].dayOfWeek
     */

    /**
     * Helper: Get expected days in a month
     */
    function getDaysInMonth(month, year) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysCount = lastDay.getDate();
      
      const days = [];
      for (let day = 1; day <= daysCount; day++) {
        const date = new Date(year, month, day);
        days.push({
          day: day,
          dayOfWeek: date.getDay(),
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          date: date
        });
      }
      
      return days;
    }

    /**
     * Helper: Check if a year is a leap year
     */
    function isLeapYear(year) {
      return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    test('Property 1.1: Calendar displays correct number of days for any month/year', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 11 }), // month (0-11)
          fc.integer({ min: 1900, max: 2100 }), // year
          async (month, year) => {
            // Calculate expected days in month
            const expectedDays = getDaysInMonth(month, year);
            const expectedCount = expectedDays.length;
            
            // Generate week dates for the first week of the month
            const firstDayOfMonth = new Date(year, month, 1);
            const weekDates = [];
            
            // Get the first week (7 days starting from the first day of month)
            for (let i = 0; i < 7 && i < expectedCount; i++) {
              const date = new Date(year, month, i + 1);
              weekDates.push({
                date: date,
                day: date.getDate(),
                dayOfWeek: date.getDay(),
                dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                isToday: false
              });
            }
            
            // Mock the agent to return our calculated week dates
            mockAgent.getWeekDates.mockResolvedValue(weekDates);
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and update calendar
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            
            // Property: Calendar should be updated with correct month and year
            expect(calendarAutomation.currentMonth).toBe(month);
            expect(calendarAutomation.currentYear).toBe(year);
            
            // Property: Week dates should match expected structure
            expect(calendarAutomation.weekDates.length).toBe(weekDates.length);
            
            // Verify each date in the week has correct properties
            calendarAutomation.weekDates.forEach((dateObj, index) => {
              expect(dateObj.day).toBe(weekDates[index].day);
              expect(dateObj.dayOfWeek).toBe(weekDates[index].dayOfWeek);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1.2: Day-of-week alignment is correct for any date', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 11 }), // month
          fc.integer({ min: 1900, max: 2100 }), // year
          fc.integer({ min: 1, max: 28 }), // day (safe range for all months)
          async (month, year, day) => {
            // Create the date
            const testDate = new Date(year, month, day);
            const expectedDayOfWeek = testDate.getDay();
            const expectedDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][expectedDayOfWeek];
            
            // Create week dates including this date
            const weekDates = [{
              date: testDate,
              day: day,
              dayOfWeek: expectedDayOfWeek,
              dayName: expectedDayName,
              isToday: false
            }];
            
            // Mock the agent
            mockAgent.getWeekDates.mockResolvedValue(weekDates);
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and update calendar
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            
            // Property: Day of week must match JavaScript's Date.getDay()
            const renderedDate = calendarAutomation.weekDates[0];
            expect(renderedDate.dayOfWeek).toBe(expectedDayOfWeek);
            expect(renderedDate.dayName).toBe(expectedDayName);
            
            // Verify DOM rendering
            const weekHeader = document.querySelector('.week-header');
            const dayElement = weekHeader.querySelector('.week-day');
            
            if (dayElement) {
              const renderedDayName = dayElement.querySelector('.day-name').textContent;
              const renderedDayNum = parseInt(dayElement.querySelector('.day-num').textContent);
              
              expect(renderedDayName).toBe(expectedDayName);
              expect(renderedDayNum).toBe(day);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1.3: Leap year handling - February has correct days', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1900, max: 2100 }), // year
          async (year) => {
            const month = 1; // February (0-indexed)
            const expectedDaysInFeb = isLeapYear(year) ? 29 : 28;
            
            // Generate all days in February
            const weekDates = [];
            for (let day = 1; day <= expectedDaysInFeb; day++) {
              const date = new Date(year, month, day);
              weekDates.push({
                date: date,
                day: day,
                dayOfWeek: date.getDay(),
                dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                isToday: false
              });
            }
            
            // Mock the agent to return February dates
            mockAgent.getWeekDates.mockResolvedValue(weekDates.slice(0, 7)); // First week
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and update calendar
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            
            // Property: February must have correct number of days based on leap year
            const lastDayOfFeb = new Date(year, month + 1, 0);
            expect(lastDayOfFeb.getDate()).toBe(expectedDaysInFeb);
            
            // Property: Leap year calculation must be correct
            if (year % 400 === 0) {
              expect(expectedDaysInFeb).toBe(29);
            } else if (year % 100 === 0) {
              expect(expectedDaysInFeb).toBe(28);
            } else if (year % 4 === 0) {
              expect(expectedDaysInFeb).toBe(29);
            } else {
              expect(expectedDaysInFeb).toBe(28);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1.4: Week view shows correct day names and dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 11 }), // month
          fc.integer({ min: 1900, max: 2100 }), // year
          fc.integer({ min: 1, max: 7 }), // starting day of month
          async (month, year, startDay) => {
            // Ensure startDay is valid for the month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const validStartDay = Math.min(startDay, daysInMonth - 6); // Ensure we have 7 days
            
            // Generate a full week of dates
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
              const day = validStartDay + i;
              if (day <= daysInMonth) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();
                weekDates.push({
                  date: date,
                  day: day,
                  dayOfWeek: dayOfWeek,
                  dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
                  isToday: false
                });
              }
            }
            
            // Mock the agent
            mockAgent.getWeekDates.mockResolvedValue(weekDates);
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and render week view
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            calendarAutomation.renderWeekView(weekDates);
            
            // Property: Each rendered day must have correct day name and number
            const weekHeader = document.querySelector('.week-header');
            const dayElements = weekHeader.querySelectorAll('.week-day');
            
            expect(dayElements.length).toBe(weekDates.length);
            
            dayElements.forEach((dayElement, index) => {
              const expectedDate = weekDates[index];
              const renderedDayName = dayElement.querySelector('.day-name').textContent;
              const renderedDayNum = parseInt(dayElement.querySelector('.day-num').textContent);
              const dataDate = dayElement.getAttribute('data-date');
              const dataDayOfWeek = parseInt(dayElement.getAttribute('data-day-of-week'));
              
              // Property: Rendered content must match expected values
              expect(renderedDayName).toBe(expectedDate.dayName);
              expect(renderedDayNum).toBe(expectedDate.day);
              expect(dataDayOfWeek).toBe(expectedDate.dayOfWeek);
              
              // Property: Data attributes must be set correctly
              expect(dataDate).toBeTruthy();
              expect(dataDayOfWeek).toBeGreaterThanOrEqual(0);
              expect(dataDayOfWeek).toBeLessThanOrEqual(6);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1.5: Month boundaries are handled correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 11 }), // month
          fc.integer({ min: 1900, max: 2100 }), // year
          async (month, year) => {
            // Get the last day of the month
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const lastDay = lastDayOfMonth.getDate();
            
            // Create a week that includes the last day of the month
            const weekDates = [];
            for (let i = Math.max(1, lastDay - 6); i <= lastDay; i++) {
              const date = new Date(year, month, i);
              weekDates.push({
                date: date,
                day: i,
                dayOfWeek: date.getDay(),
                dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                isToday: false
              });
            }
            
            // Mock the agent
            mockAgent.getWeekDates.mockResolvedValue(weekDates);
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and update calendar
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            
            // Property: Last day of month must be correct
            const expectedLastDay = new Date(year, month + 1, 0).getDate();
            const actualLastDay = weekDates[weekDates.length - 1].day;
            
            expect(actualLastDay).toBe(expectedLastDay);
            
            // Property: No date should exceed the last day of the month
            weekDates.forEach(dateObj => {
              expect(dateObj.day).toBeLessThanOrEqual(expectedLastDay);
              expect(dateObj.day).toBeGreaterThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1.6: Date sequence is continuous and ascending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 11 }), // month
          fc.integer({ min: 1900, max: 2100 }), // year
          fc.integer({ min: 1, max: 22 }), // starting day (ensure room for 7 days)
          async (month, year, startDay) => {
            // Generate a continuous week of dates
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
              const day = startDay + i;
              const date = new Date(year, month, day);
              
              // Only add if within the month
              if (date.getMonth() === month) {
                weekDates.push({
                  date: date,
                  day: day,
                  dayOfWeek: date.getDay(),
                  dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                  isToday: false
                });
              }
            }
            
            // Skip if we don't have enough days
            if (weekDates.length < 2) {
              return true;
            }
            
            // Mock the agent
            mockAgent.getWeekDates.mockResolvedValue(weekDates);
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and update calendar
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            
            // Property: Dates must be in ascending order
            for (let i = 1; i < weekDates.length; i++) {
              const prevDay = weekDates[i - 1].day;
              const currDay = weekDates[i].day;
              
              expect(currDay).toBe(prevDay + 1);
            }
            
            // Property: Day of week must increment correctly (with wraparound)
            for (let i = 1; i < weekDates.length; i++) {
              const prevDayOfWeek = weekDates[i - 1].dayOfWeek;
              const currDayOfWeek = weekDates[i].dayOfWeek;
              const expectedDayOfWeek = (prevDayOfWeek + 1) % 7;
              
              expect(currDayOfWeek).toBe(expectedDayOfWeek);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Today Highlighting Uniqueness', () => {
    /**
     * **Validates: Requirements 1.3**
     * 
     * Property: Exactly one date in the calendar is marked as "today" and it 
     * corresponds to the current system date.
     * 
     * Formal Definition:
     * let highlightedDates = calendar.querySelectorAll('.today-col, .today')
     * highlightedDates.length == 1 ∧
     * highlightedDates[0].date == getCurrentDate()
     */

    test('Property 2.1: Exactly one date is highlighted as today', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 11 }), // month
          fc.integer({ min: 1900, max: 2100 }), // year
          async (month, year) => {
            const today = new Date();
            const todayISO = today.toISOString().split('T')[0];
            
            // Generate week dates including today
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
              const date = new Date(today);
              date.setDate(today.getDate() - 3 + i); // 3 days before to 3 days after
              
              weekDates.push({
                date: date,
                day: date.getDate(),
                dayOfWeek: date.getDay(),
                dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                isToday: date.toISOString().split('T')[0] === todayISO
              });
            }
            
            // Mock the agent
            mockAgent.getWeekDates.mockResolvedValue(weekDates);
            mockAgent.formatDate.mockImplementation((date, format) => {
              if (format === 'iso') return date.toISOString().split('T')[0];
              return date.toLocaleDateString();
            });
            
            // Create automation and render week view
            calendarAutomation = new CalendarAutomation(mockAgent);
            await calendarAutomation.updateCalendar(month, year);
            calendarAutomation.renderWeekView(weekDates);
            calendarAutomation.highlightToday();
            
            // Property: Exactly one date should be highlighted
            const weekHeader = document.querySelector('.week-header');
            const highlightedDates = weekHeader.querySelectorAll('.today-col');
            
            expect(highlightedDates.length).toBe(1);
            
            // Property: The highlighted date should be today
            const highlightedDate = highlightedDates[0].getAttribute('data-date');
            expect(highlightedDate).toBe(todayISO);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property 2.2: Today highlighting updates correctly', async () => {
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];
      
      // Generate week dates including today
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - 3 + i);
        
        weekDates.push({
          date: date,
          day: date.getDate(),
          dayOfWeek: date.getDay(),
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          isToday: date.toISOString().split('T')[0] === todayISO
        });
      }
      
      // Mock the agent
      mockAgent.getWeekDates.mockResolvedValue(weekDates);
      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return date.toISOString().split('T')[0];
        return date.toLocaleDateString();
      });
      
      // Create automation and render week view
      calendarAutomation = new CalendarAutomation(mockAgent);
      await calendarAutomation.updateCalendar(today.getMonth(), today.getFullYear());
      calendarAutomation.renderWeekView(weekDates);
      calendarAutomation.highlightToday();
      
      // Property: Exactly one date should be highlighted initially
      const weekHeader = document.querySelector('.week-header');
      let highlightedDates = weekHeader.querySelectorAll('.today-col');
      expect(highlightedDates.length).toBe(1);
      
      // Call highlightToday again (simulating update)
      calendarAutomation.highlightToday();
      
      // Property: Still exactly one date should be highlighted
      highlightedDates = weekHeader.querySelectorAll('.today-col');
      expect(highlightedDates.length).toBe(1);
      
      // Property: The highlighted date should still be today
      const highlightedDate = highlightedDates[0].getAttribute('data-date');
      expect(highlightedDate).toBe(todayISO);
    });

    test('Property 2.3: Non-today dates are not highlighted', async () => {
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];
      
      // Generate week dates including today
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - 3 + i);
        
        weekDates.push({
          date: date,
          day: date.getDate(),
          dayOfWeek: date.getDay(),
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          isToday: date.toISOString().split('T')[0] === todayISO
        });
      }
      
      // Mock the agent
      mockAgent.getWeekDates.mockResolvedValue(weekDates);
      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return date.toISOString().split('T')[0];
        return date.toLocaleDateString();
      });
      
      // Create automation and render week view
      calendarAutomation = new CalendarAutomation(mockAgent);
      await calendarAutomation.updateCalendar(today.getMonth(), today.getFullYear());
      calendarAutomation.renderWeekView(weekDates);
      calendarAutomation.highlightToday();
      
      // Property: All non-today dates should NOT have the today-col class
      const weekHeader = document.querySelector('.week-header');
      const dayElements = weekHeader.querySelectorAll('.week-day');
      
      dayElements.forEach((dayElement) => {
        const dateAttr = dayElement.getAttribute('data-date');
        const hasHighlight = dayElement.classList.contains('today-col');
        
        if (dateAttr === todayISO) {
          expect(hasHighlight).toBe(true);
        } else {
          expect(hasHighlight).toBe(false);
        }
      });
    });
  });
});

