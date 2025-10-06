import { BitmapFont, Texture } from 'pixi.js'
import { hexToBytes, rgbToBmp } from "./utils.js"
import initialize, { render_to_html, render_to_image } from "./emulator/out/emulator.js"

const jsonUrl = "http://receipt.local:8000/receipt/escpos";

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

function renderImage(handle) {
    const url = URL.createObjectURL(rgbToBmp(handle.bytes, handle.width, handle.height));

    const img = document.createElement("img");
    img.src = url;
    img.classList.add("receipt");
    documentHolder.appendChild(img);
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

    let handle = emulator.render_to_image(bytes);

    for (let error of handle.errors) {
        renderError(error);
    }

    for (let imageHandle of handle.output) {
        renderImage(imageHandle);
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
    render_to_html(bytes) {
        return render_to_html(bytes)
    }

    /**
     * @param {Uint8Array} bytes
     */
    render_to_image(bytes) {
        return render_to_image(bytes)
    }
}
