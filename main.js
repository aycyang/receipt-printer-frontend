import { hexToBytes } from "./parse.js"
import initialize, { render_to_html } from "./emulator/out/emulator.js"

const jsonUrl = "http://receipt.local:8000/receipt/escpos";
const cutUrl = "http://receipt.local:8000/receipt/cut";

/**
 * @param {Uint8Array} value 
 */
async function sendToPrinter(value) {
    try {
        const response = await fetch(jsonUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ buffer: value.toBase64() }),
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

function renderError(error) {
    let holder = document.createElement("div");
    holder.classList.add("error");
    let span = document.createElement("span");

    span.innerText = error;

    holder.appendChild(span);
    errorHolder.appendChild(holder);
}

function renderDocument(html) {
    console.log(html);

    let uri = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    let frame = document.createElement("iframe");
    frame.src = uri;

    frame.width = "1000px";
    frame.height = "1000px";

    documentHolder.appendChild(frame);
}

function rerender(emulator, input) {
    let bytes;

    // clear holders
    errorHolder.innerHTML = "";
    documentHolder.innerHTML = "";

    try {
        bytes = hexToBytes(textInput.value);
    } catch (err) {
        renderError(String(err));
        return
    }

    let handle = emulator.render(bytes);

    for (let error of handle.errors) {
        renderError(error);
    }

    for (let document of handle.output) {
        renderDocument(document);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const textInput = document.getElementById("textInput");

    document.getElementById("form").addEventListener("submit", (e) => {
        e.preventDefault();
        sendToPrinter(hexToBytes(textInput.value));
    });

    let emulator = await Emulator.load();

    textInput.addEventListener("input", () => {
        rerender(emulator, textInput.value)
    })
});

// Emulator hooks

class Emulator {
    static async load() {
        await initialize();

        return new Emulator;
    }

    /**
     * @param {Uint8Array} bytes
     */
    render(bytes) {
        return render_to_html(bytes)
    }
}