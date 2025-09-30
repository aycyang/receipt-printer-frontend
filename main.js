let textInput;

async function sendToPrinter(e) {
    e.preventDefault();
    const command = textInput.value;
    console.log("sending: " + command)

    // TODO actually send command to printer as bytes
    try {
        const response = await fetch("https://example.org/post", {
            method: "POST",
            body: JSON.stringify({ username: "example" }),
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        console.log(result);
    } catch (error) {
        console.error(error.message);
    }
}

function init() {
    document.getElementById("form").addEventListener("submit", sendToPrinter);
    textInput = document.getElementById("textInput");
}

document.addEventListener("DOMContentLoaded", () => {
    init();
});