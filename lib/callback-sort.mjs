/**
 * @template T
 * @typedef {(number) => void} PromiseResolveFn
 * @typedef {(T, T, PromiseResolveFn, T[], number, number} CallbackCompareFn
 */

const NOOP = () => {};

const LEFT_FIRST = -1;
const RIGHT_FIRST = 1;
const EQUAL = 0;

const SIFT_LEFT = -1;
const STAY = 0;
const SIFT_RIGHT = 1;

let askCallCount = 0;
async function askSortDir(fn) {
	askCallCount += 1;
	const dir = await new Promise((resolve) => fn(resolve));
	return dir === 0 ? EQUAL : dir < 0 ? LEFT_FIRST : RIGHT_FIRST;
}
export function getCallCount() {
	return askCallCount;
}
export function resetCallCount() {
	askCallCount = 0;
}

export async function callbackMergeSort(arr, fn) {
	if (arr.length <= 1) {
		return arr;
	}

	let left = [];
	let right = [];

	let middle = Math.floor(arr.length / 2);
	let center = [arr[middle]];

	async function next(index) {
		if (index === arr.length) {
			console.log(left, center, right);

			let leftSorted = await callbackMergeSort(left, fn);
			let rightSorted = await callbackMergeSort(right, fn);

			return leftSorted.concat(center).concat(rightSorted);
		}

		if (index === middle) {
			return () => next(index + 1); // thunk
		}

		const dir = await new Promise((resolve) => {
			fn(arr[index], center[0], resolve);
		});

		el.empty(askEl);

		if (dir === LEFT_FIRST) {
			left.push(arr[index]);
		} else if (dir === RIGHT_FIRST) {
			right.push(arr[index]);
		} else {
			center.push(arr[index]);
		}

		return () => next(index + 1); // thunk
	}

	// Trampoline

	let thunk = await next(0);
	while (typeof thunk === "function") {
		thunk = await thunk();
	}
	return thunk;
}

// Heap

function indexOfParent(index) {
	return Math.floor((index - 1) / 2);
}
function indexOfLeftChild(index) {
	return index * 2 + 1;
}
function indexOfRightChild(index) {
	return index * 2 + 2;
}

function isMinHeap(heap, msg = "") {
	for (let i = 1; i < heap.length; i++) {
		if (heap[indexOfParent(i)] > heap[i]) {
			console.log("❌", msg, heap);
			return false;
		}
	}
	return true;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} topCount
 * @param {CallbackCompareFn<T>} fn
 * @returns {T[]}
 */
export async function callbackRankify(
	arr,
	topCount,
	compareFn,
	ranked = [],
	progressFn = NOOP,
) {
	let heap = arr;
	const limit = Math.min(topCount, arr.length);

	// Heapify

	if (ranked.length === 0) {
		heap = await callbackHeapify(arr, compareFn);

		// isMinHeap(heap, "after heapify");
		progressFn(heap, [], topCount);
	}

	// Heap Pop

	while (ranked.length < limit) {
		const [top, slice] = await callbackHeapPop(heap, compareFn);
		ranked.push(top);
		heap = slice;

		// isMinHeap(heap, "after pop");
		progressFn(heap, ranked, topCount);
	}

	return [ranked, heap];
}

/**
 * @template T
 * @param {T[]} arr
 * @param {CallbackCompareFn<T>} fn
 * @param {number=} root
 * @param {boolean=} skip
 * @returns {T[]}
 */
export async function callbackHeapify(arr, fn, { binarySkip = false } = {}) {
	const lastParentIndex = indexOfParent(arr.length - 1);
	const queue = new Array(lastParentIndex + 1)
		.fill(null)
		.map((_, index) => index);

	while (queue.length > 0) {
		const parentIndex = queue.pop();
		const destination = await callbackHeapSiftDown(arr, parentIndex, fn);
		if (parentIndex !== destination) {
			swapMut(arr, parentIndex, destination);
			queue.push(destination);
		}
	}

	return arr;
}

async function callbackHeapPop(heap, fn) {
	if (heap.length === 1) {
		return [heap[0], []];
	}

	const top = heap.shift();
	const tree = [heap.at(-1)].concat(heap.slice(0, -1));

	let current = 0;
	const lastParentIndex = indexOfParent(tree.length - 1);
	while (current <= lastParentIndex) {
		const smallestIndex = await callbackHeapSiftDown(tree, current, fn);
		if (current === smallestIndex) {
			break;
		}

		swapMut(tree, current, smallestIndex);
		current = smallestIndex;
	}

	return [top, tree];
}

export async function callbackHeapSiftDown(arr, parentIndex, fn) {
	const leftIndex = indexOfLeftChild(parentIndex);
	const rightIndex = indexOfRightChild(parentIndex);

	if (leftIndex >= arr.length) {
		return parentIndex;
	}

	let childDir = LEFT_FIRST;
	if (rightIndex < arr.length) {
		childDir = await askSortDir((resolve) => {
			fn(arr[leftIndex], arr[rightIndex], resolve, arr, leftIndex, rightIndex);
		});
	}

	const childIndex = childDir === LEFT_FIRST ? leftIndex : rightIndex;

	const swapDir = await askSortDir((resolve) => {
		fn(
			arr[parentIndex],
			arr[childIndex],
			resolve,
			arr,
			parentIndex,
			childIndex,
		);
	});

	return swapDir === RIGHT_FIRST ? childIndex : parentIndex;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {CallbackCompareFn<T>} fn
 * @param {number=} start
 * @returns {T[]}
 */
export async function callbackHeapifyDown(arr, fn, start = 0) {
	const parent = (index) => Math.floor((index - 1) / 2);

	async function next(index) {
		if (index >= arr.length) {
			return arr;
		}

		let parentIndex = parent(index);
		const dir = askSortDir((resolve) => {
			fn(arr[parentIndex], arr[index], resolve, arr, parentIndex, index);
		});

		if (dir === RIGHT_FIRST) {
			swapMut(arr, parentIndex, index);
		}

		return () => next(index + 1); // thunk
	}

	let unroll = trampoline(next);
	return await unroll(start);
}

// Utilities

function swapMut(arr, a, b) {
	let t = arr[a];
	arr[a] = arr[b];
	arr[b] = t;
}

function trampoline(startFn) {
	return async (...args) => {
		let thunk = await startFn(...args);
		while (typeof thunk === "function") {
			thunk = await thunk();
		}
		return thunk;
	};
}
