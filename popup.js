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

  // Handle setting reminder interval
  setIntervalButton.addEventListener("click", () => {
    const interval = parseInt(document.getElementById("interval").value, 10);
    if (interval > 0) {
      chrome.storage.sync.set({ interval }, () => {
        document.getElementById("status").textContent =
          `Reminder set for every ${interval} minutes.`;
        chrome.runtime.sendMessage({ action: "updateReminder", interval });
      });
    } else {
      document.getElementById("status").textContent =
        "Please enter a valid number.";
    }
  });

  // Handle setting daily goal
  setGoalButton.addEventListener("click", () => {
    const goal = parseInt(document.getElementById("goal").value, 10);
    if (goal > 0 && goal <= 30) {
      chrome.storage.sync.set(
        { dailyGoal: goal, goalAchievedOnce: false }, // Reseta o controle
        () => {
          updateProgress();
        },
      );
    } else {
      alert("The daily goal must be between 1 and 30 cups.");
    }
  });

  // Update progress display and notify when goal is reached
  function updateProgress() {
    chrome.storage.sync.get(["dailyGoal", "dailyCups"], (data) => {
      const goal = data.dailyGoal || 8;
      const cups = data.dailyCups || 0;

      // Atualizar o progresso visual
      progressDiv.textContent = `Current goal: ${goal} cups.`;
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

    for (let i = 0; i < dailyGoal; i++) {
      const cup = document.createElement("div");
      cup.classList.add("cup");
      if (i < dailyCups) {
        cup.classList.add("full");
      } else {
        cup.classList.add("empty");
      }
      cupProgress.appendChild(cup);
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

  // Show notification if not muted
  function showNotification(title, message) {
    chrome.storage.sync.get("notificationsMuted", (data) => {
      if (!data.notificationsMuted) {
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
