import { Button } from '@blueprintjs/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IReduxStore } from 'types';
import { useMutation } from '@apollo/react-hooks';
import { ApolloError } from 'apollo-client/errors/ApolloError';

import { ISelectedSource } from 'types';

// COMPONENTS
import JoinColumns from '../JoinColumns';
import { loader } from 'graphql.macro';

// GRAPHQL
const qInputsForAttribute = loader(
  'src/graphql/queries/inputsForAttribute.graphql'
);
const mUpdateJoin = loader('src/graphql/mutations/updateJoin.graphql');
const mDeleteJoin = loader('src/graphql/mutations/deleteJoin.graphql');

interface Props {
  joinData: any;
  schema: any;
  source: ISelectedSource;
}

const Join = ({ joinData, schema, source }: Props) => {
  const toaster = useSelector((state: IReduxStore) => state.toaster);
  const {
    attribute: { path }
  } = useSelector((state: IReduxStore) => state.selectedNode);

  const attributesForResource = useSelector(
    (state: IReduxStore) => state.resourceInputs.attributesMap
  );
  const attributeId = attributesForResource[path]
    ? attributesForResource[path].id
    : null;

  const onError = (error: ApolloError): void => {
    const msg =
      error.message === 'GraphQL error: Not Authorised!'
        ? 'You only have read access on this source.'
        : error.message;
    toaster.show({
      icon: 'error',
      intent: 'danger',
      message: msg,
      timeout: 4000
    });
  };

  const [updateJoin, { loading: updatingJoin }] = useMutation(mUpdateJoin, {
    onError
  });
  const [deleteJoin, { loading: deletingJoin }] = useMutation(mDeleteJoin, {
    onError
  });

  const removeJoin = (input: any) => {
    return {
      ...input,
      sqlValue: {
        ...input.sqlValue,
        joins: input.sqlValue.joins.filter((j: any) => j.id !== joinData.id)
      }
    };
  };

  const removeJoinFromCache = (cache: any) => {
    const { attribute: dataAttribute } = cache.readQuery({
      query: qInputsForAttribute,
      variables: {
        attributeId
      }
    });
    const newDataAttribute = {
      ...dataAttribute,
      inputs: dataAttribute.inputs.map(removeJoin)
    };
    cache.writeQuery({
      query: qInputsForAttribute,
      variables: {
        attributeId
      },
      data: { attribute: newDataAttribute }
    });
  };

  return (
    <div className={'join'}>
      <Button
        icon={'trash'}
        minimal={true}
        loading={updatingJoin || deletingJoin}
        onClick={() => {
          deleteJoin({
            variables: {
              id: joinData.id
            },
            update: removeJoinFromCache
          });
        }}
      />

      <JoinColumns
        join={joinData}
        updateJoin={updateJoin}
        schema={schema}
        source={source}
      />
    </div>
  );
};

export default Join;
