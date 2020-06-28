'use strict'

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

const dateUtil = {
    toEpoch,
    fromEpoch,
    addSecond,
    compare,
    EQUAL: 0,
    GREATER_THAN: 1,
    LESS_THAN: 2
}


module.exports = dateUtil