// Basic referral: sent email invite to a friend

export default {
  print: false,
  pattern: 'biz:refer',
  allow: { missing: true },

  calls: [
    {
      name: 'create-infinite-code',
      pattern: 'create:entry',
      params: {
        kind: 'standard',
        method: 'code',
        mode: 'limit',
        limit: -1,
      },
      out: {
        ok: true,
        entry: {
          kind: 'standard',
          method: 'code',
          mode: 'limit',
          limit: -1,
          count: 0,
        },
      },
    },

    // Print entire database
    // { print: true, pattern: 'biz:null,role:mem-store,cmd:dump' },

    {
      name: 'check-infinite-1',
      pattern: 'accept:entry',
      params: {
        check: true,
        code: '`create-infinite-code:out.entry.code`'
      },
      out: {
        ok: true,
        entry: {
          id: '`create-infinite-code:out.entry.id`',
          count: 0
        }
      }
    },

    {
      name: 'accept-infinite-1',
      pattern: 'accept:entry',
      params: {
        code: '`create-infinite-code:out.entry.code`'
      },
      out: {
        ok: true,
        entry: {
          id: '`create-infinite-code:out.entry.id`',
          count: 1
        }
      }
    },

    {
      name: 'accept-infinite-2',
      pattern: 'accept:entry',
      params: {
        code: '`create-infinite-code:out.entry.code`',
        user_id: 'u01'
      },
      out: {
        ok: true,
        entry: {
          id: '`create-infinite-code:out.entry.id`',
          count: 2
        },
        occur: {
          user_id: 'u01'
        }
      }
    },

    {
      name: 'accept-infinite-3',
      pattern: 'accept:entry',
      params: {
        code: '`create-infinite-code:out.entry.code`'
      },
      out: {
        ok: true,
        entry: {
          id: '`create-infinite-code:out.entry.id`',
          count: 3
        },
        occur: {
          entry_kind: 'standard'
        }
      }
    },

    {
      name: 'update-infinite-3',
      pattern: 'update:occur',
      params: {
        occur_id: '`accept-infinite-3:out.occur.id`',
        user_id: 'u02'
      },
      out: {
        ok: true,
        occur: {
          id: '`accept-infinite-3:out.occur.id`',
          entry_kind: 'standard',
          user_id: 'u02'
        }
      }
    },


    // Limit 2

    {
      name: 'create-limit-code',
      pattern: 'create:entry',
      params: {
        kind: 'standard',
        method: 'code',
        mode: 'limit',
        limit: 2,
      },
      out: {
        ok: true,
        entry: {
          kind: 'standard',
          method: 'code',
          mode: 'limit',
          limit: 2,
          count: 0,
        },
      },
    },

    {
      name: 'accept-limit-1',
      pattern: 'accept:entry',
      params: {
        code: '`create-limit-code:out.entry.code`'
      },
      out: {
        ok: true,
        entry: {
          id: '`create-limit-code:out.entry.id`',
          count: 1
        }
      }
    },

    {
      name: 'accept-limit-2',
      pattern: 'accept:entry',
      params: {
        code: '`create-limit-code:out.entry.code`'
      },
      out: {
        ok: true,
        entry: {
          id: '`create-limit-code:out.entry.id`',
          count: 2
        }
      }
    },

    {
      name: 'accept-limit-3',
      pattern: 'accept:entry',
      params: {
        code: '`create-limit-code:out.entry.code`'
      },
      out: {
        ok: false, why: 'entry-limit', details: { limit: 2, accepts: 2 }
      }
    },

  ],
}
