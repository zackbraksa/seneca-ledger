"use strict";
/* Copyright © 2022 Seneca Project Contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
function refer(options) {
    const seneca = this;
    const genToken = this.util.Nid(options.token);
    const genCode = this.util.Nid(options.code);
    seneca
        .fix('biz:refer')
        .message('create:entry', msgCreateEntry)
        .message('accept:entry', msgAcceptEntry)
        .message('update:occur', msgUpdateOccur)
        .message('update:entry', msgUpdateEntry)
        .message('load:entry', msgLoadEntry)
        .message('ensure:entry', msgEnsureEntry)
        .message('lost:entry', msgLostEntry)
        .message('give:award', msgRewardEntry)
        .message('load:rules', msgLoadRules);
    // TODO: seneca.prepare should not be affected by seneca.fix
    seneca
        .prepare(prepare);
    async function msgCreateEntry(msg) {
        const seneca = this;
        // Sending user, not required
        let user_id = msg.user_id;
        let method = msg.method || 'email'; // 'email' | 'code'
        let email = msg.email; // required if method=email and mode=single
        let code = msg.code; // explicit code, otherwise generated
        let token = msg.token; // explicit code, otherwise generated
        let mode = msg.mode || 'single'; // 'single' | 'multi' | 'limit'
        let limit = msg.limit || 1; // usage limit; -1 = unlimited
        let kind = msg.kind || 'standard';
        let peg = msg.peg || 'none'; // app specific entry type
        let active = null == msg.active ? true : !!msg.active;
        let EntryEnt = seneca.entity('refer/entry');
        let OccurEnt = seneca.entity('refer/occur');
        // Check single use email referral used only once
        if ('email' === method && 'single' === mode) {
            if (null == email || '' === email) {
                return {
                    ok: false,
                    why: 'email-required',
                };
            }
            let occur = await OccurEnt.load$({
                email,
                kind: 'accept',
            });
            if (occur) {
                return {
                    ok: false,
                    why: 'entry-exists',
                    details: {
                        email
                    }
                };
            }
        }
        const entry = await EntryEnt.save$({
            user_id,
            kind,
            email,
            method,
            mode,
            limit,
            peg,
            // unique token for this referral, used for link validation
            token: token || genToken(),
            // unique code for this referral, used for human validation
            code: code || genCode(),
            // usage count
            count: 0,
            active,
        });
        let occur;
        // REVIEW: is this 'create' entry needed?
        if ('single' === mode) {
            occur = await OccurEnt.data$({
                id: null,
                id$: null,
                user_id: msg.user_id,
                entry_kind: msg.kind,
                entry_mode: msg.mode,
                entry_peg: msg.peg,
                email: msg.email,
                entry_id: entry.id,
                kind: 'create',
            }).save$();
        }
        return {
            ok: true,
            entry,
            occur,
        };
    }
    async function msgAcceptEntry(msg) {
        const seneca = this;
        // If check=true, do not update occur
        let check = true === msg.check ? true : false;
        // User using the referral, if known at creation
        let user_id = msg.user_id;
        let token = msg.token;
        let code = msg.code;
        let q = {};
        if (msg.token) {
            q.token = msg.token;
        }
        else if (msg.code) {
            q.code = msg.code;
        }
        else {
            return {
                ok: false,
                why: 'no-token-or-code'
            };
        }
        const entry = await seneca.entity('refer/entry').load$(q);
        if (!entry) {
            return {
                ok: false,
                why: 'entry-unknown',
                details: {
                    token,
                    code,
                }
            };
        }
        if (!entry.active) {
            return {
                ok: false,
                why: 'entry-not-active',
            };
        }
        let occurs = await this.entity('refer/occur').list$({
            entry_id: entry.id,
            fields$: ['kind']
        });
        let isLost = occurs.find((occur) => 'lost' === occur.kind);
        if (isLost) {
            return {
                ok: false,
                why: 'entry-lost',
            };
        }
        let accepts = occurs.filter((occur) => 'accept' === occur.kind);
        if (('single' === entry.mode || 1 === entry.limit) && (1 <= accepts)) {
            return {
                ok: false,
                why: 'entry-used',
            };
        }
        else if (0 < entry.limit && entry.limit <= accepts.length) {
            return {
                ok: false,
                why: 'entry-limit',
                details: {
                    limit: entry.limit,
                    accepts: accepts.length,
                }
            };
        }
        let occur;
        if (!check) {
            occur = await seneca.entity('refer/occur').save$({
                user_id,
                entry_kind: entry.kind,
                email: entry.email,
                entry_id: entry.id,
                kind: 'accept',
            });
            entry.count = accepts.length + 1;
            await entry.save$();
        }
        return {
            ok: true,
            entry,
            occur, // NOTE: will be undef if check=true
        };
    }
    async function msgUpdateOccur(msg) {
        const seneca = this;
        let occur_id = msg.occur_id;
        let user_id = msg.user_id;
        let occur = await seneca.entity('refer/occur').load$(occur_id);
        if (!occur) {
            return {
                ok: false,
                why: 'not-found'
            };
        }
        // The user who used the referral
        occur.user_id = user_id;
        await occur.save$();
        return {
            ok: true,
            occur,
        };
    }
    async function msgUpdateEntry(msg) {
        const seneca = this;
        let entry_id = msg.entry_id;
        let active = msg.active;
        let entry = seneca.entity('refer/entry').load$(entry_id);
        if (!entry) {
            return {
                ok: false,
                why: 'not-found'
            };
        }
        if (null != active) {
            entry.active = !!active;
            await entry.save$();
        }
        return {
            ok: true,
            entry,
        };
    }
    async function msgLoadEntry(msg) {
        const seneca = this;
        let entry_id = msg.entry_id;
        let entry = seneca.entity('refer/entry').load$(entry_id);
        if (!entry) {
            return {
                ok: false,
                why: 'not-found'
            };
        }
        let occurs = seneca.entity('refer/occur').list$({
            entry_id: entry.id
        });
        return {
            ok: true,
            entry,
            occurs,
        };
    }
    // Create if not exists, otherwise return match
    // Most useful for mode=multi 
    async function msgEnsureEntry(msg) {
        const seneca = this;
        let user_id = msg.user_id;
        let kind = msg.kind || 'standard';
        let peg = msg.peg;
        let entry = await seneca.entity('refer/entry').load$({
            user_id,
            kind,
            peg,
        });
        let out;
        if (null == entry) {
            let createMsg = { ...msg, create: 'entry' };
            delete createMsg.ensure;
            out = await seneca.post(createMsg);
        }
        else {
            out = {
                ok: true,
                entry,
                occur: [],
            };
        }
        return out;
    }
    async function msgLostEntry(msg) {
        const seneca = this;
        const occurList = await seneca.entity('refer/occur').list$({
            email: msg.email,
            kind: 'create',
        });
        const unacceptedReferrals = occurList.filter((occur) => occur.user_id !== msg.userWinner);
        for (let i = 0; i < unacceptedReferrals.length; i++) {
            await seneca.entity('refer/occur').save$({
                user_id: unacceptedReferrals[i].user_id,
                entry_kind: unacceptedReferrals[i].entry_kind,
                email: msg.email,
                entry_id: unacceptedReferrals[i].entry_id,
                kind: 'lost',
            });
        }
    }
    async function msgRewardEntry(msg) {
        const seneca = this;
        const entry = await seneca.entity('refer/occur').load$({
            entry_id: msg.entry_id,
        });
        if (!entry) {
            return {
                ok: false,
                why: 'unknown-entry'
            };
        }
        let reward = await this.entity('refer/reward').load$({
            entry_id: entry.id,
        });
        if (!reward) {
            reward = seneca.make('refer/reward', {
                entry_id: msg.entry_id,
                entry_kind: msg.entry_kind,
                kind: msg.kind,
                award: msg.award,
            });
            reward[msg.field] = 0;
        }
        reward[msg.field] = reward[msg.field] + 1;
        await reward.save$();
    }
    async function msgLoadRules(msg) {
        const seneca = this;
        const rules = await seneca.entity('refer/rule').list$();
        // TODO: handle rule updates?
        // TODO: create a @seneca/rule plugin? later!
        for (let rule of rules) {
            if (rule.ent) {
                const subpat = generateSubPat(seneca, rule);
                seneca.sub(subpat, function (msg) {
                    if (rule.where.kind === 'create') {
                        rule.call.forEach((callmsg) => {
                            // TODO: use https://github.com/rjrodger/inks
                            callmsg.toaddr = msg.ent.email;
                            callmsg.fromaddr = 'invite@example.com';
                            this.act(callmsg);
                        });
                    }
                });
                seneca.sub(subpat, function (msg) {
                    if (rule.where.kind === 'accept') {
                        rule.call.forEach((callmsg) => {
                            callmsg.ent = seneca.entity(rule.ent);
                            callmsg.entry_id = msg.q.entry_id;
                            callmsg.entry_kind = msg.q.entry_kind;
                            this.act(callmsg);
                        });
                    }
                });
                seneca.sub(subpat, function (msg) {
                    if (rule.where.kind === 'lost' && msg.q.kind === 'accept') {
                        rule.call.forEach((callmsg) => {
                            callmsg.ent = seneca.entity(rule.ent);
                            callmsg.email = msg.q.email;
                            callmsg.userWinner = msg.q.user_id;
                            this.act(callmsg);
                        });
                    }
                });
            }
            // else ignore as not yet implemented
        }
    }
    async function prepare() {
        const seneca = this;
        await seneca.post('biz:refer,load:rules');
    }
    function generateSubPat(seneca, rule) {
        const ent = seneca.entity(rule.ent);
        const canon = ent.canon$({ object: true });
        Object.keys(canon).forEach((key) => {
            if (!canon[key]) {
                delete canon[key];
            }
        });
        return {
            role: 'entity',
            cmd: rule.cmd,
            q: rule.where,
            ...canon,
            out$: true,
        };
    }
    return {
        exports: {
            genToken,
            genCode,
        }
    };
}
// Default options.
const defaults = {
    // TODO: Enable debug logging
    debug: false,
    token: {
        len: 16,
        alphabet: undefined,
    },
    code: {
        len: 6,
        alphabet: 'BCDFGHJKLMNPQRSTVWXYZ2456789'
    }
};
Object.assign(refer, { defaults });
exports.default = refer;
if ('undefined' !== typeof module) {
    module.exports = refer;
}
//# sourceMappingURL=refer.js.map