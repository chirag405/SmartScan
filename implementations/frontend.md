📱 App Structure
Bottom Tab Navigation
┌─────────────────────────────────────────────────┐
│ 🏠 Home │ 💬 Chat │ 👤 Profile │
└─────────────────────────────────────────────────┘
🎨 UI Design & Layout

1. Home Tab - Document Upload
   ┌─────────────────────────────────────────────────────────────┐
   │ 📱 ScanSmart 👤 Profile │
   │ │
   │ 📊 Quick Stats │
   │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
   │ │ Documents │ │ Processed │ │ Storage │ │
   │ │ 12 │ │ 10 │ │ 2.1 MB │ │
   │ └─────────────┘ └─────────────┘ └─────────────┘ │
   │ │
   │ 📸 Upload Document │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ │ │
   │ │ 📁 Choose File │ │
   │ │ │ │
   │ │ 📷 Camera 📎 Gallery 📄 Files │ │
   │ │ │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │ │
   │ 📋 Recent Documents │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ 📄 PAN Card ✅ Processed │ │
   │ │ 📄 Aadhaar Card 🔄 Processing │ │
   │ │ 📄 Bank Statement ⏳ Pending │ │
   │ └─────────────────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────────────┘
2. Chat Tab - AI Assistant
   ┌─────────────────────────────────────────────────────────────┐
   │ 💬 Document Assistant 🔄 New │
   │ │
   │ 🤖 Hi! I can help you with your documents. │
   │ What would you like to know? │
   │ │
   │ What documents do I have? 📤 You │
   │ │
   │ 🤖 You have 3 documents: │
   │ 📄 PAN Card (Identity) │
   │ 📄 Aadhaar Card (Identity) │
   │ 📄 Bank Statement (Financial) │
   │ │
   │ Would you like details about any specific document? │
   │ │
   │ give me my PAN card 📤 You │
   │ │
   │ 🤖 Here's your PAN card: │
   │ ┌─────────────────────────────────────────────────┐ │
   │ │ 📄 PAN Card │ │
   │ │ Name: John Doe │ │
   │ │ PAN: ABCDE1234F │ │
   │ │ [View Full Document] │ │
   │ └─────────────────────────────────────────────────┘ │
   │ │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ Ask about your documents... 🎤 📤 │ │
   │ └─────────────────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────────────┘
3. Profile Tab - User Settings
   ┌─────────────────────────────────────────────────────────────┐
   │ 👤 Profile │
   │ │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ 👤 John Doe │ │
   │ │ john.doe@gmail.com │ │
   │ │ Member since: Jan 2024 │ │
   │ │ [Edit Profile] │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │ │
   │ 📊 Usage Statistics │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ Documents Uploaded: 12 │ │
   │ │ Documents Processed: 10 │ │
   │ │ Storage Used: 2.1 MB │ │
   │ │ AI Queries: 25 │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │ │
   │ ⚙️ Settings │
   │ • 🔔 Notifications │
   │ • 🔒 Privacy & Security │
   │ • 📱 App Preferences │
   │ • ❓ Help & Support │
   │ │
   │ 🚪 Sign Out │
   └─────────────────────────────────────────────────────────────┘

📱 UI Components Styling

Design System: Clean, modern Material Design 3 / iOS style
Colors:

Primary: #007AFF (Blue)
Success: #34C759 (Green)
Warning: #FF9500 (Orange)
Error: #FF3B30 (Red)

Typography: System fonts (San Francisco/Roboto)
Icons: Expo Vector Icons
Spacing: 8pt grid system (8, 16, 24, 32px)
