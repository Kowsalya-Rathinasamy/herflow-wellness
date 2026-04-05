# Wellness Reminders Notification Guide

## Overview

The HerFlow app includes a comprehensive wellness reminder system that sends browser notifications at scheduled times to help you maintain healthy habits and self-care routines.

## Features

### 1. **Scheduled Reminders**
- Set reminders for any wellness activity (meditation, water breaks, stretching, etc.)
- Choose specific times (24-hour format)
- Select frequency:
  - **Daily** - Every day
  - **Weekdays** - Monday through Friday
  - **Weekends** - Saturday and Sunday
  - **Weekly** - Every Monday

### 2. **Browser Notifications**
- Notifications appear even when the app is in the background
- Includes activity name and time
- Auto-closes after 10 seconds
- Works on desktop and mobile browsers

### 3. **Reminder Management**
- View all active reminders in the Wellness Hub
- Toggle reminders on/off without deleting them
- Delete reminders you no longer need
- Edit reminder details

### 4. **Data Persistence**
- All reminders are saved to localStorage
- Reminders persist across browser sessions
- Completion history is tracked for pattern analysis

## How to Use

### Setting Up Reminders

1. **Navigate to Wellness Hub**
   - Click on the "Wellness Hub" tab in the navigation

2. **Add a Reminder**
   - Click the "+ Add Wellness Reminder" button
   - Fill in the details:
     - **Activity**: What you want to be reminded about (e.g., "Drink water", "Take a break", "Meditate")
     - **Time**: When you want the reminder (e.g., 09:00, 14:30)
     - **Frequency**: How often (Daily, Weekdays, Weekends, Weekly)
   - Click "Schedule Reminder ✓"

3. **Grant Notification Permission**
   - When you schedule your first reminder, your browser will ask for notification permission
   - Click "Allow" to enable notifications
   - If you accidentally denied permission, you can enable it in your browser settings

### Managing Reminders

**Toggle On/Off:**
- Click the toggle switch next to any reminder to enable/disable it
- Green = Active, Gray = Disabled
- Disabled reminders won't send notifications but remain saved

**Delete Reminder:**
- Click the "×" button next to any reminder
- Confirm deletion when prompted
- Deleted reminders cannot be recovered

### Notification Behavior

**When Notifications Appear:**
- Reminders are checked every 30 seconds
- Notifications appear at the scheduled time
- Each reminder is sent once per day (for daily/weekdays/weekends)
- Weekly reminders appear every Monday

**Notification Content:**
- Title: "🌸 Wellness Reminder"
- Body: Your activity name
- Icon: 🌸 flower emoji

**If You Miss a Notification:**
- The system will retry up to 3 times
- Retries happen during the next check cycle (within 30 seconds)
- If all retries fail, the reminder will be attempted the next scheduled day

## Browser Compatibility

### Supported Browsers:
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Opera

### Requirements:
- Browser must support the Notifications API
- Notifications must be enabled in browser settings
- App must be loaded at least once for reminders to start

## Troubleshooting

### Notifications Not Appearing?

1. **Check Browser Permission**
   - Chrome: Settings → Privacy and Security → Site Settings → Notifications
   - Firefox: Settings → Privacy & Security → Permissions → Notifications
   - Safari: Preferences → Websites → Notifications
   - Make sure HerFlow is allowed to send notifications

2. **Check Reminder Status**
   - Ensure the reminder toggle is green (active)
   - Verify the time is set correctly (24-hour format)
   - Check that the frequency matches your expectation

3. **Browser Tab**
   - The app must be loaded in at least one browser tab
   - Notifications work even if the tab is in the background
   - If you close all tabs, reminders won't work until you reopen the app

4. **System Settings**
   - Check your operating system's notification settings
   - Windows: Settings → System → Notifications
   - Mac: System Preferences → Notifications
   - Ensure browser notifications are not blocked system-wide

### Testing Notifications

To test if notifications are working:

1. Open the browser console (F12)
2. Type: `testNotification()`
3. Press Enter
4. You should see a test notification appear

Alternatively, set a reminder for 1-2 minutes from now and wait to see if it appears.

## Privacy & Data

- All reminder data is stored locally in your browser (localStorage)
- No data is sent to external servers
- Clearing browser data will delete all reminders
- Each browser/device has its own separate reminder data

## Advanced Features

### Completion Tracking
- The system tracks when you complete activities
- After 7+ completions, it analyzes patterns
- Learns your best times and days for activities
- Provides recommendations for optimal scheduling

### Quiet Hours (Coming Soon)
- Set times when you don't want to receive reminders
- Useful for sleep hours or focus time
- Reminders will be queued and sent after quiet hours end

### Pattern Analysis (Coming Soon)
- View completion rates for each activity
- See your best days and times for wellness activities
- Get personalized recommendations based on your habits

## Tips for Success

1. **Start Small**: Begin with 1-2 reminders and add more as you build habits
2. **Be Specific**: Use clear activity names like "Drink water" instead of just "Water"
3. **Choose Realistic Times**: Schedule reminders when you're actually available
4. **Use Frequency Wisely**: Daily reminders work for habits, weekly for check-ins
5. **Review Regularly**: Check your reminders weekly and adjust as needed

## Example Reminders

Here are some popular wellness reminders to get you started:

- **Morning Routine**
  - "Morning meditation" at 07:00 (Daily)
  - "Drink water" at 08:00 (Daily)

- **Work Breaks**
  - "Stretch break" at 10:30 (Weekdays)
  - "Eye rest - look away from screen" at 14:00 (Weekdays)
  - "Afternoon walk" at 15:30 (Weekdays)

- **Evening Wind-Down**
  - "Phone off - wind down" at 21:00 (Daily)
  - "Gratitude journaling" at 21:30 (Daily)

- **Self-Care**
  - "Call a friend" at 19:00 (Weekly)
  - "Plan self-care activity" at 10:00 (Weekends)

## Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify notification permissions are granted
3. Try refreshing the page
4. Clear browser cache and reload

For technical details, see the `js/wellness-reminders.js` file which contains the full implementation.

---

**Remember**: Wellness reminders are tools to support your self-care journey. Adjust them to fit your lifestyle and needs. The goal is to reduce mental load, not add to it! 🌸
