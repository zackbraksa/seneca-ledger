"use strict";
/* Copyright © 2022 Seneca Project Contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
/* NOTES
 * oref, aref, bref are mostly for human repl convenience
 *
 * Unique constraints:
 * ledger/account: aref
 */
function ledger(options) {
    const seneca = this;
    const accountCanon = options.entity.base + '/account';
    const bookCanon = options.entity.base + '/book';
    const debitCanon = options.entity.base + '/debit';
    const creditCanon = options.entity.base + '/credit';
    const balanceCanon = options.entity.base + '/balance';
    const makeRef = seneca.util.Nid({ length: 16 });
    seneca
        .fix('biz:ledger')
        .message('create:account', msgCreateAccount)
        .message('get:account', msgGetAccount)
        .message('list:account', msgListAccount)
        .message('update:account', msgUpdateAccount)
        .message('list:account', msgListAccount)
        .message('balance:account', msgBalanceAccount)
        .message('create:book', msgCreateBook)
        .message('get:book', msgGetBook)
        .message('update:book', msgUpdateBook)
        .message('list:book', msgListBook)
        .message('list:balance', msgListBalance)
        .message('balance:book', msgBalanceBook)
        .message('create:entry', msgCreateEntry)
        .message('void:entry', msgVoidEntry)
        .message('list:entry', msgListEntry);
    async function msgCreateAccount(msg) {
        let seneca = this;
        let account = msg.account;
        if (null == account) {
            return { ok: false, why: 'no-account' };
        }
        let oref = null == account.oref ? account.org_id : account.oref;
        let org_id = null == account.org_id ? account.oref : account.org_id;
        if (null == org_id) {
            return { ok: false, why: 'no-org' };
        }
        let name = account.name;
        if (null == name || '' == name) {
            return { ok: false, why: 'no-name' };
        }
        let path = ('string' === typeof account.path ? account.path.split('/') :
            account.path) || [];
        let pathParts = Array(options.path.partSize).fill(null)
            .reduce(((a, _, i) => (a['path' + i] = null == path[i] ? '' : path[i], a)), {});
        let aref = account.oref + '/' + path.join('/') + '/' + name;
        let normal = account.normal;
        if ('credit' !== normal && 'debit' !== normal) {
            return { ok: false, why: 'invalid-normal' };
        }
        let accountEnt = await seneca.entity(accountCanon).data$({
            id$: account.id$,
            ...pathParts,
            org_id,
            oref,
            aref,
            path,
            name,
            normal,
        }).save$();
        return { ok: true, account: accountEnt.data$(false) };
    }
    async function msgGetAccount(msg) {
        let seneca = this;
        let accountEnt = await getAccount(seneca, accountCanon, msg);
        if (null == accountEnt) {
            return { ok: false, why: 'account-not-found' };
        }
        return { ok: true, account: accountEnt.data$(false) };
    }
    async function msgListAccount(msg) {
        let seneca = this;
        let org_id = null == msg.org_id ? msg.oref : msg.org_id;
        let q = {};
        if (null != org_id) {
            q.org_id = org_id;
        }
        let list = await seneca.entity(accountCanon).list$(q);
        list = list.map((ent) => ent.data$(false));
        return { ok: true, q, list };
    }
    async function msgUpdateAccount(msg) {
        let seneca = this;
        let accountEnt = await getAccount(seneca, accountCanon, msg);
        if (null == accountEnt) {
            return { ok: false, why: 'account-not-found' };
        }
        if (null == msg.account) {
            return { ok: false, why: 'no-account-update' };
        }
        await accountEnt.data$(msg.account).save$();
        return { ok: true, account: accountEnt.data$(false) };
    }
    // TODO: save to ledger/balance by book, default but optional
    async function msgBalanceAccount(msg) {
        let seneca = this;
        let accountEnt = await getAccount(seneca, accountCanon, msg);
        if (null == accountEnt) {
            return { ok: false, why: 'account-not-found' };
        }
        let bookEnt = await getBook(seneca, bookCanon, msg);
        if (null == bookEnt) {
            return { ok: false, why: 'book-not-found' };
        }
        let cq = {
            credit_id: accountEnt.id,
            book_id: bookEnt.id,
        };
        let dq = {
            debit_id: accountEnt.id,
            book_id: bookEnt.id,
        };
        let credits = await seneca.entity(creditCanon).list$(cq);
        let debits = await seneca.entity(debitCanon).list$(dq);
        // let creditTotal = credits.map((entry: any) => entry.val)
        //   .reduce((total: number, val: number) => val + total, 0)
        // let debitTotal = debits.map((entry: any) => entry.val)
        //   .reduce((total: number, val: number) => val + total, 0)
        // let balance = 'credit' === accountEnt.normal ? creditTotal - debitTotal :
        //   debitTotal - creditTotal
        let totals = calcTotals(accountEnt, credits, debits);
        let out = {
            ok: true,
            ...totals,
            account_id: accountEnt.id,
            aref: accountEnt.aref,
            book_id: bookEnt.id,
            bref: bookEnt.bref,
            start: bookEnt.start,
            end: bookEnt.end,
            // creditTotal: creditTotal,
            // debitTotal: debitTotal,
            // balance,
            creditCount: credits.length,
            debitCount: debits.length,
            normal: accountEnt.normal,
        };
        return out;
    }
    async function msgCreateBook(msg) {
        let seneca = this;
        let book = msg.book;
        if (null == book) {
            return { ok: false, why: 'no-book' };
        }
        let start = book.start;
        if (null == start) {
            return { ok: false, why: 'no-start' };
        }
        let oref = null == book.oref ? book.org_id : book.oref;
        let org_id = null == book.org_id ? book.oref : book.org_id;
        if (null == org_id) {
            return { ok: false, why: 'no-org' };
        }
        let end = book.end || -1;
        let time = book.time || { kind: 'basic' };
        let name = book.name;
        if (null == name || '' == name) {
            return { ok: false, why: 'no-name' };
        }
        let bref = oref + '/' + name + '/' + start;
        let bookEnt = await seneca.entity(bookCanon).data$({
            id$: book.id$,
            org_id,
            oref,
            bref,
            name,
            start,
            end,
            time,
        }).save$();
        return { ok: true, book: bookEnt.data$(false) };
    }
    async function msgGetBook(msg) {
        let seneca = this;
        let bookEnt = await getBook(seneca, bookCanon, msg);
        if (null == bookEnt) {
            return { ok: false, why: 'book-not-found' };
        }
        return { ok: true, book: bookEnt.data$(false) };
    }
    async function msgListBook(msg) {
        let seneca = this;
        let org_id = null == msg.org_id ? msg.oref : msg.org_id;
        let q = {};
        if (null != org_id) {
            q.org_id = org_id;
        }
        let list = await seneca.entity(bookCanon)
            .list$(q);
        list = list.map((ent) => ent.data$(false));
        return { ok: true, q, list };
    }
    async function msgUpdateBook(msg) {
        let seneca = this;
        let bookEnt = await getBook(seneca, bookCanon, msg);
        if (null == bookEnt) {
            return { ok: false, why: 'book-not-found' };
        }
        if (null == msg.book) {
            return { ok: false, why: 'no-book-update' };
        }
        await bookEnt.data$(msg.book).save$();
        return { ok: true, book: bookEnt.data$(false) };
    }
    async function msgListBalance(msg) {
        // TODO: list ledger/balance for book
    }
    async function msgBalanceBook(msg) {
        // TODO: for all accounts in book (from entries), balance account,
        // and save to ledger/balance
    }
    // TODO: mark ledger/balance stale
    async function msgCreateEntry(msg) {
        let seneca = this;
        let out = { ok: false };
        let debit = msg.debit || { aref: msg.daref };
        let credit = msg.credit || { aref: msg.caref };
        let bookEnt = await getBook(seneca, bookCanon, msg);
        if (null == bookEnt) {
            return { ok: false, why: 'book-not-found' };
        }
        let debitAccountEnt = await getAccount(seneca, accountCanon, {
            ...debit
        });
        if (null == debitAccountEnt) {
            return { ok: false, why: 'debit-account-not-found' };
        }
        let creditAccountEnt = await getAccount(seneca, accountCanon, {
            ...credit
        });
        if (null == creditAccountEnt) {
            return { ok: false, why: 'credit-account-not-found' };
        }
        let val = msg.val;
        if (null == val) {
            return { ok: false, why: 'no-val' };
        }
        // If derived from a base currency
        let baseval = msg.baseval || -1;
        let basecur = msg.basecur || '---'; // currency code, EUR, GBP, USD, etc
        let baserate = msg.baserate || 0;
        let desc = msg.desc;
        if (null == desc || '' === desc) {
            return { ok: false, why: 'no-desc' };
        }
        let date = msg.date;
        if (null == date) {
            return { ok: false, why: 'no-date' };
        }
        let kind = msg.kind || 'standard';
        // custom data
        let custom = msg.custom || {};
        let customFields = 'object' === typeof msg.entry ? msg.entry : {};
        let sharedEntry = {
            ...customFields,
            id$: msg.id,
            ref: makeRef(),
            val,
            desc,
            kind,
            oref: bookEnt.oref,
            org_id: bookEnt.org_id,
            bref: bookEnt.bref,
            book_id: bookEnt.id,
            custom,
            baseval,
            basecur,
            baserate,
        };
        let creditEntry = {
            ...sharedEntry,
            credit_id: creditAccountEnt.id,
            caref: creditAccountEnt.aref,
        };
        let debitEntry = {
            ...sharedEntry,
            debit_id: debitAccountEnt.id,
            daref: debitAccountEnt.aref,
        };
        let creditEnt = await seneca.entity(creditCanon).data$(creditEntry).save$();
        debitEntry.id$ = creditEnt.id;
        let debitEnt = await seneca.entity(debitCanon).data$(debitEntry).save$();
        out.ok = true;
        out.credit = creditEnt.data$(false);
        out.debit = debitEnt.data$(false);
        return out;
    }
    async function msgVoidEntry(msg) {
        // TODO: generate counter entries
    }
    async function msgListEntry(msg) {
        let seneca = this;
        let q = msg.q || {};
        if (null == msg.oref) {
            return { ok: false, why: 'org-required' };
        }
        q.oref = msg.oref;
        let bookEnt = await getBook(seneca, bookCanon, msg);
        if (null != bookEnt) {
            q.book_id = bookEnt.id;
        }
        let accountEnt = await getAccount(seneca, accountCanon, msg);
        let credits = [];
        let cq = { ...q };
        if (null != accountEnt) {
            cq.credit_id = accountEnt.id;
        }
        if (null == msg.credit || !!msg.credit) {
            credits = await seneca.entity(creditCanon).list$(cq);
            credits = credits.map((entry) => entry.data$(false));
        }
        let debits = [];
        let dq = { ...q };
        if (null != accountEnt) {
            dq.debit_id = accountEnt.id;
        }
        if (null == msg.debit || !!msg.debit) {
            debits = await seneca.entity(debitCanon).list$(dq);
            debits = debits.map((entry) => entry.data$(false));
        }
        let totals = calcTotals(accountEnt, credits, debits);
        let out = {
            ok: true,
            ...totals,
            credits,
            debits,
            cq,
            dq,
        };
        return out;
    }
}
async function getBook(seneca, bookCanon, msg) {
    let bookEnt = null;
    if (null != msg.bref) {
        bookEnt = await seneca.entity(bookCanon).load$({ bref: msg.bref });
    }
    if (null == bookEnt && null != msg.id) {
        bookEnt = await seneca.entity(bookCanon).load$(msg.id);
    }
    if (null == bookEnt && null != msg.book_id) {
        bookEnt = await seneca.entity(bookCanon).load$(msg.book_id);
    }
    return bookEnt;
}
async function getAccount(seneca, accountCanon, msg) {
    let accountEnt = null;
    if (null != msg.aref) {
        accountEnt = await seneca.entity(accountCanon).load$({ aref: msg.aref });
    }
    if (null == accountEnt && null != msg.id) {
        accountEnt = await seneca.entity(accountCanon).load$(msg.id);
    }
    if (null == accountEnt && null != msg.account_id) {
        accountEnt = await seneca.entity(accountCanon).load$(msg.account_id);
    }
    return accountEnt;
}
function calcTotals(accountEnt, creditEnts, debitEnts) {
    let creditTotal = creditEnts.map((entry) => entry.val)
        .reduce((total, val) => val + total, 0);
    let debitTotal = debitEnts.map((entry) => entry.val)
        .reduce((total, val) => val + total, 0);
    let balance = accountEnt ?
        ('credit' === accountEnt.normal ?
            creditTotal - debitTotal : debitTotal - creditTotal) :
        undefined;
    return {
        creditTotal,
        debitTotal,
        balance,
    };
}
// Default options.
const defaults = {
    debug: false,
    path: {
        partSize: 3,
    },
    entity: {
        base: 'ledger'
    }
};
Object.assign(ledger, {
    defaults, intern: {
        getBook
    }
});
exports.default = ledger;
if ('undefined' !== typeof module) {
    module.exports = ledger;
}
//# sourceMappingURL=ledger.js.map