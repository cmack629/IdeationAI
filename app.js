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

  let enhancedPrompt = `
User idea/constraints: ${prompt}
Budget range: $${budgetMin} – $${budgetMax}
Timeframe: ${timeMin} – ${timeMax} months
Preferred technologies: ${selectedTechs.join(", ") || "N/A"}
Industry focus: ${selectedIndustries.join(", ") || "N/A"}
Project Complexity: ${complexity}
Innovation Level: ${innovation}
Demo Considerations: ${demo}


Return ONLY the following sections for each idea, with no introduction, no conclusion, and no extra text.

Format exactly like this:

Project Idea 1:
Name: ...
General Description: ...
Required Technologies & Budget Breakdown: ...
Timeframe Breakdown: ...
Complexity & Skills Needed: ...
Similar Products: ...
Novel Elements: ...

Project Idea 2:
Name: ...
General Description: ...
Required Technologies & Budget Breakdown: ...
Timeframe Breakdown: ...
Complexity & Skills Needed: ...
Similar Products: ...
Novel Elements: ...

Project Idea 3:
Name: ...
General Description: ...
Required Technologies & Budget Breakdown: ...
Timeframe Breakdown: ...
Complexity & Skills Needed: ...
Similar Products: ...
Novel Elements: ...`;

  setOutput("⏳ Generating ideas...");

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent`,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
      body: JSON.stringify({contents:[{parts:[{text:enhancedPrompt}]}],generationConfig:{temperature:0.7}})
    });
    const data = await res.json();
    if(data.error){ setOutput(`❌ API Error: ${data.error.message}`); return; }
    const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
    if(!text){ setOutput("⚠️ No response from Gemini."); return; }

    setOutput(formatOutput(text), true);
    attachExpandEvents();
  } catch { setOutput("❌ Network or fetch error."); }
}

function formatOutput(raw) {
  // ---------- Normalize & de-noise ----------
  let text = String(raw)
    .replace(/```[\s\S]*?```/g, "")             // strip code fences if any
    .replace(/<\/?[^>]+>/gi, "")                // strip any HTML tags
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .trim();

  // ---------- Define tolerant markers ----------
  // Idea headings we accept
  const ideaHeadRE = /^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\d+\s*[.)]\s+/i;
  // Also treat "Name:" as a hard idea boundary
  const nameHeadRE = /^\s*Name\s*:/i;

  // ---------- Drop preamble (anything before first idea heading OR Name:) ----------
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let firstIdx = lines.findIndex(l => ideaHeadRE.test(l) || nameHeadRE.test(l));
  if (firstIdx > 0) {
    text = lines.slice(firstIdx).join("\n");
  }

  // ---------- Re-scan lines after trimming ----------
  const L = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Group lines into idea blocks: start a new block on ideaHeadRE OR nameHeadRE
  const blocks = [];
  let cur = null;

  for (const line of L) {
    if (ideaHeadRE.test(line) || nameHeadRE.test(line)) {
      if (cur) blocks.push(cur);
      cur = { heading: ideaHeadRE.test(line) ? line : "Name:", body: [] };
      // if this line is "Name: ...", keep it inside body so we can read the value
      if (nameHeadRE.test(line)) cur.body.push(line);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) blocks.push(cur);

  // If we still didn't detect anything, treat whole text as one idea
  if (blocks.length === 0 && text) {
    blocks.push({ heading: "Project Idea 1:", body: L });
  }

  // Keep at most 3 ideas
  const kept = blocks.slice(0, 3);

  // ---------- Section labels (escaped for regex) ----------
  const sections = [
    "General Description",
    "Required Technologies & Budget Breakdown",
    "Timeframe Breakdown",
    "Complexity & Skills Needed",
    "Similar Products",
    "Novel Elements"
  ];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build stop lookahead: next section OR next idea heading OR next Name: OR end
  const sectionStopLA =
    "(?=\\n\\s*(?:" +
    sections.map(esc).join("|") +
    ")\\s*:?\\s*|\\n\\s*(?:(?:Project\\s*Idea|Idea)\\s*\\d+\\s*[:\\-.)]?|\\d+\\s*[\\.)]\\s+|Name\\s*:)\\s*|$)";

  // ---------- Render each idea ----------
  const itemsHtml = kept.map((blk, idx) => {
    const ideaText = [blk.heading, ...blk.body].join("\n").trim();

    // Title: prefer explicit Name: line, else derive from heading/body
    let name = "";
    const nameLine = blk.body.find(l => /^Name\s*:/i.test(l));
    if (nameLine) {
      name = nameLine.replace(/^Name\s*:\s*/i, "").trim();
    }
    if (!name) {
      // derive from heading numberless, else first meaningful line
      name = blk.heading
        .replace(/^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?\s*/i, "")
        .replace(/^\d+\s*[.)]\s+/, "")
        .trim();
      if (!name) {
        const generic = /^(here (are|is)|some (good|great)|below (are|is))/i;
        name = (blk.body.find(l => !/^Name\s*:/i.test(l) && !generic.test(l)) || "Project Idea")
          .split(/[.:;-]/)[0]
          .slice(0, 120)
          .trim();
      }
    }

    // Helper to extract a section with strict stop conditions
    const extractSection = (label) => {
      const re = new RegExp(
        "^\\s*" + esc(label) + "\\s*:?\\s*([\\s\\S]*?)" + sectionStopLA,
        "im"
      );
      const m = ideaText.match(re);
      let content = (m && m[1] ? m[1].trim() : "");
      const ls = content.split("\n").map(x => x.trim()).filter(Boolean);
      if (!ls.length) return "<p>N/A</p>";
      if (ls.some(x => /^[-•\d]+[.)]?\s+/.test(x))) {
        return "<ul>" + ls.map(x => `<li>${x.replace(/^[-•\d. )]+\s*/, "")}</li>`).join("") + "</ul>";
      }
      return ls.map(x => `<p>${x}</p>`).join("");
    };

    const sectionsHtml = sections.map(label => `
      <div class="section-title">${label}<span class="expand-icon">▶</span></div>
      <div class="section-content">${extractSection(label)}</div>
    `).join("");

    return `
      <li class="idea-card fade-in">
        <h2>${name || `Project Idea ${idx + 1}`}</h2>
        ${sectionsHtml}
      </li>
    `;
  }).join("");

  return `<ol class="idea-list">${itemsHtml}</ol>`;
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
