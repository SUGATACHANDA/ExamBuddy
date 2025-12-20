## v1.6.1

### ✨ Features
- Added **StudentProfilePage** and **TeacherProfilePage** for viewing and managing user profiles.
- Integrated **biometric registration** via `BiometricRegisterModal` for both student and teacher profiles.
- Implemented **password change functionality** within profile pages.

### 🧩 Components
- Introduced `UserDetailsCard` to display structured user profile information.
- Reused biometric registration modal across student and teacher workflows.

### 🧭 Navigation & Routing
- Updated `App.js` routing to include new profile routes for students and teachers.
- Enhanced **StudentDashboard** and **TeacherDashboard** to navigate to their respective profile pages.

### ⚙️ Configuration
- Refactored Axios configuration to use the **production backend URL**.

### 🛠 Improvements
- Improved **error handling** and **loading states** in profile-related components.
