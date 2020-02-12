import { arg, idArg, queryType } from 'nexus'

import { getUserId } from 'utils'
import { searchDefinitions } from './StructureDefinition'
import { getDefinition } from 'fhir'

export const Query = queryType({
  definition(t) {
    t.field('me', {
      type: 'User',
      nullable: true,
      resolve: (parent, args, ctx) => {
        const userId = getUserId(ctx)
        return ctx.photon.users.findOne({
          where: {
            id: userId,
          },
        })
      },
    })

    t.field('credential', {
      type: 'Credential',
      args: {
        credentialId: idArg({ nullable: false }),
      },
      nullable: true,
      resolve: (parent, { credentialId }, ctx) =>
        ctx.photon.credentials.findOne({ where: { id: credentialId } }),
    })

    t.list.field('templates', {
      type: 'Template',
      nullable: true,
      resolve: (parent, args, ctx) => ctx.photon.templates(),
    })

    t.field('template', {
      type: 'Template',
      args: {
        templateId: idArg({ nullable: false }),
      },
      nullable: true,
      resolve: (parent, { templateId }, ctx) =>
        ctx.photon.templates.findOne({ where: { id: templateId } }),
    })

    t.list.field('sources', {
      type: 'Source',
      nullable: true,
      resolve: (parent, args, ctx) => ctx.photon.sources(),
    })

    t.field('source', {
      type: 'Source',
      args: {
        sourceId: idArg({ nullable: false }),
      },
      nullable: true,
      resolve: (parent, { sourceId }, ctx) =>
        ctx.photon.sources.findOne({ where: { id: sourceId } }),
    })

    t.field('resource', {
      type: 'Resource',
      args: {
        resourceId: idArg({ nullable: false }),
      },
      nullable: true,
      resolve: (parent, { resourceId }, ctx) =>
        ctx.photon.resources.findOne({
          where: { id: resourceId },
          include: { attributes: true },
        }),
    })

    t.list.field('resources', {
      type: 'Resource',
      nullable: true,
      args: {
        filter: arg({
          type: 'ResourceWhereInput',
        }),
      },
      resolve: (parent, { filter }, ctx) =>
        ctx.photon.resources({ where: filter }),
    })

    t.field('attribute', {
      type: 'Attribute',
      args: {
        attributeId: idArg({ nullable: false }),
      },
      nullable: true,
      resolve: (parent, { attributeId }, ctx) =>
        ctx.photon.attributes.findOne({ where: { id: attributeId } }),
    })

    t.field('structureDefinition', {
      type: 'StructureDefinition',
      args: {
        definitionId: idArg({ nullable: false }),
      },
      nullable: true,
      resolve: async (_, { definitionId }) => {
        const def = await getDefinition(definitionId)
        if (!def) {
          return null
        }
        return {
          def,
          id: definitionId,
        }
      },
    })

    t.list.field('structureDefinitions', {
      type: 'StructureDefinition',
      args: {
        filter: arg({ type: 'StructureDefinitionWhereFilter', required: true }),
      },
      nullable: true,
      resolve: (_, { filter }) => searchDefinitions(filter),
    })
  },
})
