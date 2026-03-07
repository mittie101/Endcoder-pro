/**
 * Counting semaphore — limits the number of concurrent async operations.
 * Use this to cap CPU/memory pressure from heavy IPC handlers (image processing, password hashing).
 */
class Semaphore {
    constructor(maxConcurrent) {
        this._max = maxConcurrent;
        this._count = 0;
        this._queue = [];
    }

    /** Acquire a slot; resolves immediately if below the limit, otherwise queues. */
    acquire() {
        return new Promise(resolve => {
            if (this._count < this._max) {
                this._count++;
                resolve();
            } else {
                this._queue.push(resolve);
            }
        });
    }

    /** Release a slot; unblocks the next queued waiter if any. */
    release() {
        this._count--;
        if (this._queue.length > 0) {
            this._count++;
            this._queue.shift()();
        }
    }
}

module.exports = { Semaphore };
