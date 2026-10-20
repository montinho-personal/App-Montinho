// Extração do texto do PDF (só no servidor). unpdf = pdf.js para serverless.
import { extractText, getDocumentProxy } from "unpdf";

export async function textoDoPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return (Array.isArray(text) ? text : [text]).join("\n");
}
