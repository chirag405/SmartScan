# SmartScan Project Structure

This document provides an overview of the SmartScan application's folder structure and explains the purpose of each directory and key files.

## Project Overview

SmartScan is a mobile application that allows users to scan, analyze, and manage documents. The app is built using React Native with Expo and uses Supabase for backend services.

## Root Directory Structure

- **app/** - Contains the main application screens and navigation
- **assets/** - Static assets like images and fonts
- **components/** - Reusable UI components
- **constants/** - App-wide constants like colors and sizes
- **docs/** - Project documentation
- **implementations/** - Implementation notes and technical documentation
- **lib/** - Utility libraries and configuration files
- **scripts/** - Helper scripts for development and deployment
- **server/** - Server-side functions and API endpoints
- **stores/** - State management stores using Zustand
- **supabase/** - Supabase configuration and edge functions

## Folder Details

### `/app`

Contains the main application screens organized by Expo Router. Routes are defined by file names and folder structure.

- **index.tsx** - Entry point and initial route
- **\_layout.tsx** - Root layout for the application
- **oauth-callback.tsx** - Handles OAuth authentication callbacks
- **(tabs)/** - Tab-based navigation screens

### `/assets`

Contains static assets used throughout the application.

- **fonts/** - Custom fonts
- **images/** - Images and icons

### `/components`

Reusable UI components organized by category.

- **auth/** - Authentication-related components (login, signup, etc.)
- **common/** - Shared utility components (loading screens, errors, etc.)
- **layout/** - Layout components (headers, containers, etc.)
- **ui/** - UI elements (buttons, inputs, cards, etc.)

### `/constants`

Application-wide constants.

- **Colors.ts** - Color definitions

### `/docs`

Project documentation files.

- **PROJECT_STRUCTURE.md** - This file

### `/implementations`

Implementation notes and technical documentation.

- **auth-fix-summary.md** - Authentication fixes documentation
- **bug-fixes-summary.md** - Bug fixes summary
- **critical-null-reference-fix.md** - Critical bug fixes
- **email-conflict-resolution.md** - Email conflict resolution implementation
- **frontend.md** - Frontend implementation notes
- **status.md** - Project status
- **techstack.md** - Technology stack documentation
- **user-profile-fix.md** - User profile fixes

### `/lib`

Utility libraries and configuration.

- **config.ts** - Application configuration
- **envCheck.ts** - Environment variable validation
- **supabaseClient.tsx** - Supabase client configuration

### `/scripts`

Helper scripts for development and deployment.

- **auth-diagnostic.js** - Authentication diagnostic tool
- **update-oauth-config.js** - Updates OAuth configuration

### `/server`

Server-side functions and API endpoints.

### `/stores`

State management using Zustand.

- **authStore.ts** - Authentication state management
- **conversationStore.ts** - Conversation state management
- **documentStore.ts** - Document state management

### `/supabase`

Supabase configuration and edge functions.

## Key Configuration Files

- **.env.example** - Example environment variables template
- **.env.local** - Local environment variables (not committed to git)
- **app.json** - Expo application configuration
- **babel.config.js** - Babel configuration
- **eslint.config.js** - ESLint configuration
- **global.css** - Global CSS styles
- **package.json** - NPM package configuration
- **tailwind.config.js** - Tailwind CSS configuration
- **tsconfig.json** - TypeScript configuration
- **types.ts** - TypeScript type definitions

## Documentation Files

- **AUTHENTICATION_GUIDE.md** - Guide for authentication implementation
- **README.md** - Project overview and setup instructions
- **SETUP.md** - Detailed setup instructions

## File Naming Conventions

- React components use PascalCase (e.g., `LoginScreen.tsx`)
- Utility functions use camelCase (e.g., `supabaseClient.tsx`)
- Configuration files use lowercase with appropriate extensions (e.g., `eslint.config.js`)
- Constants use PascalCase (e.g., `Colors.ts`)
- Store files use camelCase (e.g., `authStore.ts`)

## Component Organization

Components are organized based on their functionality:

1. **auth/** - Authentication related components
2. **common/** - Shared utility components
3. **layout/** - Layout components
4. **ui/** - User interface elements

## State Management

State is managed primarily through Zustand stores:

1. **authStore.ts** - Manages authentication state
2. **documentStore.ts** - Manages document state
3. **conversationStore.ts** - Manages conversation state

## Navigation

The app uses Expo Router for navigation:

- File-based routing in the `app/` directory
- Tab-based navigation in `app/(tabs)/`
