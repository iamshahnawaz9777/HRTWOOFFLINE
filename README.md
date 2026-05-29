# AeroGlass ERP Platform

AeroGlass ERP is a premium offline-first Glass Company Management System built with HTML, CSS, JavaScript, and IndexedDB for local-first database operations, with optional Supabase cloud backend synchronization.

## Quick Start

1. Install dependencies (if needed):
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

---

## Git Integration Guide: How to Push and Pull

This repository is linked to the remote URL: `https://github.com/iamshahnawaz9777/HRTWOOFFLINE`

Here are the different ways you can sync your local codebase with GitHub:

### Method 1: Standard Command Line Interface (CLI)

The most robust and common way to pull and push updates is using your system terminal or command prompt.

#### 1. Fetching & Pulling Updates (Getting latest code from GitHub)
Before starting any new work, always pull the latest changes to avoid conflicts:
```bash
# Fetch details of all remote changes
git fetch origin

# Merge the remote changes into your local active branch
git pull origin main
```

#### 2. Saving & Pushing Updates (Uploading your code to GitHub)
When you have made local changes that you want to upload:
```bash
# Stage all your modified and new files
git add .

# Create a local version commit with a descriptive message
git commit -m "Your descriptive change message"

# Push the committed changes to the remote main branch
git push origin main
```

---

### Method 2: Version Branches & Rollbacks (Branching Workflow)

If you created backup branches (like `version-1` or `version-2`) to keep snapshots of your app, you can manage and push them as follows:

#### 1. Switching to a Backup Branch locally:
```bash
git checkout version-1
```

#### 2. Creating a new branch:
```bash
git checkout -b version-3
```

#### 3. Pushing a specific branch to GitHub:
```bash
git push origin version-1
```

#### 4. Merging a branch back into main:
```bash
# Switch to main branch
git checkout main

# Merge version-1 changes into main
git merge version-1

# Push the merged main branch to GitHub
git push origin main
```

---

### Method 3: Discarding Local Changes & Hard Resets

If your workspace gets into an error state or has merge conflicts, you can reset to the remote repository version:

```bash
# 1. Fetch all updates from the server
git fetch --all

# 2. Hard reset your active branch to match the remote main branch exactly
git reset --hard origin/main

# 3. Clean untracked files and folders to get a completely pristine directory
git clean -fd
```

---

### Method 4: Using GUI Clients (No Terminal Needed)

If you prefer visual interfaces over terminal commands:

1. **VS Code / Cursor Built-in Git**:
   - Go to the **Source Control** tab on the left sidebar (shortcut `Ctrl + Shift + G`).
   - Type your commit message, and click **Commit** (or checkmark icon).
   - Click the **...** (three dots) menu at the top of the Source Control panel and select **Pull** or **Push**.

2. **GitHub Desktop**:
   - Add this local folder (`d:\code 1\hronelocal git`) via **File > Add Local Repository**.
   - Review changes on the left pane, type a summary, and click **Commit to main**.
   - Click **Fetch origin** at the top bar, then click **Pull** or **Push** to upload/download.
