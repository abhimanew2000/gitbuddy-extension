// Default settings
const DEFAULT_TYPES = ["feat", "fix", "docs", "style", "refactor", "test", "chore"];
const DEFAULT_MIN_LENGTH = 10;

document.addEventListener("DOMContentLoaded", () => {
  // Get references to elements
  const commitTypesInput = document.getElementById("commitTypes");
  const minLengthInput = document.getElementById("minDescriptionLength");
  const saveStatus = document.getElementById("saveStatus");
  const saveBtn = document.getElementById("saveBtn");

  // Load existing settings from chrome.storage
  chrome.storage.sync.get(["gitbuddySettings"], (result) => {
    const settings = result.gitbuddySettings || {};
    const types = settings.commitTypes || DEFAULT_TYPES;
    const minLen = settings.minDescriptionLength || DEFAULT_MIN_LENGTH;

    commitTypesInput.value = types.join(","); 
    minLengthInput.value = minLen;
  });

  // Save settings on button click
  saveBtn.addEventListener("click", () => {
    const typesValue = commitTypesInput.value.trim();
    const minLenValue = Number(minLengthInput.value) || DEFAULT_MIN_LENGTH;

    // Convert comma-separated string to array
    const typesArray = typesValue.split(",").map((t) => t.trim()).filter(Boolean);

    const newSettings = {
      commitTypes: typesArray,
      minDescriptionLength: minLenValue,
    };

    // Save to chrome.storage.sync
    chrome.storage.sync.set({ gitbuddySettings: newSettings }, () => {
      saveStatus.textContent = "✅ Settings saved!";
      setTimeout(() => {
        saveStatus.textContent = "";
      }, 1500);
    });
  });
});
