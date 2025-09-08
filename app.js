// ==== Element handles ====
const promptInput   = document.getElementById("prompt");
const generateBtn   = document.getElementById("generate");
const outputDiv     = document.getElementById("output");
const budgetSlider  = document.getElementById("budget-slider");
const budgetDisplay = document.getElementById("budget-display");
const timeframeSlider  = document.getElementById("timeframe-slider");
const timeframeDisplay = document.getElementById("timeframe-display");
const techGroup     = document.getElementById("technologies");
const industryGroup = document.getElementById("industries");
const complexityGroup = document.getElementById("complexity");
const innovationSelect = document.getElementById("innovation");
const demoSelect = document.getElementById("demo");
const apiKeyInput = document.getElementById("api-key");
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// ==== Sliders ====
noUiSlider.create(budgetSlider, { start: [100,1000], connect:true, range:{min:0,max:10000}, step:50 });
noUiSlider.create(timeframeSlider, { start: [6,12], connect:true, range:{min:1,max:24}, step:1 });

function getBudgetRange(){ const v=budgetSlider.noUiSlider.get(true); return [Math.round(v[0]),Math.round(v[1])]; }
function getTimeframeRange(){ const v=timeframeSlider.noUiSlider.get(true); return [Math.round(v[0]),Math.round(v[1])]; }

budgetSlider.noUiSlider.on("update",()=>{ const [min,max]=getBudgetRange(); budgetDisplay.textContent=`Range: $${min} – $${max}`; });
timeframeSlider.noUiSlider.on("update",()=>{ const [min,max]=getTimeframeRange(); timeframeDisplay.textContent=`${min} – ${max} months`; });

// ==== Helpers ====
function setOutput(msg, asHTML=false){ outputDiv.innerHTML=asHTML?msg:`<p>${msg}</p>`; }
function getSelected(group){ const checked=group.querySelectorAll("input[type=checkbox]:checked")||[]; return Array.from(checked).map(cb=>cb.value); }

// ==== Generate Ideas ====
// ==== Generate Ideas ====
async function generateIdeas() {
  const prompt = promptInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  if(!prompt){ setOutput("⚠️ Please enter a prompt."); return; }
  if(!apiKey){ setOutput("⚠️ Please enter your API key."); return; }

  const [budgetMin,budgetMax] = getBudgetRange();
  const [timeMin,timeMax] = getTimeframeRange();
  const selectedTechs = getSelected(techGroup);
  const selectedIndustries = getSelected(industryGroup);
  const complexity = document.querySelector('input[name="complexity"]:checked')?.value || "Medium";
  const innovation = innovationSelect.value;
  const demo = demoSelect.value;

  // STRICT JSON PROMPT — no intro/outro text allowed
  const structuredPrompt = `
Return ONLY a single JSON object with this exact schema. Do NOT include any preamble or explanation.

{
  "ideas": [
    {
      "name": "string",
      "generalDescription": "string",
      "requiredTechBudget": [{"item":"string","cost":number}],
      "timeframeBreakdown": [{"phase":"string","months":number}],
      "complexitySkillsNeeded": ["string"],
      "similarProducts": ["string"],
      "novelElements": ["string"]
    }
  ]
}

Fill with up to 3 ideas that satisfy the following constraints:

User idea/constraints: ${prompt}
Budget range: $${budgetMin} – $${budgetMax}
Timeframe: ${timeMin} – ${timeMax} months
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}
Industry focus: ${selectedIndustries.join(", ") || "N/A"}
Project Complexity: ${complexity}
Innovation Level: ${innovation}
Demo Considerations: ${demo}
`.trim();

  setOutput("⏳ Generating ideas...");

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: structuredPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          // 👇 Forces the model to return JSON text only
          response_mime_type: "application/json"
        }
      })
    });
    const data = await res.json();
    if (data.error) { setOutput(`❌ API Error: ${data.error.message}`); return; }
    const raw = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "")
      .join("")
      .trim();

    const json = safeParseJSON(raw);
    if (!json || !Array.isArray(json.ideas) || json.ideas.length === 0) {
      // Fallback: show raw text if JSON parsing failed (for debugging)
      setOutput("⚠️ Could not parse JSON. Showing raw response:<br><pre>" + escapeHTML(raw) + "</pre>", true);
      return;
    }

    setOutput(renderIdeasJSON(json.ideas.slice(0,3)), true);
    attachExpandEvents();
  } catch {
    setOutput("❌ Network or fetch error.");
  }
}
function safeParseJSON(s) {
  // Trim to outermost braces if model adds anything extra
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); }
  catch { return null; }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function currency(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "";
  return "$" + n.toLocaleString();
}

