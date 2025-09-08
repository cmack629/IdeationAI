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
You are responding for machine parsing. Output ONLY sections in this exact schema. 
Start with "Project Idea 1:" etc. Do NOT include any introduction or conclusion text.

Project Idea 1:
Name: ...
General Description:
Required Technologies & Budget Breakdown:
Timeframe Breakdown:
Complexity & Skills Needed:
Similar Products:
Novel Elements:

Project Idea 2:
...


${enhancedPrompt}
`.trim();

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
