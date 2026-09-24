import { describe, expect, it } from "vitest";
import { portraitLayers, recolorPixels } from "./characters.ts";

describe("recolorPixels", () => {
	it("swaps exact colours on opaque pixels only", () => {
		const data = new Uint8Array([0xcc, 0x96, 0x59, 255, 0xcc, 0x96, 0x59, 0, 1, 2, 3, 255]);
		recolorPixels(data, { CC9659: "f7d768" });
		expect([...data]).toEqual([0xf7, 0xd7, 0x68, 255, 0xcc, 0x96, 0x59, 0, 1, 2, 3, 255]);
	});
});

describe("portraitLayers", () => {
	const exists = (file: string) => file !== "Accessories/PG_Accessory_03_Backpack_1.png";

	it("maps sprite layers to their portrait counterparts and drops the outfit", () => {
		const recipe = {
			layers: [
				"Bodies/Body_02.png",
				"Eyes/Eyes_01.png",
				"Outfits/Outfit_14_04.png",
				"Hairstyles/Hairstyle_08_05.png",
				"Accessories/Accessory_03_Backpack_01.png",
				"Accessories/Accessory_15_Glasses_01.png",
			],
		};
		expect(portraitLayers(recipe, exists)).toEqual([
			"Skins/PG_Skin_2.png",
			"Eyes/PG_Eyes_01.png",
			"Hairstyles/PG_Hairstyle_08_5.png",
			"Accessories/PG_Accessory_15_Glasses_1.png",
		]);
	});

	it("uses a layer's own portrait counterpart when it names one", () => {
		const recipe = {
			layers: [
				"Bodies/Body_03.png",
				{ file: "Accessories/Accessory_11_Beanie_01.png", portrait: "Accessories/PG_Accessory_11_Beanie_Small_1.png" },
			],
		};
		expect(portraitLayers(recipe, exists)).toEqual(["Skins/PG_Skin_3.png", "Accessories/PG_Accessory_11_Beanie_Small_1.png"]);
	});

	it("uses explicit portrait layers as they are, and none for `false`", () => {
		expect(portraitLayers({ layers: [], portrait: ["Skins/PG_Skin_1.png"] }, exists)).toEqual(["Skins/PG_Skin_1.png"]);
		expect(portraitLayers({ layers: ["Bodies/Body_01.png"], portrait: false }, exists)).toBeNull();
	});
});