function renderIdeasJSON(ideas) {
  return ideas.map(idea => {
    const name = escapeHTML(idea.name || "Project Idea");
    // Sections
    const genDesc = idea.generalDescription ? `<p>${escapeHTML(idea.generalDescription)}</p>` : "<p>N/A</p>";

    const techBudget = Array.isArray(idea.requiredTechBudget) && idea.requiredTechBudget.length
      ? `<ul>` + idea.requiredTechBudget.map(tb =>
          `<li>${escapeHTML(tb.item || "Item")}${tb.cost!=null?` — ${currency(tb.cost)}`:""}</li>`
        ).join("") + `</ul>`
      : "<p>N/A</p>";

    const timeframe = Array.isArray(idea.timeframeBreakdown) && idea.timeframeBreakdown.length
      ? `<ul>` + idea.timeframeBreakdown.map(t =>
          `<li>${escapeHTML(t.phase || "Phase")}${t.months!=null?` — ${t.months} mo`:""}</li>`
        ).join("") + `</ul>`
      : "<p>N/A</p>";

    const skills = Array.isArray(idea.complexitySkillsNeeded) && idea.complexitySkillsNeeded.length
      ? `<ul>` + idea.complexitySkillsNeeded.map(s => `<li>${escapeHTML(s)}</li>`).join("") + `</ul>`
      : "<p>N/A</p>";

    const similar = Array.isArray(idea.similarProducts) && idea.similarProducts.length
      ? `<ul>` + idea.similarProducts.map(s => `<li>${escapeHTML(s)}</li>`).join("") + `</ul>`
      : "<p>N/A</p>";

    const novel = Array.isArray(idea.novelElements) && idea.novelElements.length
      ? `<ul>` + idea.novelElements.map(s => `<li>${escapeHTML(s)}</li>`).join("") + `</ul>`
      : "<p>N/A</p>";

    return `
      <div class="idea-card fade-in">
        <h2>${name}</h2>

        <div class="section-title">General Description<span class="expand-icon">▶</span></div>
        <div class="section-content">${genDesc}</div>

        <div class="section-title">Required Technologies & Budget Breakdown<span class="expand-icon">▶</span></div>
        <div class="section-content">${techBudget}</div>

        <div class="section-title">Timeframe Breakdown<span class="expand-icon">▶</span></div>
        <div class="section-content">${timeframe}</div>

        <div class="section-title">Complexity & Skills Needed<span class="expand-icon">▶</span></div>
        <div class="section-content">${skills}</div>

        <div class="section-title">Similar Products<span class="expand-icon">▶</span></div>
        <div class="section-content">${similar}</div>

        <div class="section-title">Novel Elements<span class="expand-icon">▶</span></div>
        <div class="section-content">${novel}</div>
      </div>
    `;
  }).join("");
}


