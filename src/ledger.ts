/* Copyright © 2022 Seneca Project Contributors, MIT License. */


type LedgerOptions = {
  debug: boolean
  path: {
    partSize: number,
  },
  entity: {
    base: string
  }
}


type dc = 'debit' | 'credit'


/* NOTES
 * oref, aref, bref are mostly for human repl convenience 
 * 
 * Unique constraints:
 * ledger/account: aref
 */


function ledger(this: any, options: LedgerOptions) {
  const seneca: any = this

  const accountCanon = options.entity.base + '/account'
  const bookCanon = options.entity.base + '/book'
  const debitCanon = options.entity.base + '/debit'
  const creditCanon = options.entity.base + '/credit'
  const balanceCanon = options.entity.base + '/balance'


  const makeRef = seneca.util.Nid({ length: 16 })

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
    .message('list:entry', msgListEntry)


  async function msgCreateAccount(this: any, msg: {
    id?: string // specify id
    org_id?: string // Organization holding the ledger, defined externally
    oref?: string // Organization holding the ledger, defined externally
    path?: string | string[], // Classification path. e.g ['Asset']
    name: string
    normal: dc
  }) {
    let seneca = this

    let oref = null == msg.oref ? msg.org_id : msg.oref
    let org_id = null == msg.org_id ? msg.oref : msg.org_id

    if (null == org_id) {
      return { ok: false, why: 'no-org' }
    }

    let name = msg.name

    if (null == name || '' == name) {
      return { ok: false, why: 'no-name' }
    }

    let path = ('string' === typeof msg.path ? msg.path.split('/') : msg.path) || []
    let pathParts = Array(options.path.partSize).fill(null)
      .reduce(((a: any, _: string, i: number) =>
        (a['path' + i] = null == path[i] ? '' : path[i], a)), ({} as any))

    let aref = msg.oref + '/' + path.join('/') + '/' + name

    let normal = msg.normal
    if ('credit' !== normal && 'debit' !== normal) {
      return { ok: false, why: 'invalid-normal' }
    }

    let accountEnt = await seneca.entity(accountCanon).data$({
      id$: msg.id,
      ...pathParts,
      org_id,
      oref,
      aref,
      path,
      name,
      normal,
    }).save$()

    return { ok: true, account: accountEnt.data$(false) }
  }


  async function msgGetAccount(this: any, msg: {
    id?: string
    account_id?: string
    bref?: string // Account ref: aref/account-name/account-start
  }) {
    let seneca = this

    let accountEnt = await getAccount(seneca, accountCanon, msg)

    if (null == accountEnt) {
      return { ok: false, why: 'account-not-found' }
    }

    return { ok: true, account: accountEnt.data$(false) }
  }


  async function msgListAccount(this: any, msg: {
    org_id?: string // Organization holding the ledger, defined externally
    oref?: string // Organization holding the ledger, defined externally

  }) {
    let seneca = this

    let org_id = null == msg.org_id ? msg.oref : msg.org_id

    let q: any = {}
    if (null != org_id) {
      q.org_id = org_id
    }

    let list = await seneca.entity(accountCanon).list$(q)
    list = list.map((ent: any) => ent.data$(false))
    return { ok: true, q, list }
  }


  async function msgUpdateAccount(this: any, msg: any) { }


  async function msgBalanceAccount(this: any, msg: any) {
    let seneca = this

    let accountEnt = await getAccount(seneca, accountCanon, msg)

    if (null == accountEnt) {
      return { ok: false, why: 'account-not-found' }
    }

    let bookEnt = await getBook(seneca, bookCanon, msg)

    if (null == bookEnt) {
      return { ok: false, why: 'book-not-found' }
    }

    let cq = {
      credit_id: accountEnt.id,
      book_id: bookEnt.id,
    }

    let dq = {
      debit_id: accountEnt.id,
      book_id: bookEnt.id,
    }

    let credits = await seneca.entity(creditCanon).list$(cq)
    let debits = await seneca.entity(debitCanon).list$(dq)

    let creditTotal = credits.map((entry: any) => entry.val)
      .reduce((total: number, val: number) => val + total, 0)

    let debitTotal = debits.map((entry: any) => entry.val)
      .reduce((total: number, val: number) => val + total, 0)

    let balance = 'credit' === accountEnt.normal ? creditTotal - debitTotal :
      debitTotal - creditTotal

    let out = {
      ok: true,
      account_id: accountEnt.id,
      aref: accountEnt.aref,
      book_id: bookEnt.id,
      bref: bookEnt.bref,
      start: bookEnt.start,
      end: bookEnt.end,
      creditTotal: creditTotal,
      debitTotal: debitTotal,
      creditCount: credits.length,
      debitCount: debits.length,
      normal: accountEnt.normal,
      balance,
    }

    return out
  }


  async function msgCreateBook(this: any, msg: {
    id?: string
    org_id?: string
    oref?: string
    name: string, // Not unique, repeated for time periods
    start: number, // YYYYMMDD
    end?: number, // YYYYMMDD
    time?: any // time spec - timezone etc
  }) {
    let seneca = this

    let start = msg.start
    if (null == start) {
      return { ok: false, why: 'no-start' }
    }

    let oref = null == msg.oref ? msg.org_id : msg.oref
    let org_id = null == msg.org_id ? msg.oref : msg.org_id

    if (null == org_id) {
      return { ok: false, why: 'no-org' }
    }

    let end = msg.end || -1
    let time = msg.time || { kind: 'basic' }

    let name = msg.name
    if (null == name || '' == name) {
      return { ok: false, why: 'no-name' }
    }

    let bref = oref + '/' + name + '/' + start

    let bookEnt = await seneca.entity(bookCanon).data$({
      id$: msg.id,
      org_id,
      oref,
      bref,
      name,
      start,
      end,
      time,
    }).save$()

    return { ok: true, book: bookEnt.data$(false) }
  }


  async function msgGetBook(this: any, msg: {
    id?: string
    book_id?: string
    bref?: string // Book ref: aref/book-name/book-start
  }) {
    let seneca = this

    let bookEnt = await getBook(seneca, bookCanon, msg)

    if (null == bookEnt) {
      return { ok: false, why: 'book-not-found' }
    }

    return { ok: true, book: bookEnt.data$(false) }
  }


  async function msgListBook(this: any, msg: {
    org_id?: string // Organization holding the ledger, defined externally
    oref?: string // Organization holding the ledger, defined externally

  }) {
    let seneca = this

    let org_id = null == msg.org_id ? msg.oref : msg.org_id

    let q: any = {}
    if (null != org_id) {
      q.org_id = org_id
    }

    let list = await seneca.entity(bookCanon)
      .list$(q)

    list = list.map((ent: any) => ent.data$(false))

    return { ok: true, q, list }
  }


  async function msgUpdateBook(this: any, msg: any) { }

  async function msgListBalance(this: any, msg: any) { }
  async function msgBalanceBook(this: any, msg: any) { }

  async function msgCreateEntry(this: any, msg: {
    id?: string
    book_id?: string
    bref?: string // Book ref: aref/book-name/book-start
    accounth_id?: string
    aref?: string // Account ref: org_ref/path/name

    debit?: {
      account_id?: string
      aref?: string
    }

    credit?: {
      account_id?: string
      aref?: string
    }

    // convenience
    daref?: string
    caref?: string

    date: number // YYYYMMDD
    val: number
    desc: string

    // optional
    baseval?: number
    basecur?: string
    baserate?: number

    kind?: string

    // custom data
    custom?: any

    // custom fields
    entry?: any
  }) {
    let seneca = this

    let out: any = { ok: false }

    let debit = msg.debit || { aref: msg.daref }
    let credit = msg.credit || { aref: msg.caref }


    let bookEnt = await getBook(seneca, bookCanon, msg)

    if (null == bookEnt) {
      return { ok: false, why: 'book-not-found' }
    }


    let debitAccountEnt = await getAccount(seneca, accountCanon, {
      ...debit
    })

    if (null == debitAccountEnt) {
      return { ok: false, why: 'debit-account-not-found' }
    }


    let creditAccountEnt = await getAccount(seneca, accountCanon, {
      ...credit
    })

    if (null == creditAccountEnt) {
      return { ok: false, why: 'credit-account-not-found' }
    }


    let val = msg.val

    if (null == val) {
      return { ok: false, why: 'no-val' }
    }


    // If derived from a base currency
    let baseval = msg.baseval || -1
    let basecur = msg.basecur || '---' // currency code, EUR, GBP, USD, etc
    let baserate = msg.baserate || 0


    let desc = msg.desc

    if (null == desc || '' === desc) {
      return { ok: false, why: 'no-desc' }
    }


    let date = msg.date

    if (null == date) {
      return { ok: false, why: 'no-date' }
    }


    let kind = msg.kind || 'standard'

    // custom data
    let custom = msg.custom || {}


    let customFields = 'object' === typeof msg.entry ? msg.entry : {}

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
    }

    let creditEntry = {
      ...sharedEntry,
      credit_id: creditAccountEnt.id,
      caref: creditAccountEnt.aref,
    }

    let debitEntry = {
      ...sharedEntry,
      debit_id: debitAccountEnt.id,
      daref: debitAccountEnt.aref,
    }

    let creditEnt = await seneca.entity(creditCanon).data$(creditEntry).save$()

    debitEntry.id$ = creditEnt.id
    let debitEnt = await seneca.entity(debitCanon).data$(debitEntry).save$()

    out.ok = true
    out.credit = creditEnt.data$(false)
    out.debit = debitEnt.data$(false)

    return out
  }

  async function msgVoidEntry(this: any, msg: any) { }


  async function msgListEntry(this: any, msg: {
    oref: string
    book_id?: string
    bref?: string
    account_id?: string
    aref?: string
    credit?: boolean
    debit?: boolean
    q?: any
  }) {
    let seneca = this

    let q = msg.q || {}

    if (null == msg.oref) {
      return { ok: false, why: 'org-required' }
    }

    q.oref = msg.oref


    let bookEnt = await getBook(seneca, bookCanon, msg)

    if (null != bookEnt) {
      q.book_id = bookEnt.id
    }


    let accountEnt = await getAccount(seneca, accountCanon, msg)

    if (null != accountEnt) {
      q.account_id = accountEnt.id
    }


    let credits = []
    if (null == msg.credit || !!msg.credit) {
      credits = await seneca.entity(creditCanon).list$(q)
      credits = credits.map((entry: any) => entry.data$(false))
    }

    let debits = []
    if (null == msg.debit || !!msg.debit) {
      debits = await seneca.entity(debitCanon).list$(q)
      debits = debits.map((entry: any) => entry.data$(false))
    }

    let out = {
      ok: true,
      credits,
      debits,
      q,
    }

    return out
  }


}



