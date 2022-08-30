const Seneca = require('seneca')
const Plugin = require('..')

Seneca({legacy:false})
  .test('print')
  .use('promisify')
  .use('entity')
  .use('entity-util',{when:{active:true}})
  .use(Plugin)
  .use('repl',{port:31313})

