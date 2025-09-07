async function generateIdeas() {
  const apiKey = document.getElementById("apiKey").value.trim();
  if (!apiKey) {
    alert("Please enter your Gemini API key in the Configuration section.");
    return;
  }

  const focusAreas = Array.from(document.querySelectorAll(".focus-areas input:checked"))
                         .map(cb => cb.value);

  const data = {
    apiKey: apiKey,
    problem: document.getElementById("problem").value,
    difficulty: document.getElementById("difficulty").value,
    cost: document.getElementById("cost").value,
    complexity: document.getElementById("complexity").value,
    focus: focusAreas
  };

  const outputEl = document.getElementById("output");
  outputEl.innerHTML = "<strong>🤖 Generating ideas...</strong>";

  try {
    const res = await fetch("https://your-serverless-api-url.com/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.ideas && result.ideas.length > 0) {
      outputEl.innerHTML = "";
      result.ideas.forEach((idea, idx) => {
        const card = document.createElement("div");
        card.className = "idea-card";
        card.innerHTML = `
          <h3>${idx+1}. ${idea.title}</h3>
          <ul>
            <li><strong>Description:</strong> ${idea.description}</li>
            <li><strong>Feasibility:</strong> ${idea.feasibility}</li>
          </ul>
        `;
        outputEl.appendChild(card);
      });
    } else {
      outputEl.innerHTML = "<strong>⚠️ No ideas generated. Check your input or API response.</strong>";
    }
  } catch (err) {
    outputEl.innerHTML = `<strong>⚠️ Error generating ideas:</strong> ${err.message}`;
  }
}
