import { objectType, FieldResolver } from '@nexus/schema'

export const Input = objectType({
  name: 'Input',
  definition(t) {
    t.model.id()

    t.model.sqlValue()
    t.model.script()
    t.model.staticValue()

    t.model.conceptMapId()

    t.model.inputGroup()

    t.model.updatedAt()
    t.model.createdAt()
  },
})

export const createInput: FieldResolver<'Mutation', 'createInput'> = async (
  _parent,
  { inputGroupId, script, conceptMapId, static: staticValue, sql: sqlValue },
  ctx,
) => {
  if (!sqlValue && !staticValue) {
    throw new Error(`Input needs to have either a sql or static value`)
  } else if (sqlValue && staticValue) {
    throw new Error(`Input cannot have both a static and sql value`)
  }

  if (staticValue) {
    return ctx.prisma.input.create({
      data: {
        staticValue,
        script,
        conceptMapId,
        inputGroup: {
          connect: {
            id: inputGroupId,
          },
        },
      },
    })
  }

  return ctx.prisma.input.create({
    data: {
      sqlValue: {
        create: {
          table: sqlValue.table,
          column: sqlValue.column,
          ...(sqlValue.joins && {
            joins: {
              create: sqlValue.joins.map(j => ({
                tables: {
                  create: [
                    {
                      table: (j.tables && j.tables[0]?.table) || '',
                      column: (j.tables && j.tables[0]?.column) || '',
                    },
                    {
                      table: (j.tables && j.tables[1]?.table) || '',
                      column: (j.tables && j.tables[1]?.column) || '',
                    },
                  ],
                },
              })),
            },
          }),
        },
      },
      script,
      conceptMapId,
      inputGroup: {
        connect: {
          id: inputGroupId,
        },
      },
    },
  })
}

export const deleteInput: FieldResolver<'Mutation', 'deleteInput'> = async (
  _parent,
  { inputId },
  ctx,
) => {
  const input = await ctx.prisma.input.delete({
    where: { id: inputId },
    include: {
      inputGroup: {
        include: { inputs: true, conditions: { include: { sqlValue: true } } },
      },
    },
  })

  if (input.inputGroup?.inputs.length === 1) {
    await Promise.all(
      input.inputGroup.conditions.map(async c => {
        if (c.sqlValue)
          await ctx.prisma.column.delete({ where: { id: c.sqlValue.id } })
        return ctx.prisma.condition.delete({ where: { id: c.id } })
      }),
    )
    await ctx.prisma.inputGroup.delete({
      where: { id: input.inputGroup.id },
    })
  }

  return input
}

export const updateInput: FieldResolver<'Mutation', 'updateInput'> = async (
  _parent,
  { inputId, data },
  ctx,
) => {
  return ctx.prisma.input.update({
    where: { id: inputId },
    data,
  })
}
