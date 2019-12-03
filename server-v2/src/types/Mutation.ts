import {
  arg,
  idArg,
  mutationType,
  stringArg,
  booleanArg,
  inputObjectType,
  enumType,
  objectType,
} from 'nexus'

import { createResource, deleteResource } from './Resource'
import { deleteSource, createSource } from './Source'
import { createAttribute, updateAttribute, deleteAttribute } from './Attribute'
import { signup, login } from './User'
import { createInput, updateInput, deleteInput } from './Input'
import { deleteCredential, upsertCredential } from './Credential'
import { createTemplate, deleteTemplate } from './Template'

export const Mutation = mutationType({
  /*
   * AUTH
   */

  definition(t) {
    t.field('signup', {
      type: 'AuthPayload',
      args: {
        name: stringArg({ required: true }),
        email: stringArg({ required: true }),
        password: stringArg({ required: true }),
      },
      resolve: signup,
    })

    t.field('login', {
      type: 'AuthPayload',
      args: {
        email: stringArg({ required: true }),
        password: stringArg({ required: true }),
      },
      resolve: login,
    })

    /*
     * SOURCE
     */

    t.field('createTemplate', {
      type: 'Template',
      args: {
        name: stringArg({ required: true }),
      },
      resolve: createTemplate,
    })

    t.field('deleteTemplate', {
      type: 'Template',
      args: {
        id: idArg({ required: true }),
      },
      resolve: deleteTemplate,
    })

    /*
     * SOURCE
     */

    t.field('createSource', {
      type: 'Source',
      args: {
        templateName: stringArg({ required: true }),
        name: stringArg({ required: true }),
        hasOwner: booleanArg({ required: true }),
      },
      resolve: createSource,
    })

    t.field('deleteSource', {
      type: 'Source',
      args: {
        name: stringArg({ required: true }),
      },
      resolve: deleteSource,
    })

    /*
     * CREDENTIAL
     */

    t.field('upsertCredential', {
      type: 'Credential',
      args: {
        sourceId: idArg({ required: true }),
        host: stringArg({ required: true }),
        port: stringArg({ required: true }),
        database: stringArg({ required: true }),
        login: stringArg({ required: true }),
        password: stringArg({ required: true }),
        model: stringArg({ required: true }),
      },
      resolve: upsertCredential,
    })

    t.field('deleteCredential', {
      type: 'Credential',
      args: {
        id: idArg({ required: true }),
      },
      resolve: deleteCredential,
    })

    /*
     * RESOURCE
     */

    t.field('createResource', {
      type: 'Resource',
      args: {
        sourceId: idArg({ required: true }),
        resourceName: stringArg({ required: true }),
      },
      resolve: createResource,
    })

    t.field('deleteResource', {
      type: 'Resource',
      args: {
        id: idArg({ required: true }),
      },
      resolve: deleteResource,
    })

    /*
     * ATTRIBUTE
     */

    t.field('createAttribute', {
      type: 'Attribute',
      args: {
        parentId: idArg({ required: true }),
        name: stringArg({ required: true }),
        fhirType: stringArg({ required: true }),
        mergingScript: stringArg(),
      },
      resolve: createAttribute,
    })

    t.field('updateAttribute', {
      type: 'Attribute',
      args: {
        attributeId: idArg({ required: true }),
        data: inputObjectType({
          name: 'UpdateAttributeInput',
          definition(t) {
            t.string('description')
            t.string('mergingScript')
          },
        }),
      },
      resolve: updateAttribute,
    })

    t.field('deleteAttribute', {
      type: 'Attribute',
      args: {
        id: idArg({ required: true }),
      },
      resolve: deleteAttribute,
    })

    /*
     * Input
     */

    t.field('createInput', {
      type: 'Input',
      args: {
        attributeId: idArg({ required: true }),
        static: stringArg(),
        sql: inputObjectType({
          name: 'SqlValueInput',
          definition(t) {
            t.string('owner')
            t.string('table')
            t.string('column')
            t.list.field('joins', {
              type: 'JoinInput',
            })
          },
        }),
      },
      resolve: createInput,
    })

    t.field('updateInput', {
      type: 'Input',
      resolve: updateInput,
    })

    t.field('deleteInput', {
      type: 'Input',
      args: {
        id: idArg({ required: true }),
      },
      resolve: deleteInput,
    })
  },
})
