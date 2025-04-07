// Array of motivational messages for hydration reminders
const motivationalMessages = [
    "Every drop counts! Stay hydrated.",
    "You're on the right track! Keep drinking water.",
    "Hydration is key to energy. Don't stop now!",
    "Great job! Your body thanks you for the water.",
    "Water is life. Keep it up!",
    "You're doing amazing, sweetie!",
  ];

  // Create a notification with title and message
  function createNotification(title, message) {
    chrome.storage.sync.get(["notificationsMuted", "notificationsDisabled"], (data) => {
      const isMuted = !!data.notificationsMuted;
      const isDisabled = !!data.notificationsDisabled;
      if (!isDisabled) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon48.png",
          title,
          message,
          silent: isMuted,
          priority: 2,
        });
      }
    });
  }

  // Start reminder alarm at given interval (minutes)
  function startReminder(interval) {
    if (typeof interval !== "number" || interval <= 0) return;
    chrome.alarms.clear("drinkReminder", () => {
      chrome.alarms.create("drinkReminder", { periodInMinutes: interval });
    });
  }

  // Handle alarms for reminders and daily resets
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "drinkReminder") {
      const randomMessage =
        motivationalMessages[
          Math.floor(Math.random() * motivationalMessages.length)
        ];
      createNotification("Time to drink water!", randomMessage);
    } else if (alarm.name === "resetDailyCups") {
      chrome.storage.sync.set({ dailyCups: 0, goalAchievedOnce: false });
    }
  });

  // Schedule daily reset of cups at midnight
  function scheduleDailyReset() {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = nextMidnight.getTime() - Date.now();

    chrome.alarms.create("resetDailyCups", {
      when: Date.now() + timeUntilMidnight,
      periodInMinutes: 1440,
    });
  }

  // Validate incoming messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateReminder") {
      const interval = parseFloat(request.interval);
      if (!isNaN(interval) && interval > 0 && interval <= 1440) {
        startReminder(interval);
        sendResponse({ status: "success" });
      } else {
        sendResponse({ status: "error", message: "Invalid interval." });
      }
    } else if (request.action === "goalAchieved") {
      if (typeof request.message === "string" && request.message.length <= 100) {
        createNotification("Goal Achieved!", request.message);
        sendResponse({ status: "success" });
      } else {
        sendResponse({ status: "error", message: "Invalid message." });
      }
    } else {
      sendResponse({ status: "error", message: "Unknown action." });
    }
  });

  // Set defaults on extension installation
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
      interval: 30,
      dailyCups: 0,
      dailyGoal: 10,
      notificationsMuted: false,
    });
    scheduleDailyReset();
    createNotification(
      "Welcome to WaterQuack!",
      "Set your daily goal and stay hydrated! 🥤",
    );
  });

  // Initialize reminders on startup
  chrome.storage.sync.get("interval", (data) => {
    const interval = data.interval > 0 ? data.interval : 30;
    startReminder(interval);
  });
