let textInput;

async function sendToPrinter(e) {
    e.preventDefault();
    const command = textInput.value;
    console.log("sending: " + command)
    const jsonUrl = "http://receipt.local:8000/receipt/escpos";
    const cutUrl = "http://receipt.local:8000/receipt/cut";

    const hexMap = {
        '0': 0,
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        'a': 10,
        'b': 11,
        'c': 12,
        'd': 13,
        'e': 14,
        'f': 15,
    }
    const bytes = command.split(" ").map(x => {
        // assume x is two characters
        const first = x[0].toLowerCase()
        const second = x[1].toLowerCase()
        return hexMap[first] * 16 + hexMap[second]
    })
    console.log("bytes: " + bytes)
    const encodedBytes = new Uint8Array(bytes)
    console.log("encodedBytes: " + encodedBytes)

    // hello: 48 65 6C 6C 6F 0a 0d

    try {
        const response = await fetch(jsonUrl, {
            method: "POST",
            headers: {"Content-Type": "application/json",},
            body: JSON.stringify({ buffer: encodedBytes.toBase64()}),
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        console.log(result);
    } catch (error) {
        console.error(error.message);
    }

    try {
        const response = await fetch(cutUrl, {
            method: "POST",
            // headers: {"Content-Type": "application/json",},
            // body: JSON.stringify({ buffer: encodedBytes.toBase64()}),
        });
    } catch (e) {
        console.error(e)
    }
}

function init() {
    document.getElementById("form").addEventListener("submit", sendToPrinter);
    textInput = document.getElementById("textInput");
}

document.addEventListener("DOMContentLoaded", () => {
    init();
});