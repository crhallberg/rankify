//
// https://thescottyjam.github.io/snap.js/#!/utils/el
//
// https://github.com/johnnesky/imperative-html/blob/main/src/elements-base.ts
// (apply function approach)
//
// https://github.com/vanjs-org/van/blob/main/src/van.js
// (Proxy, arg split, alt set for onclick)
//

/**
 * @param {HTMLElement} el
 */
export function empty(el) {
	while (el.lastChild) {
		el.removeChild(el.lastChild);
	}
}

/**
 * @param {string} html text/html
 * @returns {Array<HTMLDocumentElement>}
 */
export function parseHTML(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	return Array.from(doc.body.children);
}

/**
 * @param {string} html image/svg+xml
 * @returns {HTMLDocumentElement}
 */
export function parseSVG(svg) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(svg, "image/svg+xml");
	return doc.documentElement;
}

/**
 * @param {string} text to be encoded
 * @returns {string}
 */
export function htmlText(text) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, "text/html");
	return doc.body.textContent;
}

/**
 * @param {HTMLElement} el
 * @param {Array<string|HTMLElement|Record<string, string>>} args
 * @returns {HTMLElement}
 */
export function apply(el, args) {
	const [attrs, children] =
		String(args[0]) === "[object Object]"
			? [args[0], args.slice(1)]
			: [{}, args];

	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			try {
				if (key.startsWith("on") && typeof value === "function") {
					el.addEventListener(key.slice(2).toLowerCase(), value);
				} else if (el[key] !== undefined) {
					el[key] = value;
				} else {
					el.setAttribute(key, value);
				}
			} catch (e) {
				// Sometimes attributes are readonly/getters
				el.setAttribute(key, value);
			}
		}
	}

	el.append(...children.flat());
	return el;
}

/**
 * @param {string} tagName
 * @param  {...any} args
 * @returns {SVGElement}
 */
export function svg(tagName, ...args) {
	return apply(
		document.createElementNS("http://www.w3.org/2000/svg", tagName),
		args
	);
}

/**
 * @param {string} tagName
 * @param  {...any} args
 * @returns {HTMLElement}
 */
export function el(tagName, ...args) {
	if (SVG.has(tagName)) {
		return svg(tagName, ...args);
	}

	return apply(document.createElement(tagName), args);
}

export const HTML = new Proxy(
	{
		checkbox: (...args) => apply(el("input", { type: "checkbox" }), args),
		radio: (...args) => apply(el("input", { type: "radio" }), args),
	},
	{
		get(special, name) {
			if (name in special) {
				return special[name];
			}

			if (SVG.has(name)) {
				return (...args) => svg(name, ...args);
			}

			return (...args) => el(name, ...args);
		},
	}
);

const SVG = new Set([
	"animate",
	"animateMotion",
	"animateTransform",
	"circle",
	"clipPath",
	"defs",
	"desc",
	"discard",
	"ellipse",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feDropShadow",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence",
	"filter",
	"foreignObject",
	"g",
	"image",
	"line",
	"linearGradient",
	"marker",
	"mask",
	"metadata",
	"mpath",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"radialGradient",
	"rect",
	"set",
	"stop",
	"svg",
	"switch",
	"symbol",
	"text",
	"textPath",
	"tspan",
	"use",
	"view",
]);

el.tags = HTML;
el.apply = apply;
el.empty = empty;
el.htmlText = htmlText;
el.parseHTML = parseHTML;
el.parseSVG = parseSVG;

el.selectedOption = (selectEl) => {
	return selectEl.options[selectEl.selectedIndex];
};

export default el;
