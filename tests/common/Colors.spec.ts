import { assert } from "chai";
import { parse } from "../../common/Colors.js";

describe("Colors module tests", () => {
	const parseAssert = (color: string, expect: number) =>
		assert.equal(
			parse(color),
			expect,
			`Expected '${color}' to be parsed as 0x${expect
				.toString(16)
				.padStart(8, "0")}`,
		);

	it("should parse #RRGGBBAA family colors correctly", () => {
		parseAssert("#abc", 0xffaabbcc);
		parseAssert("#666", 0xff666666);
		parseAssert("#abcd", 0xddaabbcc);
		parseAssert("#6666", 0x66666666);
		parseAssert("#aabbcc", 0xffaabbcc);
		parseAssert("#b000b5", 0xffb000b5);
		parseAssert("#aabbccdd", 0xddaabbcc);
		parseAssert("#b000b569", 0x69b000b5);
	});

	it("should return 0 on invalid colors", () => {
		parseAssert("#012g", 0);
		parseAssert("#hhhh", 0);
		parseAssert("#hhhhhh", 0);
		parseAssert("#h123456h", 0);
	});

	it("should parse rgba?() function colors correctly", () => {
		parseAssert("rgb(0 128.0 0)", 0xff008000);
		parseAssert("rgb(0% 50% 0%)", 0xff008000);
		parseAssert("rgb(0% 50% 0% / 1)", 0xff008000);
		parseAssert("rgb(0% 50% 0% / 0.5)", 0x80008000);
		parseAssert("rgb(0% 50% 0% / 100%)", 0xff008000);
		parseAssert("rgb(0% 50% 0% / 50%)", 0x80008000);
		parseAssert("rgb(0 128.0 0 / 100%)", 0xff008000);
		parseAssert("rgb(0%, 50%, 0%, 100%)", 0xff008000);
		parseAssert("rgb(0, 128.0, 0, 100%)", 0xff008000);
		parseAssert("rgb(2, 3, 4)", 0xff020304);
		parseAssert("rgb(100%, 0%, 0%)", 0xffff0000);
		parseAssert("rgba(2, 3, 4, 0.5)", 0x80020304);
		parseAssert("rgba(2, 3, 4, 50%)", 0x80020304);
		parseAssert("rgba(2, 3, 4, 100%)", 0xff020304);
		parseAssert("rgba(2, 3, 4, 50%)", 0x80020304);
		parseAssert("rgb(-2, 3, 4)", 0xff000304);
		parseAssert("rgb(100, 200, 300)", 0xff64c8ff);
		parseAssert("rgb(20, 10, 0, -10)", 0x00140a00);
		parseAssert("rgb(100%, 200%, 300%)", 0xffffffff);
	});
});
