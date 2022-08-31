// Basic ledgerral: sent email invite to a friend

export default {
  print: false,
  pattern: 'biz:ledger',
  allow: { missing: true },

  calls: [

    // See https://fundsnetservices.com/debits-and-credits

    // Chart of Accounts

    {
      name: 'shop-a0',
      pattern: 'create:account',
      params: {
        account: {
          id$: 'shop-a0',
          oref: 'o0',
          path: 'Asset',
          name: 'Cash',
          normal: 'debit'
        }
      },
      out: {
        ok: true,
        account: {
          id: 'shop-a0',
          path0: 'Asset',
          path1: '',
          path2: '',
          org_id: 'o0',
          oref: 'o0',
          aref: 'o0/Asset/Cash',
          path: ['Asset'],
          name: 'Cash',
          normal: 'debit',
        }
      }
    },

    {
      name: 'shop-ua0',
      pattern: 'update:account',
      params: {
        id: 'shop-a0',
        account: {
          xfoo: 1  // custom field
        }
      },
      out: {
        ok: true,
        account: {
          id: 'shop-a0',
          path0: 'Asset',
          path1: '',
          path2: '',
          org_id: 'o0',
          oref: 'o0',
          aref: 'o0/Asset/Cash',
          path: ['Asset'],
          name: 'Cash',
          normal: 'debit',
          xfoo: 1,
        }
      }
    },

    {
      name: 'shop-a1',
      pattern: 'create:account',
      params: {
        account: {
          id$: 'shop-a1',
          oref: 'o0',
          path: 'Income',
          name: 'Sales',
          normal: 'credit'
        }
      },
      out: {
        ok: true,
        account: {
          id: 'shop-a1',
          path0: 'Income',
          path1: '',
          path2: '',
          org_id: 'o0',
          oref: 'o0',
          aref: 'o0/Income/Sales',
          path: ['Income'],
          name: 'Sales',
          normal: 'credit',
        }
      }
    },

    {
      name: 'shop-a2',
      pattern: 'create:account',
      params: {
        account: {
          id$: 'shop-a2',
          oref: 'o0',
          path: 'Asset',
          name: 'Office',
          normal: 'debit'
        }
      },
      out: {
        ok: true,
        account: {
          id: 'shop-a2',
          path0: 'Asset',
          path1: '',
          path2: '',
          org_id: 'o0',
          oref: 'o0',
          aref: 'o0/Asset/Office',
          path: ['Asset'],
          name: 'Office',
          normal: 'debit',
        }
      }
    },


    // Open a book

    {
      name: 'shop-b0',
      pattern: 'create:book',
      params: {
        book: {
          id$: 'shop-b0',
          oref: 'o0',
          name: 'Q1',
          start: 20220101,
        }
      },
      out: {
        ok: true,
        book: {
          id: 'shop-b0',
          org_id: 'o0',
          oref: 'o0',
          bref: 'o0/Q1/20220101',
          name: 'Q1',
          start: 20220101,
          time: { kind: 'basic' },
        }
      }
    },

    {
      name: 'shop-ub0',
      pattern: 'update:book',
      params: {
        id: 'shop-b0',
        book: {
          end: 20220331,
          xbar: 2 // custom field
        }
      },
      out: {
        ok: true,
        book: {
          id: 'shop-b0',
          org_id: 'o0',
          oref: 'o0',
          bref: 'o0/Q1/20220101',
          name: 'Q1',
          start: 20220101,
          end: 20220331,
          time: { kind: 'basic' },
          xbar: 2
        }
      }
    },


    // Post journal entries

    {
      name: 'shop-e0',
      pattern: 'create:entry',
      params: {
        id: 'shop-e0',
        oref: 'o0',
        bref: 'o0/Q1/20220101',
        daref: 'o0/Asset/Cash',
        caref: 'o0/Income/Sales',
        val: 100,
        desc: 'Jan Sales',
        date: '20220131',
        custom: {
          geo: 'EU'
        },
        entry: {
          xrep: 'alice'
        }
      },
      out: {
        ok: true,
        credit: {
          xrep: 'alice',
          val: 100,
          desc: 'Jan Sales',
          kind: 'standard',
          oref: 'o0',
          org_id: 'o0',
          bref: 'o0/Q1/20220101',
          book_id: 'shop-b0',
          custom: { geo: 'EU' },
          baseval: -1,
          basecur: '---',
          baserate: 0,
          credit_id: 'shop-a1',
          caref: 'o0/Income/Sales',
          id: 'shop-e0'
        },
        debit: {
          xrep: 'alice',
          val: 100,
          desc: 'Jan Sales',
          kind: 'standard',
          oref: 'o0',
          org_id: 'o0',
          bref: 'o0/Q1/20220101',
          book_id: 'shop-b0',
          custom: { geo: 'EU' },
          baseval: -1,
          basecur: '---',
          baserate: 0,
          debit_id: 'shop-a0',
          daref: 'o0/Asset/Cash',
          id: 'shop-e0'
        }
      }
    },

    {
      name: 'shop-e1',
      pattern: 'create:entry',
      params: {
        id: 'shop-e1',
        oref: 'o0',
        bref: 'o0/Q1/20220101',
        daref: 'o0/Asset/Office',
        caref: 'o0/Asset/Cash',
        val: 20,
        desc: 'Buy desk',
        date: '20220102',
      },
      out: {
        ok: true,
        credit: {
          val: 20,
          desc: 'Buy desk',
          kind: 'standard',
          oref: 'o0',
          org_id: 'o0',
          bref: 'o0/Q1/20220101',
          book_id: 'shop-b0',
          custom: {},
          baseval: -1,
          basecur: '---',
          baserate: 0,
          credit_id: 'shop-a0',
          caref: 'o0/Asset/Cash',
          id: 'shop-e1'
        },
        debit: {
          val: 20,
          desc: 'Buy desk',
          kind: 'standard',
          oref: 'o0',
          org_id: 'o0',
          bref: 'o0/Q1/20220101',
          book_id: 'shop-b0',
          custom: {},
          baseval: -1,
          basecur: '---',
          baserate: 0,
          debit_id: 'shop-a2',
          daref: 'o0/Asset/Office',
          id: 'shop-e1'
        }
      }
    },

    {
      name: 'shop-le0',
      pattern: 'list:entry',
      params: {
        id: 'shop-e1',
        oref: 'o0',
        bref: 'o0/Q1/20220101',
      },
      out: {
        ok: true,
        credits: [
          {
            val: 100,
            desc: 'Jan Sales',
            caref: 'o0/Income/Sales',
            id: 'shop-e0'
          },
          {
            val: 20,
            desc: 'Buy desk',
            caref: 'o0/Asset/Cash',
            id: 'shop-e1'
          }
        ],
        debits: [
          {
            val: 100,
            desc: 'Jan Sales',
            daref: 'o0/Asset/Cash',
            id: 'shop-e0'
          },
          {
            val: 20,
            desc: 'Buy desk',
            daref: 'o0/Asset/Office',
            id: 'shop-e1'
          }
        ],
        q: { oref: 'o0', book_id: 'shop-b0' }
      }
    },


    // Balance
    {
      name: 'shop-le0',
      pattern: 'balance:account',
      params: {
        id: 'shop-e1',
        oref: 'o0',
        bref: 'o0/Q1/20220101',
        aref: 'o0/Asset/Cash',
      },
      out: {
        ok: true,
        account_id: 'shop-a0',
        aref: 'o0/Asset/Cash',
        book_id: 'shop-b0',
        bref: 'o0/Q1/20220101',
        start: 20220101,
        end: 20220331,
        creditTotal: 20,
        debitTotal: 100,
        creditCount: 1,
        debitCount: 1,
        normal: 'debit',
        balance: 80
      }
    }

  ],
}
