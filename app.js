// ==== Element handles ====
const promptInput   = document.getElementById("prompt");
const generateBtn   = document.getElementById("generate");
const outputDiv     = document.getElementById("output");
const budgetSlider  = document.getElementById("budget-slider");
const budgetDisplay = document.getElementById("budget-display");
const techGroup     = document.getElementById("technologies");
const industryGroup = document.getElementById("industries");
const extraButtons  = document.getElementById("extra-buttons");
const expandBtn     = document.getElementById("expand");
const similarBtn    = document.getElementById("similar");
const summarizeBtn  = document.getElementById("summarize");

// ==== Your API key ====
const API_KEY = "AIzaSyDz7PsTucT9WAhsbBt-s67Y54GqZ6QIuf4"; // keep yours here
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// ==== Budget slider setup ====
noUiSlider.create(budgetSlider, {
  start: [100, 1000],
  connect: true,
  range: { min: 0, max: 10000 },
  step: 50,
  tooltips: true,
  format: {
    to: v => `$${Math.round(v)}`,
    from: v => Number(v.replace("$", ""))
  }
});

function getBudgetRange() {
  const values = budgetSlider.noUiSlider.get(true);
  return [Math.round(values[0]), Math.round(values[1])];
}

budgetSlider.noUiSlider.on("update", () => {
  const [min, max] = getBudgetRange();
  budgetDisplay.textContent = `Range: $${min} – $${max}`;
});

// ==== Helpers ====
function setOutput(msg, asHTML = false) {
  outputDiv.innerHTML = asHTML ? msg : `<p>${msg}</p>`;
}

function ensureResourceName(name) {
  return name?.startsWith("models/") ? name : `models/${name}`;
}

function getSelected(group) {
  const checkboxes = group?.querySelectorAll("input[type=checkbox]:checked") || [];
  return Array.from(checkboxes).map(cb => cb.value);
}

// Clean + structure AI output
function formatOutput(text) {
  // Strip all table junk
  let cleaned = text
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .replace(/<\/?table.*?>/gi, "")
    .replace(/<\/?tr.*?>/gi, "")
    .replace(/<\/?td.*?>/gi, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/###/g, "")
    .replace(/##/g, "")
    .trim();

  // Split into ideas
  const ideas = cleaned.split(/Project Idea\s*\d+/i).filter(s => s.trim());

  return ideas.map((idea, idx) => {
    let formatted = idea.replace(
      /(General Description|Required Technologies|Budget Breakdown|Similar Products|Novel Elements)/gi,
      m => `<h3 class="section-title">${m}</h3>`
    );

    // Convert bullet-like lines
    formatted = formatted.replace(/(?:^|\n)[-•]\s*(.+)/g, "<li>$1</li>");
    if (formatted.includes("<li>")) {
      formatted = `<ul>${formatted}</ul>`;
    }

    formatted = formatted.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");

    return `
      <div class="idea-card fade-in">
        <h2>Project Idea ${idx + 1}</h2>
        <p>${formatted}</p>
      </div>
    `;
  }).join("");
}

// ==== Generate function ====
async function generateIdeas(mode = "normal") {
  const prompt = promptInput?.value?.trim();
  if (!prompt) {
    setOutput("⚠️ Please enter a prompt before generating ideas.");
    return;
  }

  const [budgetMin, budgetMax] = getBudgetRange();
  const selectedTechs = getSelected(techGroup);
  const selectedIndustries = getSelected(industryGroup);

  let enhancedPrompt = `
User idea/constraints: ${prompt}
Budget range: $${budgetMin} – $${budgetMax}
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}
Industry focus: ${selectedIndustries.join(", ") || "N/A"}
`;

  if (mode === "normal") {
    enhancedPrompt += `
Generate 3–5 computer engineering project ideas. For each, provide:
- General Description
- Required Technologies
- Budget Breakdown
- Similar Products
- Novel Elements (what’s unique)`;
  } else if (mode === "expand") {
    enhancedPrompt += `Expand the previous ideas with deeper technical details.`;
  } else if (mode === "similar") {
    enhancedPrompt += `Generate 3–5 related variations of the previous ideas.`;
  } else if (mode === "summarize") {
    enhancedPrompt += `Summarize the previous ideas into concise bullet points.`;
  }

  setOutput("⏳ Generating ideas...");
  extraButtons.classList.remove("hidden");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${ensureResourceName(DEFAULT_MODEL)}:generateContent`,
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

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (text) {
      setOutput(formatOutput(text), true);
    } else {
      setOutput("⚠️ No response from Gemini.");
    }
  } catch {
    setOutput("❌ Network or fetch error.");
  }
}

// ==== Button events ====
generateBtn?.addEventListener("click", () => generateIdeas("normal"));
expandBtn?.addEventListener("click", () => generateIdeas("expand"));
similarBtn?.addEventListener("click", () => generateIdeas("similar"));
summarizeBtn?.addEventListener("click", () => generateIdeas("summarize"));
