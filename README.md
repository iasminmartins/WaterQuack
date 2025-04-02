# WaterQuack
#### Video Demo: https://youtu.be/wpIM-89kmOI
#### Description:
WaterQuack is a Chrome extension designed to help users stay hydrated throughout the day. By setting personalized hydration goals and reminder intervals, this extension promotes healthier habits in a simple, engaging, and intuitive way.

With features like daily progress tracking, motivational notifications, and the ability to mute reminders, WaterQuack is your perfect companion for maintaining optimal hydration. Whether you’re working, studying, or simply going about your day, this extension ensures you never forget to take a sip!

---

### Features:
1. **Custom Reminder Intervals**: Set reminders to hydrate every X minutes, ensuring you stay consistent with your water intake.
2. **Daily Hydration Goal**: Define your daily goal for water consumption (measured in cups, with a maximum of 30 cups).
3. **Progress Tracking**: Keep track of the number of cups you've consumed throughout the day with an easy-to-understand visual progress bar.
4. **Motivational Notifications**: Receive encouraging messages to keep you on track.
5. **Mute Notifications**: Option to mute notifications when you need uninterrupted focus.
6. **Daily Reset**: Automatically resets progress at midnight to prepare for a new day.

---

### Files Overview:

#### `manifest.json`
This file contains the metadata for the Chrome extension, including:
- Extension name and version.
- Required permissions: notifications, alarms, and storage.
- Background script (`background.js`) to handle logic such as reminders and daily resets.
- Action settings, including the popup (`popup.html`) and icons.

#### `popup.js`
This script manages the functionality of the extension's popup interface:
- Allows users to set reminder intervals and daily goals.
- Tracks the number of cups consumed and updates the progress bar dynamically.
- Handles adding and removing cups, as well as ensuring the daily goal is not exceeded.
- Implements a notification system for goal achievement and hydration reminders.
- Provides a toggle to mute/unmute notifications.

#### `popup.html`
The HTML structure for the extension's popup interface, including:
- Input fields for setting the daily goal and reminder interval.
- Buttons to add or remove cups from the tally.
- A visual progress bar (`cupProgress`) showing hydration progress.
- Notification muting option.
- Styled with modern and responsive elements for a user-friendly experience.

#### `styles.css`
The stylesheet for the popup interface, designed to:
- Create a visually appealing and professional layout.
- Provide responsive and accessible elements.
- Highlight key features like the progress bar, buttons, and settings.

#### `background.js`
This script runs in the background to handle critical functionalities:
- Sends hydration reminders at user-defined intervals.
- Provides motivational messages as notifications.
- Resets daily progress (cups consumed) at midnight.
- Responds to messages from `popup.js` for updating reminders or notifying goal achievement.
- Handles installation and startup defaults for seamless operation.

---

### Design Choices:
1. **Reminder System**: The alarm API was chosen for its reliability in scheduling recurring events, making it perfect for hydration reminders.
2. **Progress Visualization**: A dynamic progress bar visually represents hydration goals, making it more engaging than plain text.
3. **Muting Notifications**: Users can mute notifications to avoid interruptions during work or meetings.
4. **Daily Reset**: Automating the daily reset ensures accurate tracking without user intervention.
5. **Motivational Messaging**: Adding fun, random messages encourages users to stay hydrated in a positive way.

---

### Usage Instructions:
1. **Install the Extension**:
   - Load the extension in developer mode via Chrome's Extensions page.
2. **Set Your Daily Goal**:
   - Open the popup, enter a value between 1 and 30 cups, and click "Set Goal."
3. **Define Reminder Intervals**:
   - Input a number in minutes and click "Set Interval."
4. **Track Your Progress**:
   - Use the "Add Cup" and "Remove Cup" buttons to update your tally.
   - Check the progress bar and notification messages for motivation.
5. **Mute/Unmute Notifications**:
   - Use the checkbox to control notification settings as needed.

---

### Future Improvements:
- **Cross-Device Syncing**: Enable syncing of hydration data across devices using Chrome's sync storage.
- **Custom Notification Sounds**: Allow users to upload personalized sounds for reminders.
- **Multi-Language Support**: Expand to support users in different languages.
- **Detailed Analytics**: Provide weekly or monthly hydration statistics for more insights.
- **Gamification Features**: Introduce Badges for achievements like completing a hydration goal for a certain number of consecutive days.

---

### Conclusion:
WaterQuack is a thoughtfully designed extension aimed at promoting better hydration habits. Its customizable features, visually appealing interface, and motivational system make it a valuable tool for health-conscious users. By leveraging Chrome's API capabilities, it delivers a seamless and effective user experience. We hope this extension inspires you to stay hydrated and healthy every day!

---

### Credits:
Developed by Iasmin Martins Cintra. Icons sourced and designed by ChatGPT, with background color modifications made by the developer.