async function getBook(seneca: any, bookCanon: string, msg: {
  id?: string
  book_id?: string
  bref?: string // Book ref: aref/book-name/book-start
}) {
  let bookEnt: any = null
  if (null != msg.bref) {
    bookEnt = await seneca.entity(bookCanon).load$({ bref: msg.bref })
  }
  if (null == bookEnt && null != msg.id) {
    bookEnt = await seneca.entity(bookCanon).load$(msg.id)
  }
  if (null == bookEnt && null != msg.book_id) {
    bookEnt = await seneca.entity(bookCanon).load$(msg.book_id)
  }

  return bookEnt
}


async function getAccount(seneca: any, accountCanon: string, msg: {
  id?: string
  account_id?: string
  aref?: string // Account ref: org_ref/path/name
}) {
  let accountEnt: any = null
  if (null != msg.aref) {
    accountEnt = await seneca.entity(accountCanon).load$({ aref: msg.aref })
  }
  if (null == accountEnt && null != msg.id) {
    accountEnt = await seneca.entity(accountCanon).load$(msg.id)
  }
  if (null == accountEnt && null != msg.account_id) {
    accountEnt = await seneca.entity(accountCanon).load$(msg.account_id)
  }

  return accountEnt
}



// Default options.
const defaults: LedgerOptions = {
  debug: false,

  path: {
    partSize: 3,
  },

  entity: {
    base: 'ledger'
  }
}

Object.assign(ledger, {
  defaults, intern: {
    getBook
  }
})

export default ledger

if ('undefined' !== typeof module) {
  module.exports = ledger
}
