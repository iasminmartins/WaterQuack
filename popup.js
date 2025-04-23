let goalAchievedOnce = false;

document.addEventListener("DOMContentLoaded", async () => {
  // Helper functions for chrome.storage.sync
  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
  }

  function setStorage(data) {
    return new Promise((resolve) => chrome.storage.sync.set(data, resolve));
  }

  // Cache DOM elements in a centralized object
  const elements = {
    setIntervalButton: document.getElementById("setInterval"),
    setGoalButton: document.getElementById("setGoal"),
    addCupButton: document.getElementById("addCup"),
    removeCupButton: document.getElementById("removeCup"),
    cupsTodaySpan: document.getElementById("cupsToday"),
    progressDiv: document.getElementById("progress"),
    intervalInput: document.getElementById("interval"),
    goalInput: document.getElementById("goal"),
    status: document.getElementById("status"),
    cupProgress: document.getElementById("cupProgress"),
    muteNotificationsCheckbox: document.getElementById("mute-notifications"),
    disableNotificationsCheckbox: document.getElementById("disable-notifications"),
    lightModeButton: document.getElementById("lightMode"),
    darkModeButton: document.getElementById("darkMode"),
    colorblindModeButton: document.getElementById("colorblindMode"),
    footerElement: document.querySelector("footer p"),
  };

  // Ensure all required elements exist
  if (
    !elements.setIntervalButton ||
    !elements.setGoalButton ||
    !elements.addCupButton ||
    !elements.removeCupButton ||
    !elements.cupsTodaySpan ||
    !elements.progressDiv
  ) {
    alert("Error: One or more elements were not found in the DOM.");
    return;
  }

  // Initialize default interval if not set
  const { interval } = await getStorage("interval");
  if (interval === undefined) {
    await setStorage({ interval: 30 }); // Default to 30 minutes
  }

  // Validate and sanitize numeric input
  function validateNumberInput(value, min, max) {
    const number = parseInt(value, 10);
    if (isNaN(number) || number < min || number > max) {
      return null; // Invalid input
    }
    return number;
  }

  // Handle setting reminder interval
  elements.setIntervalButton.addEventListener("click", async () => {
    const interval = validateNumberInput(elements.intervalInput.value, 1, 1440);
    if (interval !== null) {
      await setStorage({ interval });
      elements.status.textContent = `Current interval: ${interval} minute(s).`; // Update hidden status element
      chrome.runtime.sendMessage({ action: "updateReminder", interval });
      alert("Reminder interval set successfully!"); // Notify user
    } else {
      alert("The reminder interval must be a valid number between 1 and 1440 minutes.");
    }
  });

  // Handle setting daily goal
  elements.setGoalButton.addEventListener("click", async () => {
    const goal = validateNumberInput(elements.goalInput.value, 1, 30);
    if (goal !== null) {
      const { dailyCups = 0 } = await getStorage("dailyCups");

      await setStorage({ dailyGoal: goal, goalAchievedOnce: false });
      if (dailyCups >= goal) {
        playQuackSound(); // Play the sound when the goal is achieved
        chrome.runtime.sendMessage({
          action: "goalAchieved",
          message: `You've reached your goal of ${goal} cups. Congratu-ducking-lations! 💧`,
        });
        await setStorage({ goalAchievedOnce: true });
      }
      updateProgress();
      alert("Daily goal set successfully!"); // Notify user
    } else {
      alert("The daily goal must be a valid number between 1 and 30 cups.");
    }
  });

  // Update progress display and notify when goal is reached
  async function updateProgress(dailyCups = null, dailyGoal = null, isCupAdded = false, isCupRemoved = false) {
    const { dailyGoal: storedGoal = 10, dailyCups: storedCups = 0 } = await getStorage(["dailyGoal", "dailyCups"]);
    const goal = dailyGoal || storedGoal;
    const cups = dailyCups !== null ? dailyCups : storedCups;

    // Update the title with the number of cups drunk
    elements.cupsTodaySpan.textContent = cups;

    // Update the hidden progress display
    elements.progressDiv.textContent = `Current goal: ${goal} cup(s).`;

    // Update aria-valuenow and aria-valuemax for screen readers
    elements.cupProgress.setAttribute("aria-valuenow", cups);
    elements.cupProgress.setAttribute("aria-valuemax", goal);

    renderProgress(cups, goal, isCupAdded, isCupRemoved);

    // Announce progress update for screen readers
    elements.cupsTodaySpan.setAttribute("aria-live", "polite");
  }

  // Function to play the "quack.mp3" sound
  async function playQuackSound() {
    const { notificationsMuted } = await getStorage("notificationsMuted");
    if (!notificationsMuted) {
      const audio = new Audio("quack.mp3");
      audio.play().catch((error) => {
        console.error("Failed to play sound:", error);
      });
    }
  }

  // Add a cup to the tally
  elements.addCupButton.addEventListener("click", async () => {
    const { dailyCups = 0, dailyGoal = 10, goalAchievedOnce = false } = await getStorage(["dailyCups", "dailyGoal", "goalAchievedOnce"]);
    const newDailyCups = dailyCups + 1;

    if (newDailyCups > 30) {
      alert("⚠️ Drinking too much water may not be healthy. Limit reached!");
      return;
    }

    let newGoalAchievedOnce = goalAchievedOnce;
    if (newDailyCups < dailyGoal) {
      newGoalAchievedOnce = false;
    }

    await setStorage({ dailyCups: newDailyCups, goalAchievedOnce: newGoalAchievedOnce });
    if (newDailyCups >= dailyGoal && !goalAchievedOnce) {
      playQuackSound(); // Play the sound when the goal is achieved
      chrome.runtime.sendMessage({
        action: "goalAchieved",
        message: `You've reached your goal of ${dailyGoal} cups. Congratu-ducking-lations! 💧`,
      });
      await setStorage({ goalAchievedOnce: true });
    }
    updateProgress(newDailyCups, dailyGoal, true);
  });

  // Remove a cup from the tally
  elements.removeCupButton.addEventListener("click", async () => {
    const { dailyCups = 0 } = await getStorage("dailyCups");
    const newDailyCups = Math.max(0, dailyCups - 1);
    await setStorage({ dailyCups: newDailyCups, goalAchievedOnce: false });
    updateProgress(newDailyCups, null, false, true);
  });

  // Render the cup progress bar
  function renderProgress(dailyCups, dailyGoal, isCupAdded = false, isCupRemoved = false) {
    elements.cupProgress.innerHTML = "";

    const cupsPerRow = Math.ceil(Math.sqrt(dailyGoal)); // Calculate cups per row dynamically
    for (let i = 0; i < dailyGoal; i++) {
      const cup = document.createElement("div");
      cup.classList.add("cup");
      if (i < dailyCups) {
        cup.classList.add("full"); // Use full cup image
        if (isCupAdded && i === dailyCups - 1) {
          cup.classList.add("added"); // Apply fade animation to the newly added cup
          setTimeout(() => cup.classList.remove("added"), 500); // Remove animation class after it completes
        }
      } else {
        cup.classList.add("empty"); // Use empty cup image
        if (isCupRemoved && i === dailyCups) {
          cup.classList.add("removed"); // Apply fade animation to the removed cup
          setTimeout(() => cup.classList.remove("removed"), 500); // Remove animation class after it completes
        }
      }
      elements.cupProgress.appendChild(cup);

      // Add a row break after every `cupsPerRow` cups
      if ((i + 1) % cupsPerRow === 0) {
        const rowBreak = document.createElement("div");
        rowBreak.classList.add("row-break");
        elements.cupProgress.appendChild(rowBreak);
      }
    }

    if (dailyCups > dailyGoal) {
      const extra = document.createElement("div");
      extra.textContent = "💧";
      extra.classList.add("extra");
      elements.cupProgress.appendChild(extra);
    }
  }

  // Mute/unmute notifications
  elements.muteNotificationsCheckbox.addEventListener("change", async (event) => {
    await setStorage({ notificationsMuted: event.target.checked });
  });

  // Initialize mute notifications state
  const { notificationsMuted } = await getStorage("notificationsMuted");
  elements.muteNotificationsCheckbox.checked = !!notificationsMuted;

  // Disable/enable notifications
  elements.disableNotificationsCheckbox.addEventListener("change", async (event) => {
    await setStorage({ notificationsDisabled: event.target.checked });
  });

  // Initialize disable notifications state
  const { notificationsDisabled } = await getStorage("notificationsDisabled");
  elements.disableNotificationsCheckbox.checked = !!notificationsDisabled;

  // Show notification if not muted or disabled
  async function showNotification(title, message) {
    const { notificationsMuted, notificationsDisabled } = await getStorage(["notificationsMuted", "notificationsDisabled"]);
    if (!notificationsMuted && !notificationsDisabled) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title,
        message,
        priority: 2,
      });
    }
  }

  // Initialize placeholders for goal and interval inputs
  const { dailyGoal = 10, interval: storedInterval = 30 } = await getStorage(["dailyGoal", "interval"]);
  if (elements.goalInput) {
    elements.goalInput.placeholder = `Current goal: ${dailyGoal} cup(s)`;
  }
  if (elements.intervalInput) {
    elements.intervalInput.placeholder = `Current interval: ${storedInterval} minute(s)`;
  }

  // Initial progress update
  updateProgress();

  // Close modals or popups with the Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.classList.contains("modal")) {
        activeElement.style.display = "none"; // Hide the modal
        activeElement.setAttribute("aria-hidden", "true");
      }
    }
  });

  // Ensure logical tab order and focus management
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex="0"]'
  );
  focusableElements.forEach((element) => {
    element.addEventListener("focus", () => {
      element.classList.add("focused");
    });
    element.addEventListener("blur", () => {
      element.classList.remove("focused");
    });
  });

  // Function to update the theme-color meta tag
  function updateThemeColor(color) {
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = "theme-color";
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = color;
  }

  // Mode toggle buttons
  elements.lightModeButton.addEventListener("click", () => {
    document.documentElement.classList.remove("dark-mode", "colorblind-mode");
    chrome.storage.sync.set({ mode: "light" });
    updateThemeColor("#0066cc"); // Light mode theme color
  });

  elements.darkModeButton.addEventListener("click", () => {
    document.documentElement.classList.add("dark-mode");
    document.documentElement.classList.remove("colorblind-mode");
    chrome.storage.sync.set({ mode: "dark" });
    updateThemeColor("#1e1e2f"); // Dark mode theme color
  });

  elements.colorblindModeButton.addEventListener("click", () => {
    document.documentElement.classList.add("colorblind-mode");
    document.documentElement.classList.remove("dark-mode");
    chrome.storage.sync.set({ mode: "colorblind" });
    updateThemeColor("#0072B2"); // Colorblind mode theme color
  });

  // Load saved mode from storage and update theme color
  const { mode } = await getStorage("mode");
  if (mode === "dark") {
    document.documentElement.classList.add("dark-mode");
    updateThemeColor("#1e1e2f");
  } else if (mode === "colorblind") {
    document.documentElement.classList.add("colorblind-mode");
    updateThemeColor("#0072B2");
  } else {
    updateThemeColor("#0066cc"); // Default to light mode theme color
  }

  // Footer message rotation
  const footerMessages = [
    "Stay hydrated and keep the jokes afloat!",
    "You're 70% water… act like it!",
    "Warning: Dehydration may cause duckface!",
    "Ducks drink water, so should you!",
    "Warning: Lack of hydration may cause dry humor!",
  ];
  let currentMessageIndex = 0;

  function rotateFooterMessage() {
    currentMessageIndex = (currentMessageIndex + 1) % footerMessages.length;
    elements.footerElement.innerHTML = `<span aria-hidden="true">💧</span> ${footerMessages[currentMessageIndex]} <span aria-hidden="true">💧</span>`;
  }

  setInterval(rotateFooterMessage, 30 * 60 * 1000); // Rotate every 30 minutes
});
