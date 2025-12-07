#  SelfTrack - Social Habit Tracking App

SelfTrack is a modern mobile application that allows users to track their daily goals, interact with friends, and includes gamification elements to keep motivation high.

<p align="center">
  <img src="./screenshots/home.jpeg" width="200" alt="Home Screen" />
  <img src="./screenshots/statistics.jpeg" width="200" alt="Statistics" />
  <img src="./screenshots/darkmode.jpeg" width="200" alt="Dark Mode" />
</p>

##  Features

* **Detailed Habit Tracking:** Support for daily/weekly frequencies and various target types (Duration, Pages, Check-in).
* **Social Interaction:** Add friends via username and track mutual progress.
* **Smart Notifications:** Local reminders and notifications powered by Notifee.
* **Advanced Analytics:** Streak tracking, weekly success analysis, and a badge/achievement system.
* **Theme Engine:** Dynamic theme support (Dark/Light/Custom themes).
* **Deep Linking:** Quick invite system via shareable links (`selftrack://`).

##  Tech Stack

* **Framework:** React Native (CLI)
* **Language:** TypeScript
* **Backend:** Firebase (Authentication, Cloud Firestore)
* **State Management:** Context API (with Custom Hooks)
* **Navigation:** React Navigation (Stack & Tab Navigator)
* **UI/UX:** Reanimated 3, Vector Icons, Safe Area Context
* **Other:** Notifee (Notifications), DatePicker, Clipboard

## Download & Demo (APK)

You can download the APK file from the link below to try the latest version of the app:
[ Download SelfTrack v1.0 APK (Releases Page)](https://github.com/YesilayMustafa/SelfTrack-App/releases)

## Installation (For Developers)

To run the project locally on your machine:

1.  Clone the repository:
    ```bash
    git clone [https://github.com/YesilayMustafa/SelfTrack-App.git](https://github.com/YesilayMustafa/SelfTrack-App.git)
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Install Pods (Mac/iOS only):
    ```bash
    cd ios && pod install && cd ..
    ```
4.  Run on Android:
    ```bash
    npx react-native run-android
    ```

---
*This project was developed using modern mobile application development practices.*