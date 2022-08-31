/* Copyright © 2022 Seneca Project Contributors, MIT License. */

import Seneca from 'seneca'
import SenecaMsgTest from 'seneca-msg-test'
// import { Maintain } from '@seneca/maintain'

import LedgerDoc from '../src/ledger-doc'
import Ledger from '../src/ledger'

import BasicMessages from './basic.messages'


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


  test('basic.messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, BasicMessages)()
  })




  // test('maintain', Maintain)
})


async function makeSeneca() {
  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('entity-util', { when: { active: true } })
    .use(Ledger)

  await seneca.ready()

  // print all message patterns
  // console.log(seneca.list())

  return seneca
}

