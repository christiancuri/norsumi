import { describe, expect, it } from "vitest";

import { detectLanguage, languageInstruction } from "./language.js";

describe("detectLanguage", () => {
  it.each([
    [
      "Fastify is a web framework highly focused on providing the best developer experience with the least overhead and a powerful plugin architecture.",
      "English",
    ],
    [
      "Lembrar de comprar pão de queijo e café coado na padaria da esquina amanhã cedo.",
      "Portuguese",
    ],
    [
      "Você não precisa de muito para começar: é só abrir a conta e fazer o primeiro depósito.",
      "Portuguese",
    ],
    [
      "El restaurante está en el centro y los precios son muy buenos, pero hay que reservar.",
      "Spanish",
    ],
    [
      "Nous avons réservé une table pour le dîner dans cette brasserie près du port.",
      "French",
    ],
    [
      "Die Wohnung ist nicht groß, aber sie hat einen schönen Balkon mit Blick auf den Park.",
      "German",
    ],
    [
      "Il ristorante è nel centro e sono anche aperti la domenica per la cena.",
      "Italian",
    ],
  ])("detects %s", (text, expected) => {
    expect(detectLanguage(text)).toBe(expected);
  });

  it("returns null when there is not enough signal", () => {
    expect(detectLanguage("")).toBeNull();
    expect(detectLanguage("npm i fastify")).toBeNull();
    expect(detectLanguage("oat milk")).toBeNull();
  });

  it("builds the prompt instruction with an English fallback", () => {
    expect(
      languageInstruction(
        "The cat is on the table and the dog is in the yard.",
      ),
    ).toContain("Write the title, summary and tags in English");
    expect(languageInstruction("oat milk")).toContain("otherwise in English");
  });
});
