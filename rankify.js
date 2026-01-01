/**
 * @TODO: arrow keys
 * @TODO: restore progress
 * @TODO: delete progress
 */

import { callbackRankify } from "./lib/callback-sort.module.js";
import el from "./lib/el.module.js";

// Mode: Edit

const editTextarea = document.getElementById("edit-textarea");
const compProseEl = document.getElementById("comp-prose");
const numberInput = document.getElementById("top-number");

function calcChoices(topCount, itemCount) {
	return 2 * itemCount + Math.ceil(2 * topCount * Math.log(itemCount));
}

function getCountTarget() {
	return Number(numberInput.value ?? 0);
}
function getCountType() {
	return document.querySelector('[name="top-by"]:checked').value;
}

function getTopCount(itemCount, countTarget) {
	if (getCountType() === "count") {
		return Math.min(itemCount, countTarget);
	}

	return Math.ceil(itemCount * countTarget / 100);
}

function updateCounts() {
	const items = editTextarea.value.trim();
	const itemCount = items ? (items.match(/\n+/g)?.length ?? 0) + 1 : 0;

	const countType = getCountType();
	if (countType === "count") {
		numberInput.value = Math.max(1, Math.min(getCountTarget(), itemCount));
	} else {
		numberInput.value = Math.max(1, Math.min(getCountTarget(), 100));
	}

	if (itemCount < 2) {
		compProseEl.innerHTML = "Add a few more items to get started.";
		return;
	}

	const countTarget = getCountTarget();
	const topCount = getTopCount(itemCount, countTarget);

	compProseEl.innerHTML = compProse(topCount, itemCount);
}

function compProse(topCount, itemCount) {
	if (itemCount < 2) {
		return "Add a few more items to get started.";
	}

	const compCount = calcChoices(topCount, itemCount);

	if (topCount === itemCount) {
		return `You will need to make <strong>approx. ${compCount.toLocaleString()} choices</strong> to rank <strong>all your items</strong>.`;
	}

	if (topCount === 1) {
		return `You will need to make <strong>approx. ${compCount.toLocaleString()} choices</strong> to find your <strong>top item</strong>.`;
	}

	return `You will need to make <strong>approx. ${compCount.toLocaleString()} choices</strong> to rank your <strong>top ${topCount.toLocaleString()} items</strong>.`;
}

function switchToEdit() {
	console.log("mode--edit");
	document.body.className = "mode--edit";

	editTextarea.value = "";

	updateCounts();
}

editTextarea.addEventListener("input", updateCounts);
numberInput.addEventListener("input", updateCounts);
document.getElementById("submit-edit").addEventListener("click", switchToRank);

for (const radio of document.querySelectorAll('[name="top-by"]')) {
	radio.addEventListener("change", () => {
		if (radio.checked) {
			updateCounts();
		}
	});
}

// Mode: Rank

function switchToRank(state) {
	console.log("mode--rank");
	document.body.className = "mode--rank";

	let items = state.heap;

	if (!items) {
		const text = editTextarea.value;
		items = text.split("\n").map((item) => item.trim()).filter(Boolean);
		items.sort(() => Math.random() - 0.5); // shuffle
	}
	const topCount = state.topCount ?? getTopCount(items.length, getCountTarget());
	const ranked = state.ranked ?? [];

	heapify(items, topCount, ranked);
}

const rankingChoiceOutput = document.getElementById("choice-num-output");
const rankingChoicesCountOutput = document.getElementById(
	"choices-count-output",
);
const rankingRankedOutput = document.getElementById("ranked-output");
const rankingTopCountOutput = document.getElementById("top-item-output");

let rankedCount;
async function heapify(items, topCount, ranked = []) {
	rankingChoicesCountOutput.value = calcChoices(topCount, items.length);
	rankingTopCountOutput.value = topCount;

	// Heapify

	saveState({ heap: items, ranked, topCount });

	rankedCount = 0;
	const [topItems, remainder] = await callbackRankify(
		items,
		topCount,
		heapifyStep,
		ranked,
		(heap, ranked) => {
			saveState({ heap, ranked, topCount });
			rankingRankedOutput.value = ranked.length;
		},
	);

	switchToResults(topItems.concat(remainder), topCount);
}

let choiceNumber = 0;
let leftChoice = document.getElementById("choice-left");
let rightChoice = document.getElementById("choice-right");
function heapifyStep(left, right, callback, heap, _, index) {
	let { button } = el.tags;

	let leftBtn = button({ class: "choice-btn", type: "button" }, left);
	leftBtn.addEventListener("click", () => callback(-1));

	let rightBtn = button({ class: "choice-btn", type: "button" }, right);
	rightBtn.addEventListener("click", () => callback(1));

	leftChoice.replaceChildren(leftBtn);
	rightChoice.replaceChildren(rightBtn);

	rankingRankedOutput.value = rankedCount;
	rankingChoiceOutput.value = ++choiceNumber;
}

// Keybinding

document.addEventListener("keydown", (event) => {
	switch (event.key) {
		case "ArrowLeft": {
			const btn = leftChoice.querySelector(".choice-btn");
			if (btn) btn.click();
			break;
		}
		case "ArrowRight": {
			const btn = rightChoice.querySelector(".choice-btn");
			if (btn) btn.click();
			break;
		}
	}
});

// State

const stateKey = "rankify-state";
function saveState(state) {
	localStorage.setItem(stateKey, JSON.stringify(state));
}
function loadState(state) {
	return JSON.parse(localStorage.getItem(stateKey) ?? "null");
}

// Mode: Results

async function switchToResults(ranked, topCount) {
	console.log("mode--results");
	document.body.className = "mode--results";

	let { li } = el.tags;
	let resultList = document.getElementById("result-list");
	resultList.replaceChildren(
		...ranked.map((item, index) => {
			if (topCount === ranked.length || index < topCount) {
				return li({ class: "ranked-result" }, item);
			}
			return li(item);
		}),
	);
}

// === MAIN ===

updateCounts();

window.addEventListener("pageshow", () => {
	const state = loadState();

	if (state?.current) {
		return;
	}

	if (state) {
		if (state.ranked.length === state.topCount) {
			if (confirm("Would you like to see your results from last time?")) {
				switchToResults(
					state.ranked.concat(state.heap),
					state.topCount,
				);
			}
			return;
		}

		const itemCount = state.heap.length + state.ranked.length;
		if (
			confirm(
				`You were in the middle of ranking the top ${state.topCount} of ${itemCount} items. You'd finished ranking the top ${state.ranked.length}. Would you like to continue?`,
			)
		) {
			switchToRank(state);
		}
	}
});

document.getElementById("clear-btn").addEventListener("click", () => {
	localStorage.removeItem(stateKey);
	switchToEdit();
});
