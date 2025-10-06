import { BitmapFont, Texture } from "pixi.js";
import {
  hexToBytes,
  rgbToBmp,
  returnFileSize,
  validFileType,
} from "./utils.js";
import initialize, {
  render_to_html,
  render_to_image,
} from "./emulator/out/emulator.js";

const jsonUrl = "http://receipt.local:8000/receipt/escpos";

/**
 * @param {Uint8Array} value
 */
async function sendToPrinter(value) {
  try {
    const response = await fetch(jsonUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  const url = URL.createObjectURL(
    rgbToBmp(handle.bytes, handle.width, handle.height)
  );

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
    return;
  }

  let handle = emulator.render_to_image(bytes);

  for (let error of handle.errors) {
    renderError(error);
  }

  for (let imageHandle of handle.output) {
    renderImage(imageHandle);
  }
}

function updateImagePreview(imageInput, preview) {
  // clear previous preview
  while (preview.firstChild) {
    preview.removeChild(preview.firstChild);
  }

  const files = imageInput.files;
  if (files === 0) {
    const para = document.createElement("p");
    para.textContent = "No file currently selected for upload";
    preview.appendChild(para);
  } else {
    const file = files[0];
    const imageItem = document.createElement("div");
    preview.appendChild(imageItem);

    const para = document.createElement("p");
    if (validFileType(file)) {
      para.textContent = `File name ${file.name}, file size ${returnFileSize(
        file.size
      )}.`;
      const image = document.createElement("img");
      image.src = URL.createObjectURL(file);
      image.alt = image.title = file.name;

      imageItem.appendChild(image);
      imageItem.appendChild(para);
    } else {
      para.textContent = `File name ${file.name}: Not a valid file type. Update your selection.`;
      imageItem.appendChild(para);
    }
  }
}

// TODO: get this working
function convertImage(imageFile) {
  var img = document.createElement("img");
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  var data = "";

  const file = imageFile.files[0];
  console.log(imageFile.files);
  img.src = URL.createObjectURL(file);
  console.log(img.height);

  canvas.height = img.height;
  canvas.width = img.width;
  ctx.drawImage(img, 0, 0);
  data = ctx.getImageData(0, 0, img.width, img.height);
  console.log("IMG DATA");
  console.log(data);
}

document.addEventListener("DOMContentLoaded", async () => {
  const textInput = document.getElementById("textInput");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");

  // For now, grab image rendered directly in HTML and use that data
  const actualImg = document.getElementById("actualImg");
  console.log(actualImg);

  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  var width = actualImg.width;
  var height = actualImg.height;

  canvas.height = height;
  canvas.width = width;
  ctx.drawImage(actualImg, 0, 0);
  var data = ctx.getImageData(0, 0, actualImg.width, actualImg.height).data;
  console.log("IMG DATA");
  console.log(data);

  var bits = [];
  var paddedWidth = Math.floor((width + 7) / 8) * 8;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < paddedWidth; x++) {
      if (x >= width) {
        bits[bits.length - 1] = bits[bits.length - 1] << 1;
        continue;
      }
      var r = data[y * width * 4 + x * 4];
      if (x % 8 === 0) {
        bits.push(0);
      } else {
        bits[bits.length - 1] = bits[bits.length - 1] << 1;
      }

      if (r < 127) {
        bits[bits.length - 1] = bits[bits.length - 1] | 1;
      }
    }
  }
  const bitArray = new Uint8Array(bits);
  console.log(bitArray);
  console.log("length: " + bitArray.length);
  console.log(bitArray.toHex());
  // End bespoke code zone

  // TODO: get this working
  imageInput.addEventListener("change", () => {
    updateImagePreview(imageInput, imagePreview);
    convertImage(imageInput);
  });

  document.getElementById("form").addEventListener("submit", (e) => {
    e.preventDefault();
    sendToPrinter(hexToBytes(textInput.value));
  });

  let emulator = await Emulator.load();

  textInput.addEventListener("input", () => {
    console.log("text changed");
    rerender(emulator, textInput.value);
  });
});

// Emulator hooks

class Emulator {
  static async load() {
    await initialize();

    return new Emulator();
  }

  /**
   * @param {Uint8Array} bytes
   */
  render_to_html(bytes) {
    return render_to_html(bytes);
  }

  /**
   * @param {Uint8Array} bytes
   */
  render_to_image(bytes) {
    return render_to_image(bytes);
  }
}
