let textInput;

async function sendToPrinter(e) {
    e.preventDefault();
    const command = textInput.value;
    console.log("sending: " + command)
    const jsonUrl = "http://receipt.local:8000/receipt/escpos";

    const encodedCommand = btoa(command) // encode to base 64

    try {
        const response = await fetch(jsonUrl, {
            method: "POST",
            headers: {"Content-Type": "application/json",},
            body: JSON.stringify({ buffer: encodedCommand}),
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