import { GraphQLServer, Options } from 'graphql-yoga'
import cors from 'cors'

import { permissions } from 'permissions'
import register from 'rest'

import { schema } from './schema'
import { createContext } from './context'
import { bootstrapDefinitions } from 'fhir'

const server = new GraphQLServer({
  schema,
  context: createContext,
  middlewares: [permissions],
})

server.express.use(cors())
register(server.express)

const options: Options = {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
  bodyParserOptions: { limit: '10mb', type: 'application/json' },
}
const { PORT } = process.env

const main = async () => {
  await bootstrapDefinitions()
  await server.start(options, () =>
    console.log(
      `🚀 Server ready at: http://localhost:${PORT || 4000}
      \n⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️`,
    ),
  )
}

main()
