'use strict'

const DAY_SEC = 86400
const HOUR_SEC = 3600
const MIN_SEC = 3600

function toEpoch(t) {
    return Math.round(t.getTime() / 1000)
}

function fromEpoch(sec) {
    const d = new Date(0)
    d.setUTCSeconds(sec)
    return d
}

function addSecond(t, sec) {
    let epoch = toEpoch(t)
    epoch += sec
    return fromEpoch(epoch)
}

function compare(t1, t2) {
    const diff = t1.getTime() - t2.getTime()

    if (diff < 0) {
        return dateUtil.LESS_THAN
    } else if (diff > 0) {
        return dateUtil.GREATER_THAN
    } else {
        return dateUtil.EQUAL
    }
}

/**
 * getElapsedTime print a formatted time in days, hours, minutes and seconds
 *
 * @param {Date} [t] Since time
 * @return {String} Formatted time
 */
function getElapsedTime(t) {
    // Get diff
    const now = toEpoch(new Date());
    const since = toEpoch(t);
    let elapsedSec = now - since;

    // Get days
    let elapsedDays = "";
    if (elapsedSec > DAY_SEC) {
        const d = Math.floor(elapsedSec / DAY_SEC);
        elapsedSec = elapsedSec % DAY_SEC;
        elapsedDays = `${d}d `;
    }

    // Get hours
    let elapsedHours = "";
    if (elapsedSec > HOUR_SEC) {
        const h = Math.floor(elapsedSec / HOUR_SEC);
        elapsedSec = elapsedSec % HOUR_SEC;
        elapsedHours = `${h}h `;
    }

    // Get minutes
    let elapsedMinutes = "";
    if (elapsedSec > MIN_SEC) {
        const m = Math.floor(elapsedSec / MIN_SEC);
        elapsedSec = elapsedSec % MIN_SEC;
        elapsedMinutes = `${m}h `;
    }

    // Get seconds
    return `${elapsedDays}${elapsedHours}${elapsedMinutes}${elapsedSec}s`;
}

const dateUtil = {
    toEpoch,
    fromEpoch,
    addSecond,
    compare,
    getElapsedTime,
    EQUAL: 0,
    GREATER_THAN: 1,
    LESS_THAN: 2
}


module.exports = dateUtil