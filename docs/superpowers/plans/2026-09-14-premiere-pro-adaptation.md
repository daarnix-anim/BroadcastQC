# Adobe Premiere Pro Multi-Host Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Broadcast QC into a unified multi-host CEP extension supporting both Adobe After Effects and Adobe Premiere Pro (2021-2026+), enabling automated QC of Essential Graphics titles, MOGRTs, and Captions/Subtitles.

**Architecture:** Host Abstraction Layer (HAL) with `BroadcastQCHost` dispatcher routing to `AEHostAdapter` or `PProHostAdapter` based on `BridgeTalk.appName`. Client UI detects `csInterface.getHostEnvironment().appId` to adapt badges, labels, and feature availability. The core QC engine (`qc-core`, `spelling`, `safe-zone`, `reporting`, `ai`, `updater`) remains 100% shared and host-agnostic.

**Tech Stack:** Adobe CEP 11.0, ExtendScript (ES3), JavaScript (ES2022/Node.js), Node.js test runner (`node:test`).

## Global Constraints
- Must preserve 100% existing functionality in After Effects without any regressions.
- Support Premiere Pro versions 15.0 through 99.9 (Premiere Pro 2021-2026+).
- Single extension bundle ID `com.broadcast.qc` installed in `%APPDATA%\Adobe\CEP\extensions\com.broadcast.qc`.
- Full adherence to EBU R95 and social safe zones for both video tracks and captions.

---

### Task 1: CEP Multi-Host Manifest & Package Configuration

**Files:**
- Modify: `apps/ae-extension/CSXS/manifest.xml`
- Modify: `package.json`
- Test: `tests/manifest-multihost.test.js`

- [ ] **Step 1: Write test for multi-host manifest and package metadata**
Create `tests/manifest-multihost.test.js` testing that `manifest.xml` lists both `AEFT` and `PPRO` with versions `[18.0,99.9]` and `[15.0,99.9]`, and `package.json` mentions Premiere Pro.

- [ ] **Step 2: Run test to verify it fails**
Run `node --test tests/manifest-multihost.test.js`. Expected: FAIL (PPRO host not yet present).

- [ ] **Step 3: Update manifest.xml and package.json**
Add `<Host Name="PPRO" Version="[15.0,99.9]" />` to `apps/ae-extension/CSXS/manifest.xml`. Update keywords and description in `package.json`.

- [ ] **Step 4: Run test to verify it passes**
Run `node --test tests/manifest-multihost.test.js`. Expected: PASS.

- [ ] **Step 5: Commit changes**
Commit task 1.

---

### Task 2: Premiere Pro ExtendScript Adapter & Host Abstraction

**Files:**
- Modify: `apps/ae-extension/host/index.jsx`
- Test: `tests/ppro-adapter-normalization.test.js`

- [ ] **Step 1: Write test for PPro data normalization and host dispatch**
Create `tests/ppro-adapter-normalization.test.js` testing simulation of Premiere Pro sequence with video tracks (Essential Graphics / text) and caption tracks (subtitles) normalized to `NormalizedLayer` objects and processed by `qc-core`.

- [ ] **Step 2: Run test to verify it fails**
Run `node --test tests/ppro-adapter-normalization.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement Host Abstraction Layer and PProHostAdapter in index.jsx**
Add environment detection (`isPPro = (BridgeTalk.appName === "premierepro")`), wrap existing AE logic cleanly into `AEHostAdapter`, implement `PProHostAdapter` (handling `activeSequence`, `videoTracks`, `components`, `captionTracks`, navigation `setPlayerPosition`, and text replacement), and wire `BroadcastQCHost` as the unified dispatcher.

- [ ] **Step 4: Run tests to verify they pass**
Run `node --test tests/ppro-adapter-normalization.test.js` and `npm test`. Expected: PASS.

- [ ] **Step 5: Commit changes**
Commit task 2.

---

### Task 3: Client UI Adaptation for Premiere Pro

**Files:**
- Modify: `apps/ae-extension/client/js/main.js`
- Modify: `apps/ae-extension/client/index.html`
- Test: `tests/ui-multihost-adaptation.test.js`

- [ ] **Step 1: Write test for UI multi-host adaptation helper logic**
Create `tests/ui-multihost-adaptation.test.js` validating host environment adaptation (badge strings, tab disable rules, labels for AE vs PPro).

- [ ] **Step 2: Run test to verify it fails**
Run `node --test tests/ui-multihost-adaptation.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement UI host detection and adaptation**
In `main.js`, add `applyHostEnvironment(appId)`:
- Sets host badge text and class (`Premiere Pro 2026` or `After Effects 2026`).
- Adapts labels ("Секвенция", "Клипы / Субтитры").
- In Auto-Plate tab, display explanatory notice when in Premiere Pro and disable generation button.
In `index.html`, add markup for the host badge and Auto-Plate notice banner.

- [ ] **Step 4: Run tests to verify they pass**
Run `node --test tests/ui-multihost-adaptation.test.js` and `npm test`. Expected: PASS.

- [ ] **Step 5: Commit changes**
Commit task 3.

---

### Task 4: Installer, Packaging & Documentation Updates

**Files:**
- Modify: `install.ps1`
- Modify: `install.bat`
- Modify: `README.md`
- Modify: `scripts/package-release.js`

- [ ] **Step 1: Update install scripts and packager**
Update `install.ps1` and `install.bat` output messages to note that Broadcast QC is installed for both After Effects and Premiere Pro. Update `package-release.js` description.

- [ ] **Step 2: Update README.md**
Add Adobe Premiere Pro 2021-2026+ to supported hosts, describe checking Essential Graphics and Captions, add usage instructions for Premiere Pro.

- [ ] **Step 3: Run package script to verify clean build**
Run `npm run package`.

- [ ] **Step 4: Commit changes**
Commit task 4.

---

### Task 5: Full Verification & Final Audit

- [ ] **Step 1: Run complete automated test suite**
Run `npm test`. Verify all tests pass.
- [ ] **Step 2: Check package archive contents and integrity**
Verify release zip file contains updated manifest, host scripts, client, and packages.
- [ ] **Step 3: Final walkthrough artifact**
Create `walkthrough.md`.
