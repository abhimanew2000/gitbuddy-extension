console.log("GitBuddy content script loaded ✅");

// Default settings (if nothing in chrome.storage)
let userSettings = {
  commitTypes: ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
  minDescriptionLength: 10
};
let dynamicRegex = null;

/**
 * Build a simple regex to match:
 *    type(scope):
 * Then we do a separate check for the description length afterwards.
 */
function buildRegex(typesArray) {
  const typesPattern = typesArray.join("|");
  // Matches e.g. "fix(auth): " but doesn't enforce description yet
  // We enforce min length separately
  return new RegExp(`^(${typesPattern})\\([^)]*\\):\\s`);
}

// Load user settings and build the partial regex
function loadUserSettings(callback) {
  chrome.storage.sync.get(["gitbuddySettings"], (result) => {
    if (result.gitbuddySettings) {
      userSettings = result.gitbuddySettings;
    }
    dynamicRegex = buildRegex(userSettings.commitTypes);
    console.log("🔧 Loaded user settings:", userSettings);
    console.log("🔧 Built partial regex:", dynamicRegex);
    if (callback) callback();
  });
}

/**
 * Step 1: Check if the message starts with type(scope):
 * Step 2: Extract the description part after that colon
 * Step 3: If description length < minDescriptionLength => short error
 * If everything is correct => return null (no error)
 */
function getValidationError(msg) {
  // 1. Check basic format
  if (!dynamicRegex.test(msg)) {
    return "Invalid format! Example: fix(auth): resolved login issue";
  }

  // 2. Extract the part after the colon
  //    We'll split on the first occurrence of ": "
  const colonIndex = msg.indexOf(": ");
  if (colonIndex === -1) {
    // no colon + space found
    return "Invalid format! Example: fix(auth): resolved login issue";
  }

  const description = msg.slice(colonIndex + 2).trim(); 
  // e.g. for "fix(auth): updated docs", description="updated docs"

  // 3. Check if description is long enough
  if (description.length < userSettings.minDescriptionLength) {
    return `Description must be at least ${userSettings.minDescriptionLength} characters. Example: fix(auth): resolved login issue`;
  }

  // If no errors:
  return null;
}

// Get the commit message from GitHub's CodeMirror editor
function getCommitMessage() {
  const cmEditor = document.querySelector(".cm-content[contenteditable='true']");
  if (cmEditor) {
    let text = cmEditor.innerText.trim().replace(/\n/g, " ");
    return text;
  }
  return "";
}

// Show or remove the single-line warning
function showWarning(errorMsg) {
  const warningId = "gitbuddy-warning";
  let existingWarning = document.getElementById(warningId);

  // If no error, remove existing warning
  if (!errorMsg) {
    if (existingWarning) existingWarning.remove();
    return;
  }

  // If we need to show an error
  if (!existingWarning) {
    const cmEditor = document.querySelector(".cm-content[contenteditable='true']");
    if (!cmEditor) return;

    existingWarning = document.createElement("div");
    existingWarning.id = warningId;
    existingWarning.style.color = "red";
    existingWarning.style.marginTop = "5px";
    existingWarning.style.fontWeight = "bold";

    cmEditor.parentNode.appendChild(existingWarning);
  }

  existingWarning.textContent = `❌ ${errorMsg}`;
}

// Hide or show the "Commit changes..." button
function toggleCommitButton(hide) {
  const commitBtn = document.querySelector('button[type="button"][data-hotkey="Mod+s"][data-variant="primary"]');
  if (commitBtn) {
    commitBtn.style.setProperty("display", hide ? "none" : "inline-block", "important");
    commitBtn.style.setProperty("visibility", hide ? "hidden" : "visible", "important");
    console.log(hide ? "❌ Commit button hidden!" : "✅ Commit button shown!");
  }
}

// The main validation function
function validateCommitMessage() {
  const message = getCommitMessage();
  if (!message) {
    showWarning("Please enter a commit message. Example: fix(auth): resolved login issue");
    toggleCommitButton(true);
    return false;
  }

  const error = getValidationError(message);
  if (error) {
    showWarning(error);
    toggleCommitButton(true);
    return false;
  } else {
    showWarning(null); // remove any existing warning
    toggleCommitButton(false);
    return true;
  }
}

// Intercept the new commit button click
function interceptNewButtonClick() {
  const newCommitButton = document.querySelector(
    'button[type="button"][data-hotkey="Mod+s"][data-variant="primary"]'
  );
  if (newCommitButton) {
    newCommitButton.removeEventListener("click", handleCommitClick);
    newCommitButton.addEventListener("click", handleCommitClick);
    console.log("🚦 Intercepting commit button click...");
  }
}

function handleCommitClick(event) {
  console.log("Commit button clicked -> validating...");
  const isValid = validateCommitMessage();
  if (!isValid) {
    event.preventDefault();
    event.stopPropagation();
    alert("Invalid commit message! Please fix before committing.");
    console.log("❌ Blocked invalid commit.");
  }
}

// Observe CodeMirror for changes
function observeCodeMirror() {
  const cmEditor = document.querySelector(".cm-content[contenteditable='true']");
  if (cmEditor) {
    const observer = new MutationObserver(() => {
      validateCommitMessage();
      interceptNewButtonClick();
    });
    observer.observe(cmEditor, { childList: true, subtree: true, characterData: true });
    console.log("👀 Observing CodeMirror for changes...");
  } else {
    console.log("❌ No CodeMirror yet. Retrying...");
    setTimeout(observeCodeMirror, 1000);
  }
}

// Watch the DOM for the commit button
function observeDomForButton() {
  const domObserver = new MutationObserver(() => {
    validateCommitMessage();
    interceptNewButtonClick();
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
  console.log("👀 Observing DOM for commit button changes...");
}

// Final init
window.onload = () => {
  console.log("🔄 Page fully loaded, setting up GitBuddy...");
  loadUserSettings(() => {
    validateCommitMessage();
    observeCodeMirror();
    observeDomForButton();
    interceptNewButtonClick();
  });
};
