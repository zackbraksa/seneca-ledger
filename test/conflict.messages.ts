export default {
  print: false,
  pattern: 'biz:refer',
  allow: { missing: true },
  calls: [
    {
      name: 'create-alice',
      pattern: 'create:entry', // call { biz:refer, create:entry, ...params }
      params: {
        user_id: 'u01',
        kind: 'standard', // avoid using 'type', 'kind' has fewer conflicts
        email: 'alice@example.com',
      },
      out: {
        ok: true,
        entry: {
          user_id: 'u01', // _id suffix for foreign keys
          kind: 'standard',
          email: 'alice@example.com',
        },
        occur: {
          user_id: 'u01',
          entry_kind: 'standard',
          kind: 'create',
          email: 'alice@example.com',
        },
      },
    },

    {
      name: 'create-alice2',
      pattern: 'create:entry', // call { biz:refer, create:entry, ...params }
      params: {
        user_id: 'u02',
        kind: 'standard', // avoid using 'type', 'kind' has fewer conflicts
        email: 'alice@example.com',
      },
      out: {
        ok: true,
        entry: {
          user_id: 'u02', // _id suffix for foreign keys
          kind: 'standard',
          email: 'alice@example.com',
        },
        occur: {
          user_id: 'u02',
          entry_kind: 'standard',
          kind: 'create',
          email: 'alice@example.com',
        },
      },
    },

    {
      name: 'create-alice3',
      pattern: 'create:entry', // call { biz:refer, create:entry, ...params }
      params: {
        user_id: 'u03',
        kind: 'standard', // avoid using 'type', 'kind' has fewer conflicts
        email: 'alice@example.com',
      },
      out: {
        ok: true,
        entry: {
          user_id: 'u03', // _id suffix for foreign keys
          kind: 'standard',
          email: 'alice@example.com',
        },
        occur: {
          user_id: 'u03',
          entry_kind: 'standard',
          kind: 'create',
          email: 'alice@example.com',
        },
      },
    },

    // Accept referral from user 2
    {
      name: 'accept-alice',
      pattern: 'accept:entry',
      params: {
        token: '`create-alice2:out.entry.token`',
        user_id: 'u02',
      },
      out: {
        ok: true,
        entry: {
          user_id: 'u02',
          kind: 'standard',
          email: 'alice@example.com',
        },
        occur: {
          entry_kind: 'standard',
          entry_id: '`create-alice2:out.entry.id`',
          email: 'alice@example.com',
          user_id: 'u02',
          kind: 'accept',
        },
      },
    },

    // Validate that only referral from user 2 have the status accepted
    {
      pattern: 'biz:null,role:entity,base:refer,name:occur,cmd:list',
      params: { q: { kind: 'accept' } },
      out: [
        {
          entry_kind: 'standard',
          entry_id: '`accept-alice:out.entry.id`',
          email: 'alice@example.com',
          user_id: 'u02',
          kind: 'accept',
        },
      ],
    },

    // Validate that the remaining referrals have the status equal to lost
    {
      pattern: 'biz:null,role:entity,base:refer,name:occur,cmd:list',
      params: { q: { kind: 'lost' } },
      out: [
        {
          entry_kind: 'standard',
          entry_id: '`create-alice:out.entry.id`',
          email: 'alice@example.com',
          user_id: 'u01',
          kind: 'lost',
        },
        {
          entry_kind: 'standard',
          entry_id: '`create-alice3:out.entry.id`',
          email: 'alice@example.com',
          user_id: 'u03',
          kind: 'lost',
        },
      ],
    },

    // try to accept a lost referral
    {
      name: 'accept-alice',
      pattern: 'accept:entry',
      params: {
        token: '`create-alice3:out.entry.token`',
        user_id: 'u03',
      },
      out: {
        ok: false,
        why: 'entry-lost',
      },
    },

    // try to referral a user
    {
      name: 'create-alice',
      pattern: 'create:entry', // call { biz:refer, create:entry, ...params }
      params: {
        user_id: 'u05',
        kind: 'standard', // avoid using 'type', 'kind' has fewer conflicts
        email: 'alice@example.com',
      },
      out: {
        ok: false,
        why: 'entry-exists',
      },
    },
  ],
}
