let state = {}; // Global state object

const config = {
  maxCups: 30,
  minCups: 1,
  maxInterval: 1440,
  minInterval: 1,
}; // Centralized configuration object

document.addEventListener("DOMContentLoaded", async () => {
  // Helper functions for chrome.storage.sync
  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
  }

  function setStorage(data) {
    return new Promise((resolve) => chrome.storage.sync.set(data, resolve));
  }

  async function updateStorage(updates) {
    Object.assign(state, updates); // Update in-memory state
    await setStorage(updates); // Persist to chrome.storage.sync
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

  // Hydrate global state from chrome.storage.sync
  state = await getStorage(["interval", "dailyCups", "dailyGoal", "notificationsMuted", "notificationsDisabled", "goalAchievedOnce", "mode"]);
  state.interval = state.interval ?? 30; // Default interval
  state.dailyCups = state.dailyCups ?? 0; // Default daily cups
  state.dailyGoal = state.dailyGoal ?? 10; // Default daily goal
  state.notificationsMuted = state.notificationsMuted ?? false;
  state.notificationsDisabled = state.notificationsDisabled ?? false;
  state.goalAchievedOnce = state.goalAchievedOnce ?? false;

  // Initialize placeholders for goal and interval inputs
  elements.goalInput.placeholder = `Current goal: ${state.dailyGoal} cup(s)`;
  elements.intervalInput.placeholder = `Current interval: ${state.interval} minute(s)`;

  // Initialize mute and disable notifications checkboxes
  elements.muteNotificationsCheckbox.checked = state.notificationsMuted;
  elements.disableNotificationsCheckbox.checked = state.notificationsDisabled;

  // Validate and sanitize numeric input
  function validateNumberInput(value, min, max) {
    const number = parseInt(value, 10);
    if (isNaN(number) || number < min || number > max) {
      return null; // Invalid input
    }
    return number;
  }

  // Helper function to disable a button temporarily
  async function withButtonDisabled(button, asyncTask) {
    button.disabled = true;
    try {
      await asyncTask();
    } finally {
      button.disabled = false;
    }
  }

  // Helper function to show visual alerts with a checkmark
  function showVisualAlert(button) {
    const container = button.closest(".button-container");
    if (!container) return;

    const checkmark = document.createElement("div");
    checkmark.classList.add("checkmark");

    // Remove any existing checkmark
    const existingCheckmark = container.querySelector(".checkmark");
    if (existingCheckmark) {
      existingCheckmark.remove();
    }

    container.appendChild(checkmark);

    // Automatically remove the checkmark after 1.5 seconds
    setTimeout(() => {
      checkmark.remove();
    }, 1500);
  }

  // Helper function to validate input, update state, and show alerts
  async function validateInputAndUpdate(inputElement, min, max, stateKey, updateCallback, alertMessage) {
    const value = parseInt(inputElement.value, 10);
    if (isNaN(value) || value < min || value > max) {
      alert(alertMessage);
      return false;
    }
    const updates = { [stateKey]: value };
    await updateStorage(updates);
    if (updateCallback) {
      await updateCallback(value);
    }
    return true;
  }

  // Consolidated function to handle cup count increment and goal checking
  async function incrementCupCount(isAdding) {
    const newDailyCups = isAdding
      ? state.dailyCups + 1
      : Math.max(config.minCups - 1, state.dailyCups - 1);

    if (newDailyCups > config.maxCups) {
      alert(`\n⚠️ Easy there, duckling! ⚠️\n\nDrinking too much water may not be healthy!\n\nLimit of ${config.maxCups} cups reached.\n`);
      return;
    }

    let newGoalAchievedOnce = state.goalAchievedOnce;
    if (newDailyCups < state.dailyGoal) {
      newGoalAchievedOnce = false;
    }

    await updateStorage({ dailyCups: newDailyCups, goalAchievedOnce: newGoalAchievedOnce });

    if (isAdding) {
      await checkGoalAchieved(newDailyCups, state.dailyGoal, state.goalAchievedOnce);
    }

    updateProgress(newDailyCups, state.dailyGoal, isAdding, !isAdding);
  }

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Function to check if animations should run
  function shouldAnimate() {
    return !prefersReducedMotion;
  }

  // Function to check if the goal is achieved
  async function checkGoalAchieved(dailyCups, dailyGoal, goalAchievedOnce) {
    if (dailyCups >= dailyGoal && !goalAchievedOnce) {
      const { notificationsMuted, notificationsDisabled } = await getStorage([
        "notificationsMuted",
        "notificationsDisabled",
      ]);

      // Play quack sound only if notifications are not muted or disabled
      if (!notificationsMuted && !notificationsDisabled) {
        playQuackSound();
      }

      // Show confetti only if notifications are muted but not disabled and animations are allowed
      if (!notificationsDisabled && shouldAnimate()) {
        const confettiContainer = document.createElement("div");
        confettiContainer.classList.add("confetti-animation");
        const emojis = ["✨", "💦", "💧", "🎉"];
        for (let i = 0; i < 50; i++) {
          const span = document.createElement("span");
          span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          span.style.left = `${Math.random() * 100}%`; // Random horizontal position
          span.style.animationDelay = `${Math.random() * 2}s`; // Random delay
          confettiContainer.appendChild(span);
        }
        document.body.appendChild(confettiContainer);

        // Remove the animation after it completes
        setTimeout(() => {
          confettiContainer.remove();
        }, 3000);
      }

      // Send notification message
      chrome.runtime.sendMessage({
        action: "goalAchieved",
        message: `You've reached your goal of ${dailyGoal} cups. Congratu-ducking-lations! 💧`,
      });

      await updateStorage({ goalAchievedOnce: true });
      return true;
    }
    return false;
  }

  // Handle setting reminder interval
  elements.setIntervalButton.addEventListener("click", () => {
    withButtonDisabled(elements.setIntervalButton, async () => {
      await validateInputAndUpdate(
        elements.intervalInput,
        config.minInterval,
        config.maxInterval,
        "interval",
        (interval) => {
          elements.status.textContent = `Current interval: ${interval} minute(s).`;
          chrome.runtime.sendMessage({ action: "updateReminder", interval });
          showVisualAlert(elements.setIntervalButton);
        },
        `\n⚠️ Whoopsie, made a oopsie. ⚠️\n\nThe reminder interval must be a valid number between ${config.minInterval} and ${config.maxInterval} minutes.\n`
      );
    });
  });

  // Handle setting daily goal
  elements.setGoalButton.addEventListener("click", () => {
    withButtonDisabled(elements.setGoalButton, async () => {
      await validateInputAndUpdate(
        elements.goalInput,
        config.minCups,
        config.maxCups,
        "dailyGoal",
        async (goal) => {
          await checkGoalAchieved(state.dailyCups, goal, false);
          updateProgress();
          showVisualAlert(elements.setGoalButton);
        },
        `\n⚠️ Oops, the duck did it again! ⚠️\n\nThe daily goal must be a valid number between ${config.minCups} and ${config.maxCups} cups.\n`
      );
    });
  });

  // Update progress display and notify when goal is reached
  async function updateProgress(dailyCups = null, dailyGoal = null, isCupAdded = false, isCupRemoved = false) {
    const goal = dailyGoal || state.dailyGoal;
    const cups = dailyCups !== null ? dailyCups : state.dailyCups;

    // Update the title with the number of cups drunk
    elements.cupsTodaySpan.textContent = cups;

    // Update the hidden progress display
    elements.progressDiv.textContent = `Current goal: ${goal} cup(s).`;

    // Update aria-valuenow and aria-valuemax for screen readers
    elements.cupProgress.setAttribute("aria-valuenow", cups);
    elements.cupProgress.setAttribute("aria-valuemax", goal);

    // Update the progress bar and percentage
    const progressPercentage = Math.min(Math.round((cups / goal) * 100), 100);
    const progressFill = document.getElementById("progressFill");
    const progressBar = document.getElementById("progressBar");
    const progressPercentageElement = document.getElementById("progressPercentage");

    if (progressFill) {
      progressFill.style.width = `${progressPercentage}%`;
    }
    if (progressPercentageElement) {
      progressPercentageElement.textContent = `${progressPercentage}%`;
    }
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", progressPercentage); // Update aria-valuenow dynamically
    }

    // Render the cups
    renderProgress(cups, goal, isCupAdded, isCupRemoved);

    // Announce progress update for screen readers
    elements.cupsTodaySpan.setAttribute("aria-live", "polite");
  }

  // Function to play the "quack.mp3" sound
  async function playQuackSound() {
    if (!state.notificationsMuted) {
      const audio = new Audio("quack.mp3");
      audio.play().catch((error) => {
        console.error("Failed to play sound:", error);
      });
    }
  }

  // Add a cup to the tally
  elements.addCupButton.addEventListener("click", () => {
    withButtonDisabled(elements.addCupButton, async () => {
      await incrementCupCount(true);
    });
  });

  // Remove a cup from the tally
  elements.removeCupButton.addEventListener("click", () => {
    withButtonDisabled(elements.removeCupButton, async () => {
      await incrementCupCount(false);
    });
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
        if (isCupAdded && i === dailyCups - 1 && shouldAnimate()) {
          cup.classList.add("added"); // Apply fade animation to the newly added cup
          setTimeout(() => cup.classList.remove("added"), 500); // Remove animation class after it completes
        }
      } else {
        cup.classList.add("empty"); // Use empty cup image
        if (isCupRemoved && i === dailyCups && shouldAnimate()) {
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
      extra.classList.add("extra-indicator");
      elements.cupProgress.appendChild(extra);
    }
  }

  // Mute/unmute notifications
  elements.muteNotificationsCheckbox.addEventListener("change", async (event) => {
    await updateStorage({ notificationsMuted: event.target.checked });
  });

  // Disable/enable notifications
  elements.disableNotificationsCheckbox.addEventListener("change", async (event) => {
    await updateStorage({ notificationsDisabled: event.target.checked });
  });

  // Show notification if not muted or disabled
  async function showNotification(title, message) {
    if (!state.notificationsMuted && !state.notificationsDisabled) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title,
        message,
        priority: 2,
      });
    }
  }

  // Mode toggle buttons
  elements.lightModeButton.addEventListener("click", () => {
    document.documentElement.classList.remove("dark-mode", "colorblind-mode");
    chrome.storage.sync.set({ mode: "light" });
  });

  elements.darkModeButton.addEventListener("click", () => {
    document.documentElement.classList.add("dark-mode");
    document.documentElement.classList.remove("colorblind-mode");
    chrome.storage.sync.set({ mode: "dark" });
  });

  elements.colorblindModeButton.addEventListener("click", () => {
    document.documentElement.classList.add("colorblind-mode");
    document.documentElement.classList.remove("dark-mode");
    chrome.storage.sync.set({ mode: "colorblind" });
  });

  // Load saved mode from storage
  if (state.mode === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else if (state.mode === "colorblind") {
    document.documentElement.classList.add("colorblind-mode");
  } else {
    document.documentElement.classList.remove("dark-mode", "colorblind-mode"); // Default to light mode
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

  // Call the function immediately to set the first message
  rotateFooterMessage();

  // Set interval to rotate messages every 5 seconds
  setInterval(rotateFooterMessage, 5000);

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
});
