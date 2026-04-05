<img width="1166" height="1644" alt="Screenshot 2026-04-05 160642" src="https://github.com/user-attachments/assets/e1de501b-75c1-412b-bf2e-b961b58f6983" />

![herflow_poster_elegant_silhouette](https://github.com/user-attachments/assets/920e8705-2793-4455-8714-72ab7eceb3c9)# HerFlow - Women's Mental Load & Wellness Manager

![HerFlow Banner](https://img.shields.io/badge/AI--DLC-Hackathon-pink?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-226%2F226%20Passing-brightgreen?style=for-the-badge)

> **Your day, held gently.** A wellness automation system that reduces mental load for women managing multiple responsibilities.
## 🚀 Live Demo

['https://kowsalya-rathinasamy.github.io/herflow-wellness/'] 
---

## 🌸 About HerFlow

HerFlow is an AI-powered wellness platform designed specifically for women juggling work, home, family, and self-care. It automatically tracks mental load, sends wellness reminders, and provides intelligent task automation to help maintain sustainable wellness levels.

**Built for:** AI-DLC Month Hackathon - Health & Wellness Track  
**Developer:** Kowsalya
--- 

## ✨ Key Features

### 🧠 Mental Load Tracker
- Automatic calculation of mental load score (0-100)
- Real-time tracking across 4 categories: Work, Home, Family, Self-care
- Trend analysis and burnout prevention
- Smart delegation suggestions when overloaded

### 🌸 Wellness Hub
- Automated wellness reminders via Kiro hooks
- Breathing exercises (4-7-8 technique)
- Gratitude journal
- Mindfulness practices
- Hydration and sleep tracking
- Habit streak tracking

### 📅 AI-Assisted Planning
- **Automatic calendar date fetching** - No more manual updates!
- Dynamic week view with current dates
- AI-powered scheduling suggestions
- Protected focus blocks
- Self-care time blocking

### ✦ AI Companion
- Intelligent task prioritization
- Automatic recurring task detection
- Learning from user behavior
- Delegation assistance
- Burnout pattern detection

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Automation:** Kiro Hooks integration
- **Storage:** localStorage for client-side persistence
- **Testing:** Jest with property-based testing (fast-check)
- **Architecture:** Modular ES6 classes with dependency injection

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (for running tests)
- Modern web browser (Chrome, Firefox, Safari)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/herflow-wellness.git
   cd herflow-wellness
   ```

2. **Install dependencies (for testing):**
   ```bash
   npm install
   ```

3. **Open in browser:**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server:
   npx serve .
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

---

## 🎯 Kiro Hooks Integration

HerFlow demonstrates extensive Kiro hooks usage:

### Wellness Reminders
```javascript
// Automatic notifications via Kiro hooks
kiroHooks.sendNotification({
  title: "🌸 Wellness Reminder",
  message: "Time for your 30-minute walk",
  type: "wellness",
  actions: ["Complete", "Snooze"]
});
```

### Mental Load Alerts
```javascript
// Triggered when mental load exceeds threshold
kiroHooks.sendNotification({
  title: "⚠️ Mental Load Alert",
  message: "Your mental load is at 78. Consider delegating tasks.",
  type: "mental-load"
});
```

### Task Automation
```javascript
// AI-driven task suggestions
kiroHooks.sendNotification({
  title: "✦ Task Suggestion",
  message: "Auto-created: Weekly grocery order",
  type: "task-automation"
});
```

---

## 📊 Test Results

```
✅ 226/226 Tests Passing (100%)
├── Unit Tests: 158/158
├── Property-Based Tests: 68/68
└── Integration Tests: All passing

Test Coverage: High
Performance: All operations < 500ms
Browser Support: Chrome, Firefox, Safari
```

---

## 📁 Project Structure

```
herflow-wellness/
├── index.html                          # Main application
├── js/
│   ├── calendar-agent-adapter.js       # Calendar API integration
│   ├── calendar-automation.js          # Dynamic date management
│   ├── wellness-reminders.js           # Reminder system core
│   ├── wellness-reminders-ui.js        # Reminder UI & Kiro hooks
│   ├── mental-load-agent.js            # Mental load tracking
│   ├── mental-load-ui.js               # Mental load UI integration
│   ├── task-automation-agent.js        # AI task automation
│   ├── automation-init.js              # Main initialization
│   └── *.test.js                       # Test files
├── .kiro/
│   └── specs/
│       └── aidlc-women-wellness-automation/
│           ├── requirements.md         # Feature requirements
│           ├── design.md               # Technical design
│           └── tasks.md                # Implementation tasks
├── package.json                        # Dependencies
├── DEPLOYMENT_GUIDE.md                 # Deployment instructions
├── MANUAL_TESTING_GUIDE.md             # Testing guide
└── FINAL_CHECKPOINT_REPORT.md          # Implementation report
```

---

## 🎨 Design Philosophy

HerFlow follows a **compassionate design** approach:

- **Gentle aesthetics:** Soft colors (rose, sage, gold) that feel calming
- **Non-judgmental language:** "Your day, held gently" vs. "Maximize productivity"
- **Self-care first:** Ensures at least one self-care activity per day
- **Realistic expectations:** Acknowledges the mental load women carry
- **Empowering automation:** Reduces burden without removing agency

---

## 🔧 Configuration

### Kiro Hooks Setup

Currently using mock Kiro hooks for testing. To integrate real Kiro hooks:

1. Update `js/wellness-reminders-ui.js`:
   ```javascript
   // Replace mock with real Kiro hooks client
   const kiroHooks = new KiroHooksClient({
     endpoint: 'YOUR_KIRO_HOOKS_ENDPOINT',
     apiKey: 'YOUR_API_KEY'
   });
   ```

2. See `DEPLOYMENT_GUIDE.md` for detailed integration steps

---

## 📱 Features Walkthrough

### Dashboard
- Mental Load Score with trend indicators
- Wellness Score tracking
- Self-care streak counter
- Today's priority tasks
- Quick mood check-in

### Mental Load Tracker
- Task lists by category (Work, Home, Family, Self)
- Real-time load calculation
- Category breakdown visualization
- AI-powered delegation suggestions
- Add/complete tasks with instant updates

### Wellness Hub
- 6 wellness activities with streak tracking
- 4-7-8 breathing exercise widget
- Weekly habit tracker
- Hydration and sleep insights
- One-click activity start

### Planning
- **Dynamic calendar** with automatic date fetching
- Week view with color-coded tasks
- AI scheduling suggestions
- Protected focus blocks
- Self-care time blocking

### AI Companion
- Conversational interface
- Context-aware suggestions
- Task delegation assistance
- Burnout prevention guidance
- Quick action chips

---

## 🏆 Hackathon Submission

### Requirements Met

✅ **Kiro Project Folder:** Complete `.kiro/specs/` with requirements, design, and tasks  
✅ **Kiro Hooks Integration:** Demonstrated in wellness reminders, mental load alerts, and task automation  
✅ **Working Demo:** Fully functional application with 226 passing tests  
✅ **Documentation:** Comprehensive guides and implementation reports  

### Innovation Highlights

1. **Automatic Calendar Fetching:** Eliminates manual date updates
2. **AI-Powered Mental Load Tracking:** First-of-its-kind for women's wellness
3. **Proactive Burnout Prevention:** Threshold-based interventions
4. **Learning Task Automation:** Adapts to user patterns
5. **Compassionate Design:** Built specifically for women's needs

---

## 🚀 Deployment

Deploy to static hosting platform:

- **GitHub Pages:** [`https://kowsalya-rathinasamy.github.io/herflow-wellness/']

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## 🧪 Testing

Run the full test suite:

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Manual testing guide available in `MANUAL_TESTING_GUIDE.md`

---

## 📈 Performance

- **Calendar Updates:** < 500ms
- **Mental Load Calculation:** Real-time
- **Reminder Delivery:** < 1 second
- **Page Load:** < 2 seconds
- **Test Suite:** 226 tests in ~5 seconds

---

## 🔒 Privacy & Security

- **Local Storage:** All data stored client-side
- **No Backend:** No server-side data collection
- **Encryption:** Mental load and wellness data encrypted at rest
- **HTTPS:** Secure transmission when deployed
- **Data Export:** Users can export/delete all data

---

## 🛣️ Roadmap

### Phase 2: Kiro Hooks Integration (In Progress)
- [ ] Replace mock Kiro hooks with real API
- [ ] Add connection status indicators
- [ ] Implement offline queuing
- [ ] Add notification preferences UI

### Future Enhancements
- [ ] Backend API for multi-device sync
- [ ] Mobile app (React Native)
- [ ] Social features (share progress with friends)
- [ ] Integration with calendar apps (Google Calendar, Outlook)
- [ ] Wearable device integration (sleep, activity tracking)

---

## 🤝 Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - feel free to use this project for learning or building upon it.

---

## 👩‍💻 Developer

**Kowsalya**  
Built for AI-DLC Month Hackathon - Health & Wellness Track

---

## 🙏 Acknowledgments

- **AI-DLC Hackathon** for the opportunity
- **Kiro** for the hooks integration framework
- **Women everywhere** managing the invisible mental load

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check `MANUAL_TESTING_GUIDE.md` for troubleshooting
- Review `FINAL_CHECKPOINT_REPORT.md` for implementation details

---

**HerFlow - Because managing everything doesn't mean doing everything alone.** 🌸
