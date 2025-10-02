mod utils;

use thermal_renderer::{
    html_renderer::{HtmlRenderer, ReceiptHtml},
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

// #[wasm_bindgen(getter_with_clone)]
// pub struct OutputBytes {
//     pub output: Vec<Vec<u8>>,
//     pub errors: Vec<String>,
// }

// impl From<RenderOutput<ReceiptHtml>> for OutputBytes {
//     fn from(value: RenderOutput<ReceiptHtml>) -> Self {
//         OutputBytes {
//             output: value.output.iter().map(|o| o.content.clone()).collect(),
//             errors: value.errors.iter().map(|v| format!("{:?}", v)).collect(),
//         }
//     }
// }

#[wasm_bindgen]
pub fn render_to_html(slice: Vec<u8>) -> OutputString {
    HtmlRenderer::render(&slice, None).into()
}

// #[wasm_bindgen]
// pub fn render_to_image(slice: Vec<u8>) -> Output {
//     HtmlRenderer::render(&slice, None).into()
// }
