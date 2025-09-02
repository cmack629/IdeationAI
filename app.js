// Grab page elements
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generate");
const outputDiv = document.getElementById("output");

// When the button is clicked
generateBtn.addEventListener("click", () => {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    outputDiv.textContent = "⚠️ Please enter a prompt before generating ideas.";
    return;
  }

  // For now, just echo the prompt back
  outputDiv.textContent = "You entered: \n\n" + prompt;
});
