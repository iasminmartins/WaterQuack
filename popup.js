let goalAchievedOnce = false;

document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements
  const setIntervalButton = document.getElementById("setInterval");
  const setGoalButton = document.getElementById("setGoal");
  const addCupButton = document.getElementById("addCup");
  const removeCupButton = document.getElementById("removeCup");
  const cupsTodaySpan = document.getElementById("cupsToday");
  const progressDiv = document.getElementById("progress");

  // Ensure all required elements exist
  if (
    !setIntervalButton ||
    !setGoalButton ||
    !addCupButton ||
    !removeCupButton ||
    !cupsTodaySpan ||
    !progressDiv
  ) {
    alert("Error: One or more elements were not found in the DOM.");
    return;
  }

  // Initialize default interval if not set
  chrome.storage.sync.get("interval", (data) => {
    if (data.interval === undefined) {
      chrome.storage.sync.set({ interval: 30 }); // Default to 30 minutes
    }
  });

  // Validate and sanitize numeric input
  function validateNumberInput(value, min, max) {
    const number = parseInt(value, 10);
    if (isNaN(number) || number < min || number > max) {
      return null; // Invalid input
    }
    return number;
  }

  // Handle setting reminder interval
  setIntervalButton.addEventListener("click", () => {
    const interval = validateNumberInput(document.getElementById("interval").value, 1, 1440);
    if (interval !== null) {
      chrome.storage.sync.set({ interval }, () => {
        document.getElementById("status").textContent =
          `Current interval: ${interval} minute(s).`; // Update hidden status element
        chrome.runtime.sendMessage({ action: "updateReminder", interval });
        alert("Reminder interval set successfully!"); // Notify user
      });
    } else {
      alert("The reminder interval must be a valid number between 1 and 1440 minutes.");
    }
  });

  // Handle setting daily goal
  setGoalButton.addEventListener("click", () => {
    const goal = validateNumberInput(document.getElementById("goal").value, 1, 30);
    if (goal !== null) {
      chrome.storage.sync.get(["dailyCups"], (data) => {
        const dailyCups = data.dailyCups || 0;

        chrome.storage.sync.set(
          { dailyGoal: goal, goalAchievedOnce: false },
          () => {
            if (dailyCups >= goal) {
              playQuackSound(); // Play the sound when the goal is achieved
              chrome.runtime.sendMessage({
                action: "goalAchieved",
                message: `You've reached your goal of ${goal} cups. Congratu-ducking-lations! 💧`,
              });
              chrome.storage.sync.set({ goalAchievedOnce: true });
            }
            updateProgress();
            alert("Daily goal set successfully!"); // Notify user
          },
        );
      });
    } else {
      alert("The daily goal must be a valid number between 1 and 30 cups.");
    }
  });

  // Update progress display and notify when goal is reached
  function updateProgress(dailyCups = null, dailyGoal = null, isCupAdded = false, isCupRemoved = false) {
    chrome.storage.sync.get(["dailyGoal", "dailyCups"], (data) => {
      const goal = dailyGoal || data.dailyGoal || 10;
      const cups = dailyCups !== null ? dailyCups : data.dailyCups || 0;

      // Update the title with the number of cups drunk
      const cupsTodaySpan = document.getElementById("cupsToday");
      cupsTodaySpan.textContent = cups;

      // Update the hidden progress display
      progressDiv.textContent = `Current goal: ${goal} cup(s).`;

      renderProgress(cups, goal, isCupAdded, isCupRemoved);

      // Announce progress update for screen readers
      cupsTodaySpan.setAttribute("aria-live", "polite");
    });
  }

  // Function to play the "quack.mp3" sound
  function playQuackSound() {
    chrome.storage.sync.get("notificationsMuted", (data) => {
      if (!data.notificationsMuted) {
        const audio = new Audio("quack.mp3");
        audio.play().catch((error) => {
          console.error("Failed to play sound:", error);
        });
      }
    });
  }

  // Add a cup to the tally
  addCupButton.addEventListener("click", () => {
    chrome.storage.sync.get(
      ["dailyCups", "dailyGoal", "goalAchievedOnce"],
      (data) => {
        const dailyCups = (data.dailyCups || 0) + 1;
        const dailyGoal = data.dailyGoal || 10; // Default to 10 cups
        let goalAchievedOnce = data.goalAchievedOnce || false;

        if (dailyCups > 30) {
          alert(
            "⚠️ Drinking too much water may not be healthy. Limit reached!",
          );
          return;
        }

        // Ensure goalAchievedOnce is reset if the goal is not reached yet
        if (dailyCups < dailyGoal) {
          goalAchievedOnce = false;
        }

        chrome.storage.sync.set({ dailyCups, goalAchievedOnce }, () => {
          if (dailyCups >= dailyGoal && !goalAchievedOnce) {
            playQuackSound(); // Play the sound when the goal is achieved
            chrome.runtime.sendMessage({
              action: "goalAchieved",
              message: `You've reached your goal of ${dailyGoal} cups. Congratu-ducking-lations! 💧`,
            });
            chrome.storage.sync.set({ goalAchievedOnce: true }, () =>
              updateProgress(dailyCups, dailyGoal, true),
            );
          } else {
            updateProgress(dailyCups, dailyGoal, true);
          }
        });
      },
    );
  });

  // Remove a cup from the tally
  removeCupButton.addEventListener("click", () => {
    chrome.storage.sync.get(["dailyCups"], (data) => {
      const dailyCups = Math.max(0, (data.dailyCups || 0) - 1);
      chrome.storage.sync.set(
        { dailyCups, goalAchievedOnce: false },
        () => updateProgress(dailyCups, null, false, true),
      );
    });
  });

  // Render the cup progress bar
  function renderProgress(dailyCups, dailyGoal, isCupAdded = false, isCupRemoved = false) {
    const cupProgress = document.getElementById("cupProgress");
    cupProgress.innerHTML = "";

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
      cupProgress.appendChild(cup);

      // Add a row break after every `cupsPerRow` cups
      if ((i + 1) % cupsPerRow === 0) {
        const rowBreak = document.createElement("div");
        rowBreak.classList.add("row-break");
        cupProgress.appendChild(rowBreak);
      }
    }

    if (dailyCups > dailyGoal) {
      const extra = document.createElement("div");
      extra.textContent = "💧";
      extra.classList.add("extra");
      cupProgress.appendChild(extra);
    }
  }

  // Mute/unmute notifications
  document
    .getElementById("mute-notifications")
    .addEventListener("change", (event) => {
      const muted = event.target.checked;
      chrome.storage.sync.set({ notificationsMuted: muted });
    });

  // Initialize mute notifications state
  chrome.storage.sync.get("notificationsMuted", (data) => {
    const muteCheckbox = document.getElementById("mute-notifications");
    muteCheckbox.checked = !!data.notificationsMuted;
  });

  // Disable/enable notifications
  document
    .getElementById("disable-notifications")
    .addEventListener("change", (event) => {
      const disabled = event.target.checked;
      chrome.storage.sync.set({ notificationsDisabled: disabled });
    });

  // Initialize disable notifications state
  chrome.storage.sync.get("notificationsDisabled", (data) => {
    const disableCheckbox = document.getElementById("disable-notifications");
    disableCheckbox.checked = !!data.notificationsDisabled;
  });

  // Show notification if not muted or disabled
  function showNotification(title, message) {
    chrome.storage.sync.get(["notificationsMuted", "notificationsDisabled"], (data) => {
      if (!data.notificationsMuted && !data.notificationsDisabled) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon48.png",
          title,
          message,
          priority: 2,
        });
      }
    });
  }

  // Initialize placeholders for goal and interval inputs
  chrome.storage.sync.get(["dailyGoal", "interval"], (data) => {
    const goalInput = document.getElementById("goal");
    const intervalInput = document.getElementById("interval");

    if (goalInput) {
      goalInput.placeholder = `Current goal: ${data.dailyGoal || 10} cup(s)`;
    }
    if (intervalInput) {
      intervalInput.placeholder = `Current interval: ${data.interval || 30} minute(s)`;
    }
  });

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

  // Mode toggle buttons
  const lightModeButton = document.getElementById("lightMode");
  const darkModeButton = document.getElementById("darkMode");
  const colorblindModeButton = document.getElementById("colorblindMode");

  // Apply light mode
  lightModeButton.addEventListener("click", () => {
    document.documentElement.classList.remove("dark-mode", "colorblind-mode");
    chrome.storage.sync.set({ mode: "light" });
  });

  // Apply dark mode
  darkModeButton.addEventListener("click", () => {
    document.documentElement.classList.add("dark-mode");
    document.documentElement.classList.remove("colorblind-mode");
    chrome.storage.sync.set({ mode: "dark" });
  });

  // Apply colorblind mode
  colorblindModeButton.addEventListener("click", () => {
    document.documentElement.classList.add("colorblind-mode");
    document.documentElement.classList.remove("dark-mode");
    chrome.storage.sync.set({ mode: "colorblind" });
  });

  // Load saved mode from storage
  chrome.storage.sync.get("mode", (data) => {
    if (data.mode === "dark") {
      document.documentElement.classList.add("dark-mode");
    } else if (data.mode === "colorblind") {
      document.documentElement.classList.add("colorblind-mode");
    }
  });
});
