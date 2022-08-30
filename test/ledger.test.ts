/* Copyright © 2022 Seneca Project Contributors, MIT License. */

import Seneca from 'seneca'
import SenecaMsgTest from 'seneca-msg-test'
// import { Maintain } from '@seneca/maintain'

import LedgerDoc from '../src/ledger-doc'
import Ledger from '../src/ledger'

import BasicMessages from './basic.messages'
import ManyMessages from './many.messages'
import ConflictMessages from './conflict.messages'
import InviteMessages from './invite.messages'


describe('ledger', () => {
  test('happy', async () => {
    expect(LedgerDoc).toBeDefined()
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use('entity')
      .use(Ledger)
    await seneca.ready()
  })


  test('gen', async () => {
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use('entity')
      .use(Ledger)
    await seneca.ready()

    let genToken = seneca.export('ledger/genToken')
    let genCode = seneca.export('ledger/genCode')

    expect(genToken().length).toEqual(16)
    expect(genCode().length).toEqual(6)
  })


  test('basic.messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, BasicMessages)()
  })


  test('many.messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, ManyMessages)()
  })


  test('conflict.messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, ConflictMessages)()
  })


  test('invite.messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, InviteMessages)()
  })


  // test('maintain', Maintain)
})


async function makeSeneca() {
  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('entity-util', { when: { active: true } })

  await makeBasicRules(seneca)

  seneca.use(Ledger)

  await makeMockActions(seneca)

  await seneca.ready()

  // print all message patterns
  // console.log(seneca.list())

  return seneca
}

async function makeBasicRules(seneca: any) {
  await seneca.entity('ledger/rule').save$({
    ent: 'ledger/occur',
    cmd: 'save',
    where: { kind: 'create' },
    call: [
      {
        sys: 'email',
        send: 'email',
        fromaddr: '`config:sender.invite.email`',
        subject: '`config:sender.invite.subject`',
        toaddr: '`occur:sender.invite.subject`',
        code: 'invite',
        kind: 'ledger',
      },
    ],
  })

  await seneca.entity('ledger/rule').save$({
    ent: 'ledger/occur',
    cmd: 'save',
    where: { kind: 'accept' },
    call: [
      {
        kind: 'accept',
        award: 'incr',
        field: 'count',
        give: 'award',
        biz: 'ledger',
      },
    ],
  })

  await seneca.entity('ledger/rule').save$({
    ent: 'ledger/occur',
    cmd: 'save',
    where: { kind: 'lost' },
    call: [
      {
        lost: 'entry',
        biz: 'ledger',
      },
    ],
  })
}

async function makeMockActions(seneca: any) {
  seneca.message('sys:email,send:email', async function(this: any, msg: any) {
    this.entity('mock/email').save$({
      toaddr: msg.toaddr,
      fromaddr: msg.fromaddr,
      subject: msg.subject,
      kind: msg.kind,
      code: msg.code,
      what: 'sent',
    })
  })
}
