/**
 * Unit tests for CalendarAutomation
 */

const CalendarAutomation = require('./calendar-automation.js');
const CalendarAgentAdapter = require('./calendar-agent-adapter.js');

describe('CalendarAutomation', () => {
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

  describe('constructor', () => {
    it('should throw error if calendarAgent is not provided', () => {
      expect(() => new CalendarAutomation()).toThrow('CalendarAgentAdapter is required');
    });

    it('should initialize with provided calendar agent', () => {
      calendarAutomation = new CalendarAutomation(mockAgent);
      expect(calendarAutomation.agent).toBe(mockAgent);
      expect(calendarAutomation.currentMonth).toBeNull();
      expect(calendarAutomation.currentYear).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should fetch current month dates and render week view', async () => {
      const mockWeekDates = [
        { date: new Date(2024, 0, 1), day: 1, dayOfWeek: 1, dayName: 'Mon', isToday: false },
        { date: new Date(2024, 0, 2), day: 2, dayOfWeek: 2, dayName: 'Tue', isToday: false },
        { date: new Date(2024, 0, 3), day: 3, dayOfWeek: 3, dayName: 'Wed', isToday: false },
        { date: new Date(2024, 0, 4), day: 4, dayOfWeek: 4, dayName: 'Thu', isToday: false },
        { date: new Date(2024, 0, 5), day: 5, dayOfWeek: 5, dayName: 'Fri', isToday: false },
        { date: new Date(2024, 0, 6), day: 6, dayOfWeek: 6, dayName: 'Sat', isToday: false },
        { date: new Date(2024, 0, 7), day: 7, dayOfWeek: 0, dayName: 'Sun', isToday: false }
      ];

      mockAgent.getCurrentMonthDates.mockResolvedValue([]);
      mockAgent.getWeekDates.mockResolvedValue(mockWeekDates);
      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return date.toISOString().split('T')[0];
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      await calendarAutomation.initialize();

      expect(mockAgent.getCurrentMonthDates).toHaveBeenCalled();
      expect(mockAgent.getWeekDates).toHaveBeenCalled();
      expect(calendarAutomation.currentMonth).not.toBeNull();
      expect(calendarAutomation.currentYear).not.toBeNull();
    });

    it('should use fallback on error', async () => {
      mockAgent.getCurrentMonthDates.mockRejectedValue(new Error('API Error'));
      mockAgent.getWeekDates.mockRejectedValue(new Error('API Error'));
      mockAgent._calculateWeekDates.mockReturnValue([
        { date: new Date(2024, 0, 1), day: 1, dayOfWeek: 1, dayName: 'Mon', isToday: false }
      ]);
      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return date.toISOString().split('T')[0];
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      await calendarAutomation.initialize();

      expect(mockAgent._calculateWeekDates).toHaveBeenCalled();
    });
  });

  describe('updateCalendar', () => {
    it('should update calendar for specified month and year', async () => {
      const mockWeekDates = [
        { date: new Date(2024, 5, 1), day: 1, dayOfWeek: 6, dayName: 'Sat', isToday: false }
      ];

      mockAgent.getWeekDates.mockResolvedValue(mockWeekDates);
      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return date.toISOString().split('T')[0];
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      await calendarAutomation.updateCalendar(5, 2024);

      expect(calendarAutomation.currentMonth).toBe(5);
      expect(calendarAutomation.currentYear).toBe(2024);
      expect(mockAgent.getWeekDates).toHaveBeenCalled();
    });
  });

  describe('renderWeekView', () => {
    it('should render week dates in DOM', () => {
      const mockWeekDates = [
        { date: new Date(2024, 0, 1), day: 1, dayOfWeek: 1, dayName: 'Mon', isToday: false },
        { date: new Date(2024, 0, 2), day: 2, dayOfWeek: 2, dayName: 'Tue', isToday: false }
      ];

      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return date.toISOString().split('T')[0];
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      calendarAutomation.renderWeekView(mockWeekDates);

      const weekHeader = document.querySelector('.week-header');
      const dayElements = weekHeader.querySelectorAll('.week-day');

      expect(dayElements.length).toBe(2);
      expect(dayElements[0].querySelector('.day-name').textContent).toBe('Mon');
      expect(dayElements[0].querySelector('.day-num').textContent).toBe('1');
      expect(dayElements[1].querySelector('.day-name').textContent).toBe('Tue');
      expect(dayElements[1].querySelector('.day-num').textContent).toBe('2');
    });

    it('should add data attributes for date tracking', () => {
      const mockWeekDates = [
        { date: new Date(2024, 0, 1), day: 1, dayOfWeek: 1, dayName: 'Mon', isToday: false }
      ];

      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return '2024-01-01';
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      calendarAutomation.renderWeekView(mockWeekDates);

      const dayElement = document.querySelector('.week-day');
      expect(dayElement.getAttribute('data-date')).toBe('2024-01-01');
      expect(dayElement.getAttribute('data-day')).toBe('1');
      expect(dayElement.getAttribute('data-day-of-week')).toBe('1');
    });

    it('should handle empty week dates gracefully', () => {
      calendarAutomation = new CalendarAutomation(mockAgent);
      calendarAutomation.renderWeekView([]);

      const weekHeader = document.querySelector('.week-header');
      expect(weekHeader.children.length).toBe(0);
    });
  });

  describe('highlightToday', () => {
    it('should add today-col class to current date', () => {
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];

      document.body.innerHTML = `
        <div class="week-header">
          <div class="week-day" data-date="${todayISO}">
            <div class="day-name">Today</div>
            <div class="day-num">${today.getDate()}</div>
          </div>
          <div class="week-day" data-date="2024-01-01">
            <div class="day-name">Mon</div>
            <div class="day-num">1</div>
          </div>
        </div>
      `;

      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return todayISO;
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      calendarAutomation.highlightToday();

      const weekDays = document.querySelectorAll('.week-day');
      expect(weekDays[0].classList.contains('today-col')).toBe(true);
      expect(weekDays[1].classList.contains('today-col')).toBe(false);
    });

    it('should remove today-col class from non-current dates', () => {
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];

      document.body.innerHTML = `
        <div class="week-header">
          <div class="week-day today-col" data-date="2024-01-01">
            <div class="day-name">Mon</div>
            <div class="day-num">1</div>
          </div>
          <div class="week-day" data-date="${todayISO}">
            <div class="day-name">Today</div>
            <div class="day-num">${today.getDate()}</div>
          </div>
        </div>
      `;

      mockAgent.formatDate.mockImplementation((date, format) => {
        if (format === 'iso') return todayISO;
        return date.toLocaleDateString();
      });

      calendarAutomation = new CalendarAutomation(mockAgent);
      calendarAutomation.highlightToday();

      const weekDays = document.querySelectorAll('.week-day');
      expect(weekDays[0].classList.contains('today-col')).toBe(false);
      expect(weekDays[1].classList.contains('today-col')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clear midnight check interval', () => {
      calendarAutomation = new CalendarAutomation(mockAgent);
      calendarAutomation.todayCheckInterval = setInterval(() => {}, 1000);
      
      const intervalId = calendarAutomation.todayCheckInterval;
      calendarAutomation.destroy();

      expect(calendarAutomation.todayCheckInterval).toBeNull();
    });
  });
});
