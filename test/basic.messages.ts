// Basic referral: sent email invite to a friend

export default {
  print: false,
  pattern: 'biz:refer',
  allow: { missing: true },

  calls: [
    // User with id=u01 sends referal to friend alice@example.com
    // Creating:
    //   - refer/entry referral record
    //   - refer/occur event record
    //   - sent email to alice@example.com (mock/email record)
    // Email sending to be implemented with @seneca/mail later
    // NOTE: implementation is just hard-coded!
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
        }
      },
    },

    // Print entire database
    // { print: true, pattern: 'biz:null,role:mem-store,cmd:dump' },

    // Validate the refer/entry exists and is correct
    {
      pattern: 'biz:null,role:entity,base:refer,name:entry,cmd:list',
      out: [
        {
          id: '`create-alice:out.entry.id`',
          user_id: 'u01',
          kind: 'standard',
          email: 'alice@example.com',
        },
      ],
    },

    // Validate the refer/occur exists and is correct
    {
      pattern: 'biz:null,role:entity,base:refer,name:occur,cmd:list',
      out: [
        {
          // back references, see: https://github.com/rjrodger/inks
          id: '`create-alice:out.occur.id`',
          entry_id: '`create-alice:out.entry.id`',
          entry_kind: 'standard',
          kind: 'create',
          email: 'alice@example.com',
        },
      ],
    },

    // Validate email was 'sent' (uses mock entity)
    {
      name: 'email-sent',
      pattern: 'biz:null,role:entity,base:mock,name:email,cmd:list',
      out: [
        {
          toaddr: 'alice@example.com',
          fromaddr: 'invite@example.com',
          kind: 'refer',
          code: 'invite',
        },
      ],
    },

    // Accept the referral
    {
      name: 'accept-alice-token',
      pattern: 'accept:entry',
      params: {
        token: '`create-alice:out.entry.token`',
        user_id: 'u01',
      },
      out: {
        ok: true,
        entry: {
          user_id: 'u01',
          kind: 'standard',
          email: 'alice@example.com',
        },
        occur: {
          entry_kind: 'standard',
          entry_id: '`create-alice:out.entry.id`',
          email: 'alice@example.com',
          user_id: 'u01',
          kind: 'accept',
        },
      },
    },

    // Validate new refer/occur record
    {
      pattern: 'biz:null,role:entity,base:refer,name:occur,cmd:load',
      params: { q: { kind: 'accept' } },
      out: {
        entry_kind: 'standard',
        entry_id: '`create-alice:out.entry.id`',
        email: 'alice@example.com',
        user_id: 'u01',
        kind: 'accept',
      },
    },

    // Validate new refer/reward updated
    {
      pattern: 'biz:null,role:entity,base:refer,name:reward,cmd:load',
      params: {
        q: {
          entry_id: '`create-alice:out.entry.id`',
        },
      },
      out: {
        entry_id: '`create-alice:out.entry.id`',
        entry_kind: 'standard',
        kind: 'accept',
        award: 'incr',
        count: 1, // alice@example.com accepted
      },
    },

    // Check return for invalid entry token
    {
      name: 'accept-alice',
      pattern: 'accept:entry',
      params: {
        token: '123',
      },
      out: {
        ok: false,
        why: 'entry-unknown',
      },
    },
  ],
}

/* ADDITIONAL SCENARIOS
 * Another user send a referral to alice@example.com
 *   - before acceptance
 *   - after acceptance
 */
