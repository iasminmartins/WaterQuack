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
          `Reminder set for every ${interval} minute(s).`;
        chrome.runtime.sendMessage({ action: "updateReminder", interval });
      });
    } else {
      document.getElementById("status").textContent =
        "Please enter a valid number between 1 and 1440.";
    }
  });

  // Handle setting daily goal
  setGoalButton.addEventListener("click", () => {
    const goal = validateNumberInput(document.getElementById("goal").value, 1, 30);
    if (goal !== null) {
      chrome.storage.sync.set(
        { dailyGoal: goal, goalAchievedOnce: false },
        () => {
          updateProgress();
        },
      );
    } else {
      alert("The daily goal must be a valid number between 1 and 30 cups.");
    }
  });

  // Update progress display and notify when goal is reached
  function updateProgress() {
    chrome.storage.sync.get(["dailyGoal", "dailyCups"], (data) => {
      const goal = data.dailyGoal || 8;
      const cups = data.dailyCups || 0;

      // Atualizar o progresso visual
      progressDiv.textContent = `Current goal: ${goal} cup(s).`;
      cupsTodaySpan.textContent = cups;

      renderProgress(cups, goal);
    });
  }

  // Add a cup to the tally
  addCupButton.addEventListener("click", () => {
    chrome.storage.sync.get(
      ["dailyCups", "dailyGoal", "goalAchievedOnce"],
      (data) => {
        const dailyCups = (data.dailyCups || 0) + 1;
        const dailyGoal = data.dailyGoal || 8;
        const goalAchievedOnce = data.goalAchievedOnce || false;

        if (dailyCups > 30) {
          alert(
            "⚠️ Drinking too much water may not be healthy. Limit reached!",
          );
          return;
        }

        chrome.storage.sync.set({ dailyCups }, () => {
          if (dailyCups >= dailyGoal && !goalAchievedOnce) {
            chrome.runtime.sendMessage({
              action: "goalAchieved",
              message: `🎉 Congratulations! You reached your goal of ${dailyGoal} cups!`,
            });
            chrome.storage.sync.set({ goalAchievedOnce: true });
          }
          updateProgress();
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
        updateProgress,
      );
    });
  });

  // Render the cup progress bar
  function renderProgress(dailyCups, dailyGoal) {
    const cupProgress = document.getElementById("cupProgress");
    cupProgress.innerHTML = "";

    const cupsPerRow = Math.ceil(Math.sqrt(dailyGoal)); // Calculate cups per row dynamically
    for (let i = 0; i < dailyGoal; i++) {
      const cup = document.createElement("div");
      cup.classList.add("cup");
      if (i < dailyCups) {
        cup.classList.add("full");
      } else {
        cup.classList.add("empty");
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

  // Initial progress update
  updateProgress();
});
