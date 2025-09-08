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

Output exactly 3 ideas.

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
  // ---------- Normalize & clean ----------
  let text = String(raw)
    .replace(/```[\s\S]*?```/g, "")   // strip code fences
    .replace(/<\/?[^>]+>/gi, "")      // strip HTML
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .trim();

  // Put newlines around common markers so they land at line starts
  text = text
    // Idea headings (Project Idea 1:, Idea 2 -, 2), 2.)
    .replace(/(?:\s*)(?=((?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\b\d+\s*[.)]\s+))/gi, "\n")
    .replace(/((?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\b\d+\s*[.)]\s+)/gi, "\n$1\n")
    // Name:
    .replace(/(?:\s*)(?=(\bName\s*:))/gi, "\n")
    .replace(/\bName\s*:/gi, "\nName:\n");

  const ideaHeadRE = /^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\d+\s*[.)]\s+/i;
  const nameHeadRE = /^\s*Name\s*:/i;

  // Trim any preamble before first idea or Name:
  let lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const firstIdx = lines.findIndex(l => ideaHeadRE.test(l) || nameHeadRE.test(l));
  if (firstIdx > 0) lines = lines.slice(firstIdx);

  // Group into idea blocks on heading OR Name:
  let blocks = [];
  let cur = null;
  for (const line of lines) {
    if (ideaHeadRE.test(line) || nameHeadRE.test(line)) {
      if (cur) blocks.push(cur);
      cur = { heading: ideaHeadRE.test(line) ? line : "Name:", body: [] };
      if (nameHeadRE.test(line)) cur.body.push(line); // keep Name: line so we can read it
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) blocks.push(cur);

  // Rescue: if a block has multiple Name: lines, split them into separate ideas
  if (blocks.length < 3) {
    const rescued = [];
    for (const b of blocks) {
      const idxs = b.body.map((l, i) => /^Name\s*:/i.test(l) ? i : -1).filter(i => i >= 0);
      if (idxs.length > 1) {
        for (let k = 0; k < idxs.length; k++) {
          const start = idxs[k];
          const end = (k + 1 < idxs.length) ? idxs[k + 1] : b.body.length;
          rescued.push({ heading: "Name:", body: b.body.slice(start, end) });
        }
      } else {
        rescued.push(b);
      }
    }
    blocks = rescued;
  }

  if (blocks.length === 0 && lines.length) {
    blocks.push({ heading: "Project Idea 1:", body: lines });
  }

  // Keep up to 3 ideas
  const kept = blocks.slice(0, 3);

  // ---------- Section aliases (canonical -> synonyms) ----------
  const sectionAliases = {
    "General Description": [
      "General Description", "Overview", "Description"
    ],
    "Required Technologies & Budget Breakdown": [
      "Required Technologies & Budget Breakdown", "Required Technologies", "Tech Stack",
      "Bill of Materials", "BOM", "Budget", "Cost", "Costs"
    ],
    "Timeframe Breakdown": [
      "Timeframe Breakdown", "Timeline", "Schedule", "Milestones", "Milestone"
    ],
    "Complexity & Skills Needed": [
      "Complexity & Skills Needed", "Skills Needed", "Skill Requirements", "Complexity"
    ],
    "Similar Products": [
      "Similar Products", "Comparables", "Existing Solutions", "Competitors", "Competition"
    ],
    "Novel Elements": [
      "Novel Elements", "Differentiators", "Innovation", "What's New", "Uniqueness"
    ]
  };
  const canonicalOrder = Object.keys(sectionAliases);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build a regex that MATCHES headers even when the first content is inline after the colon.
  // We will scan per-idea text with this.
  const anyLabel = Object.values(sectionAliases).flat();
  const anyLabelGroup = "(?:" + anyLabel.map(esc).join("|") + ")";
  const sectionAnyRE = new RegExp(
    "(?:^|\\n)\\s*(" + anyLabelGroup + ")\\s*:\\s*(.*)$", // group 1 = label, group 2 = inline content (may be empty)
    "gmi"
  );

  // Helper: map a found label to its canonical name
  function toCanonical(label) {
    const low = label.trim().toLowerCase();
    for (const canon of canonicalOrder) {
      for (const alias of sectionAliases[canon]) {
        if (alias.toLowerCase() === low) return canon;
      }
    }
    return null;
  }

  // Render helpers
  const looksList = (ls) => ls.some(x => /^[-•\d]+[.)]?\s+/.test(x));
  const toHtml = (ls) => {
    if (!ls.length) return "<p>N/A</p>";
    if (looksList(ls)) {
      return "<ul>" + ls.map(x => `<li>${x.replace(/^[-•\d. )]+\s*/, "")}</li>`).join("") + "</ul>";
    }
    return ls.map(x => `<p>${x}</p>`).join("");
  };

  // ---------- Per-idea render ----------
  const itemsHtml = kept.map((blk, idx) => {
    // Build the idea text as lines (keep original order)
    const ideaLines = [blk.heading, ...blk.body].join("\n");

    // Title from Name: … else derive
    let title = "";
    const nameLine = blk.body.find(l => /^Name\s*:/i.test(l));
    if (nameLine) {
      title = nameLine.replace(/^Name\s*:\s*/i, "").trim();
    }
    if (!title) {
      title = blk.heading
        .replace(/^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?\s*/i, "")
        .replace(/^\d+\s*[.)]\s+/, "")
        .trim();
      if (!title) {
        const generic = /^(here (are|is)|some (good|great)|below (are|is))/i;
        title = (blk.body.find(l => !/^Name\s*:/i.test(l) && !generic.test(l)) || "Project Idea")
          .split(/[.:;-]/)[0]
          .slice(0, 120)
          .trim();
      }
    }

    // ---- Extract sections allowing inline content after label ----
    // We'll iterate all label matches (with global regex), record their start line index,
    // capture inline content on the header line, then collect subsequent lines until the next label/idea boundary.
    const sectionMap = new Map(); // canonical -> array of lines

    // Precompute boundary lines that indicate next idea start
    const ideaBoundaryRE = /^(?:Project\s*Idea|Idea)\s*\d+\s*[:\-.)]?|\d+\s*[.)]\s+|Name\s*:/i;
    const allLines = ideaLines.split("\n");

    // Find indices of section headers + inline content
    const headerHits = []; // { lineIdx, canon, inline }
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const m = line.match(new RegExp("^\\s*(" + anyLabelGroup + ")\\s*:\\s*(.*)$", "i"));
      if (m) {
        const canon = toCanonical(m[1]);
        if (canon) headerHits.push({ lineIdx: i, canon, inline: (m[2] || "").trim() });
      }
    }

    // If we found explicit headers, collect their bodies
    if (headerHits.length) {
      for (let h = 0; h < headerHits.length; h++) {
        const { lineIdx, canon, inline } = headerHits[h];
        const nextHeaderLine = (h + 1 < headerHits.length) ? headerHits[h + 1].lineIdx : allLines.length;

        const chunk = [];
        if (inline) chunk.push(inline); // include inline text after the colon as first content

        // Collect subsequent lines until next section header OR idea boundary
        for (let k = lineIdx + 1; k < nextHeaderLine; k++) {
          const L = allLines[k].trim();
          if (!L) continue;
          if (ideaBoundaryRE.test(L)) break; // stop at next idea
          // stop if another section header unexpectedly appears before our computed nextHeaderLine
          const isHeader = new RegExp("^\\s*(" + anyLabelGroup + ")\\s*:\\s*(.*)$", "i").test(L);
          if (isHeader) break;
          chunk.push(L);
        }
        sectionMap.set(canon, chunk);
      }
    }

    // ---- Fallbacks if some sections missing ----
    const filteredBody = blk.body.filter(l => !/^Name\s*:/i.test(l)).map(l => l.trim()).filter(Boolean);

    // 1) General Description: first non-header paragraph
    if (!sectionMap.has("General Description") && filteredBody.length) {
      const firstPara = [];
      for (const L of filteredBody) {
        if (new RegExp("^\\s*(" + anyLabelGroup + ")\\s*:", "i").test(L)) break;
        firstPara.push(L);
        // Stop after a couple of lines for sanity
        if (firstPara.length >= 3) break;
      }
      if (firstPara.length) sectionMap.set("General Description", firstPara);
    }

    // 2) Tech/Budget: lines with $, budget-ish, BOM, stack, parts
    if (!sectionMap.has("Required Technologies & Budget Breakdown")) {
      const techish = filteredBody.filter(x =>
        /\$|\b(budget|cost|costs|bom|bill of materials|stack|tech|parts?)\b/i.test(x)
      );
      if (techish.length) sectionMap.set("Required Technologies & Budget Breakdown", techish);
    }

    // 3) Timeframe: months/weeks/phase/milestones
    if (!sectionMap.has("Timeframe Breakdown")) {
      const tf = filteredBody.filter(x => /\b(months?|weeks?|phase|milestones?)\b/i.test(x));
      if (tf.length) sectionMap.set("Timeframe Breakdown", tf);
    }

    // 4) Skills/Complexity
    if (!sectionMap.has("Complexity & Skills Needed")) {
      const sk = filteredBody.filter(x => /\b(skill|skills|experience|complexity|difficulty)\b/i.test(x));
      if (sk.length) sectionMap.set("Complexity & Skills Needed", sk);
    }

    // 5) Similar Products
    if (!sectionMap.has("Similar Products")) {
      const sp = filteredBody.filter(x => /\b(existing|similar|competitor|competition|product|app|tool|platform)\b/i.test(x));
      if (sp.length) sectionMap.set("Similar Products", sp);
    }

    // 6) Novel Elements
    if (!sectionMap.has("Novel Elements")) {
      const nv = filteredBody.filter(x => /\b(novel|differentiator|innovation|unique|new|original|what'?s new)\b/i.test(x));
      if (nv.length) sectionMap.set("Novel Elements", nv);
    }

    // Compose HTML sections in canonical order
    const sectionsHtml = canonicalOrder.map(label => {
      const lines = sectionMap.get(label) || [];
      return `
        <div class="section-title">${label}<span class="expand-icon">▶</span></div>
        <div class="section-content">${toHtml(lines)}</div>
      `;
    }).join("");

    return `
      <li class="idea-card fade-in">
        <h2>${title || `Project Idea ${idx + 1}`}</h2>
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
