mod utils;

use thermal_renderer::{
    html_renderer::{HtmlRenderer, ReceiptHtml},
    image_renderer::{ImageRenderer, ReceiptImage},
    renderer::{RenderError, RenderErrorKind, RenderOutput},
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(getter_with_clone)]
pub struct OutputString {
    pub output: Vec<String>,
    pub errors: Vec<String>,
}

impl From<RenderOutput<ReceiptHtml>> for OutputString {
    fn from(value: RenderOutput<ReceiptHtml>) -> Self {
        OutputString {
            output: value.output.iter().map(|o| o.content.clone()).collect(),
            errors: value.errors.iter().map(|v| format!("{:?}", v)).collect(),
        }
    }
}

#[wasm_bindgen(getter_with_clone)]
pub struct OutputBytes {
    pub output: Vec<OutputImage>,
    pub errors: Vec<String>,
}

#[wasm_bindgen(getter_with_clone)]
#[derive(Clone)]
pub struct OutputImage {
    pub width: u32,
    pub height: u32,
    pub bytes: Vec<u8>,
}

impl From<&ReceiptImage> for OutputImage {
    fn from(value: &ReceiptImage) -> Self {
        OutputImage {
            width: value.width,
            height: value.height,
            bytes: value.bytes.clone(),
        }
    }
}

impl From<RenderOutput<ReceiptImage>> for OutputBytes {
    fn from(value: RenderOutput<ReceiptImage>) -> Self {
        OutputBytes {
            output: value.output.iter().map(|o| o.into()).collect(),
            errors: value.errors.iter().map(|v| format!("{:?}", v)).collect(),
        }
    }
}

#[wasm_bindgen]
pub fn render_to_html(slice: Vec<u8>) -> OutputString {
    HtmlRenderer::render(&slice, None).into()
}

#[wasm_bindgen]
pub fn render_to_image(slice: Vec<u8>) -> OutputBytes {
    ImageRenderer::render(&slice, None).into()
}
