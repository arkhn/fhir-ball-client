import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import FormData from 'form-data'

const prismaClient = new PrismaClient()

const {
  SUPERUSER_EMAIL,
  SUPERUSER_PASSWORD,
  IDENTITY_PROVIDER_URL,
} = process.env

const main = async () => {
  if (!SUPERUSER_PASSWORD) throw Error('superuser password is required')
  const res = await prismaClient.user.count({
    where: { name: 'admin', email: SUPERUSER_EMAIL },
  })
  if (res) {
    console.warn(`user ${SUPERUSER_EMAIL} already exists, skipping...`)
    return
  }
  const user = {
    name: 'admin',
    password: SUPERUSER_PASSWORD as string,
    email: SUPERUSER_EMAIL || 'admin@arkhn.com',
  }
  let form = new FormData()
  form.append('name', user.name)
  form.append('password', user.password)
  form.append('email', user.email)
  await axios.post(`${IDENTITY_PROVIDER_URL}/signup`, form, {
    headers: form.getHeaders(),
  })
  await prismaClient.user.create({
    data: {
      name: user.name,
      email: user.email,
      role: 'ADMIN',
    },
  })
}

prismaClient
  .$connect()
  .then(() => main())
  .then(() => prismaClient.$disconnect())
  .catch(err => {
    console.error(err)
    prismaClient.$disconnect()
  })
