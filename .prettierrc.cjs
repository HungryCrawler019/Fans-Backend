/** @type {import("prettier").Config} */
const config = {
	tabWidth: 4,
	useTabs: true,
	trailingComma: "all",
	plugins: ["prettier-plugin-prisma"],
};

module.exports = config;
