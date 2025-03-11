const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");

const git = simpleGit();

// Configurations
const CHANGELOG_PATH = path.join(__dirname, "CHANGELOG.md");
const MIN_DESCRIPTION_LENGTH = 10;

// List of commit types to categorize
const commitCategories = {
  feat: "🚀 Features",
  fix: "🐛 Fixes",
  docs: "📝 Documentation",
  style: "💅 Styling",
  refactor: "🔨 Refactoring",
  test: "🧪 Tests",
  chore: "🛠 Chores",
  others: "🔄 Miscellaneous",
};

(async function generateChangelog() {
  try {
    console.log("🔍 Fetching commit logs...");
    
    // Fetch commit history (last 100 commits)
    const logData = await git.log({ maxCount: 100 });

    // Object to store categorized commits
    const changes = {
      feat: [],
      fix: [],
      docs: [],
      style: [],
      refactor: [],
      test: [],
      chore: [],
      others: [],
    };

    logData.all.forEach((commit) => {
      const msg = commit.message.trim();

      // Match structured commit messages (type(scope): description)
      const match = msg.match(/^(\w+)\(([^)]+)\):\s+(.+)$/);
      if (match) {
        const [, type, scope, description] = match;
        
        // Validate description length
        if (description.length < MIN_DESCRIPTION_LENGTH) return;

        // Categorize based on type
        if (changes[type]) {
          changes[type].push({ scope, description });
        } else {
          changes.others.push({ scope, description });
        }
      } else {
        // Unstructured commits go to "others"
        changes.others.push({ scope: "?", description: msg });
      }
    });

    // Start building the changelog
    let changelogContent = `# 📜 Changelog\n\n## Unreleased\n\n`;

    for (const [type, section] of Object.entries(commitCategories)) {
      if (changes[type].length > 0) {
        changelogContent += `### ${section}\n`;
        changes[type].forEach(({ scope, description }) => {
          changelogContent += `- **${scope}**: ${description}\n`;
        });
        changelogContent += `\n`;
      }
    }

    // Write to CHANGELOG.md
    fs.writeFileSync(CHANGELOG_PATH, changelogContent, "utf-8");

    console.log("✅ CHANGELOG.md successfully updated!");

  } catch (err) {
    console.error("❌ Error generating changelog:", err);
  }
})();