// ==== Format Output ====
function formatOutput(raw) {
  // --- Cleanup ---
  let text = raw
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .replace(/<\/?[^>]+>/gi, "")
    .replace(/\r/g, "")
    .trim();

  // --- Split into ideas robustly (line-by-line tokenizer) ---
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Idea heading patterns we accept
  const ideaHeadRE = /^(?:project\s*idea|idea)\s*\d+\s*[:\-\.)]?|^\d+\s*[.)]\s+/i;

  const ideaBlocks = [];
  let cur = null;

  for (const line of lines) {
    if (ideaHeadRE.test(line)) {
      // start new idea
      if (cur) ideaBlocks.push(cur);
      cur = { heading: line, body: [] };
    } else {
      // ignore preamble until first idea appears
      if (cur) cur.body.push(line);
    }
  }
  if (cur) ideaBlocks.push(cur);

  // If model gave no recognizable headings, treat the entire text as one idea
  if (ideaBlocks.length === 0 && text) {
    ideaBlocks.push({ heading: "Project Idea 1:", body: lines });
  }

  // Only keep up to 3
  const kept = ideaBlocks.slice(0, 3);

  // Sections we want to extract
  const sections = [
    "General Description",
    "Required Technologies & Budget Breakdown",
    "Timeframe Breakdown",
    "Complexity & Skills Needed",
    "Similar Products",
    "Novel Elements"
  ];

  // Helper to escape for RegExp
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build a lookahead that stops at: next section OR next idea heading OR end
  const sectionStopLA = "(?=\\n\\s*(?:" +
    sections.map(esc).join("|") +
    ")\\s*:?\\s*|\\n\\s*(?:" +
    "(?:Project\\s*Idea|Idea)\\s*\\d+\\s*[:\\-\\.)]?|\\d+\\s*[\\.)]\\s+)" +
    "|$)";

  // Render each idea card
  const cardsHtml = kept.map((blk, idx) => {
    const ideaText = [blk.heading, ...blk.body].join("\n").trim();

    // Title: prefer explicit Name: line, else derive from heading/body
    let name = "";
    const nameLine = blk.body.find(l => /^Name\s*:/i.test(l));
    if (nameLine) {
      name = nameLine.replace(/^Name\s*:\s*/i, "").trim();
    } else {
      // Use heading text without the leading numbering
      name = blk.heading
        .replace(/^(?:project\s*idea|idea)\s*\d+\s*[:\-\.])?\s*/i, "")
        .replace(/^\d+\s*[.)]\s+/, "")
        .trim();
      if (!name) {
        // fallback: first meaningful line in body
        const genericRE = /^(here (are|is)|some (good|great)|below (are|is))/i;
        name = (blk.body.find(l => !/^Name\s*:/i.test(l) && !genericRE.test(l)) || "Project Idea").split(/[.:;-]/)[0].slice(0, 120).trim();
      }
    }

    // Extract section content safely
    const contentHtml = sections.map((sec, i) => {
      const secRE = new RegExp(
        "^\\s*" + esc(sec) + "\\s*:?\\s*([\\s\\S]*?)" + sectionStopLA,
        "im"
      );
      const m = ideaText.match(secRE);
      let content = (m && m[1] ? m[1].trim() : "N/A");

      // Bulletize if it looks like a list
      let ls = content.split("\n").map(s => s.trim()).filter(Boolean);
      if (ls.some(l => /^[-•\d]+[.)]?\s+/.test(l))) {
        content = "<ul>" + ls.map(l => `<li>${l.replace(/^[-•\d. )]+\s*/, "")}</li>`).join("") + "</ul>";
      } else {
        content = ls.length ? ls.map(l => `<p>${l}</p>`).join("") : "<p>N/A</p>";
      }

      return `<div class="section-title">${sec}<span class="expand-icon">▶</span></div>
              <div class="section-content">${content}</div>`;
    }).join("");

    return `<div class="idea-card fade-in">
              <h2>${name}</h2>
              ${contentHtml}
            </div>`;
  }).join("");

  return cardsHtml;
}

const json = safeParseJSON(raw);
if (json && Array.isArray(json.ideas) && json.ideas.length) {
  setOutput(renderIdeasJSON(json.ideas.slice(0,3)), true);
} else {
  // fallback to heuristic prose parser
  setOutput(formatOutput(raw), true);
}


// ==== Attach Expand Events ====
function attachExpandEvents(){
  document.querySelectorAll(".section-title").forEach(title=>{
    const icon = title.querySelector(".expand-icon");
    const content = title.nextElementSibling;
    title.addEventListener("click",()=>{
      if(content.style.display==="block"){
        content.style.display="none";
        icon.classList.remove("open");
      } else {
        content.style.display="block";
        icon.classList.add("open");
      }
    });
  });
}

// ==== Event Listener ====
generateBtn.addEventListener("click",()=>generateIdeas());
