// ==== Element handles ====
const promptInput     = document.getElementById("prompt");
const generateBtn     = document.getElementById("generate");
const outputDiv       = document.getElementById("output");
const budgetMinInput  = document.getElementById("budget-min");
const budgetMaxInput  = document.getElementById("budget-max");
const budgetDisplay   = document.getElementById("budget-display");
const techGroup       = document.getElementById("technologies");
const industryGroup   = document.getElementById("industries");

// ==== Your API key ====
const API_KEY = "AIzaSyDz7PsTucT9WAhsbBt-s67Y54GqZ6QIuf4"; // replace with your real Gemini API key

// ==== Defaults ====
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// Update budget display
function updateBudgetDisplay() {
  const minVal = parseInt(budgetMinInput.value, 10);
  const maxVal = parseInt(budgetMaxInput.value, 10);
  budgetDisplay.textContent = `Range: $${minVal} – $${maxVal}`;
}
budgetMinInput.addEventListener("input", updateBudgetDisplay);
budgetMaxInput.addEventListener("input", updateBudgetDisplay);

// Set output helper
function setOutput(msg, asHTML = false) {
  if (!outputDiv) return;
  if (asHTML) {
    outputDiv.innerHTML = msg;
  } else {
    outputDiv.textContent = msg;
  }
}

// Ensure model name
function ensureResourceName(name) {
  return name?.startsWith("models/") ? name : `models/${name}`;
}

// Collect selected checkboxes
function getSelected(group) {
  const checkboxes = group?.querySelectorAll("input[type=checkbox]:checked") || [];
  return Array.from(checkboxes).map(cb => cb.value);
}

// Markdown → HTML converter with card wrapping
function markdownToHTML(md) {
  let html = md
    .replace(/^### (.*$)/gim, "</div><div class='idea-card'><h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/(\r\n|\n){2,}/g, "</p><p>")
    .replace(/(\r\n|\n)/g, "<br>");

  html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");

  if (!html.startsWith("<div class='idea-card'>")) {
    html = `<div class='idea-card'>${html}</div>`;
  }

  return html;
}

// ==== Generate click ====
generateBtn?.addEventListener("click", async () => {
  const prompt = promptInput?.value?.trim();
  if (!prompt) {
    setOutput("⚠️ Please enter a prompt before generating ideas.");
    return;
  }

  const budgetMin = budgetMinInput?.value || "N/A";
  const budgetMax = budgetMaxInput?.value || "N/A";
  const selectedTechs = getSelected(techGroup);
  const selectedIndustries = getSelected(industryGroup);

  const enhancedPrompt = `
User idea/constraints: ${prompt}
Budget range: $${budgetMin} – $${budgetMax}
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}
Industry focus: ${selectedIndustries.join(", ") || "N/A"}

Generate 3–5 concrete computer engineering project ideas. 
For each idea, include:
- General description
- Required technologies
- Loose budget breakdown (how money would be spent)
- Similar existing products
- List of existing vs. novel elements in the project
`.trim();

  setOutput("⏳ Generating ideas...");

  const modelName = ensureResourceName(DEFAULT_MODEL);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: enhancedPrompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      }
    );

    const data = await res.json();

    if (data.error) {
      setOutput(`❌ API Error: ${data.error.message}`);
      return;
    }

    const candidates = data?.candidates || [];
    const first = candidates[0];
    const parts = first?.content?.parts || [];
    const text = parts.map(p => p.text || "").join("").trim();

    if (text) {
      const html = markdownToHTML(text);
      setOutput(`<div class="idea-results">${html}</div>`, true);
    } else if (data.promptFeedback?.blockReason) {
      setOutput(`⚠️ Blocked: ${data.promptFeedback.blockReason}`);
    } else {
      setOutput("⚠️ No response from Gemini.");
    }
  } catch (e) {
    setOutput("❌ Network or fetch error calling Gemini API.");
  }
});
