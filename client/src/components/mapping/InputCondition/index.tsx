import React from 'react';
import {
  Breadcrumbs,
  Button,
  ButtonGroup,
  Card,
  Elevation,
  IBreadcrumbProps,
  Tag
} from '@blueprintjs/core';
import { useMutation } from '@apollo/react-hooks';
import { useSelector } from 'react-redux';
import { loader } from 'graphql.macro';

import { onError as onApolloError } from 'services/apollo';
import { Condition, IReduxStore } from 'types';
import Join from 'components/mapping/Join';

// GRAPHQL
const qInputsForAttribute = loader(
  'src/graphql/queries/inputsForAttribute.graphql'
);
const mDeleteCondition = loader(
  'src/graphql/mutations/deleteCondition.graphql'
);

interface Props {
  condition: Condition;
}

const conditionsMap = new Map([
  ['EQ', '=='],
  ['LT', '<'],
  ['LE', '<='],
  ['GE', '>='],
  ['GT', '>'],
  ['NULL', 'IS NULL'],
  ['NOTNULL', 'IS NOT NULL']
]);
const unaryRelations = ['NULL', 'NOTNULL'];

const InputCondition = ({ condition }: Props) => {
  const toaster = useSelector((state: IReduxStore) => state.toaster);
  const path = useSelector(
    (state: IReduxStore) => state.selectedNode.attribute.path
  );
  const attributesMap = useSelector(
    (state: IReduxStore) => state.resourceInputs.attributesMap
  );
  const attributeId = attributesMap[path].id;

  const onError = onApolloError(toaster);

  const [deleteCondition, { loading: loadDelete }] = useMutation(
    mDeleteCondition,
    {
      onError
    }
  );

  const removeConditionFromCache = (conditionId: string) => (cache: any) => {
    const { attribute: dataAttribute } = cache.readQuery({
      query: qInputsForAttribute,
      variables: {
        attributeId: attributeId
      }
    });
    const newDataAttribute = {
      ...dataAttribute,
      inputGroups: dataAttribute.inputGroups.map((group: any) => ({
        ...group,
        conditions: group.conditions.filter(
          (c: Condition) => c.id !== conditionId
        )
      }))
    };
    cache.writeQuery({
      query: qInputsForAttribute,
      variables: {
        attributeId: attributeId
      },
      data: { attribute: newDataAttribute }
    });
  };

  const onClickDelete = async (condition: Condition) =>
    await deleteCondition({
      variables: {
        conditionId: condition.id
      },
      update: removeConditionFromCache(condition.id)
    });

  return (
    <div className="input-card">
      <Card elevation={Elevation.ZERO} className="input-column-info">
        <div className="input-column-name">
          <div className="stacked-tags">
            <Tag minimal={true}>ACTION</Tag>
            <Tag intent={'primary'} large={true}>
              {condition.action}
            </Tag>
          </div>
          <div className="stacked-tags">
            <Tag minimal={true}>COLUMN</Tag>
            <Breadcrumbs
              breadcrumbRenderer={(item: IBreadcrumbProps) => (
                <div>{item.text}</div>
              )}
              items={[
                {
                  text: (
                    <Tag intent={'primary'} large={true}>
                      {condition.sqlValue.table}
                    </Tag>
                  )
                },
                {
                  text: (
                    <Tag intent={'primary'} large={true}>
                      {condition.sqlValue.column}
                    </Tag>
                  )
                }
              ]}
            />
          </div>
          <div className="input-column-joins">
            {condition.sqlValue.joins && condition.sqlValue.joins.length > 0 && (
              <div className="input-column-join">
                {condition.sqlValue.joins.map((join: any, index: number) => (
                  <Join key={index} joinData={join} intent={'primary'} />
                ))}
              </div>
            )}
          </div>
          <div className="stacked-tags">
            <Tag minimal={true}>RELATION</Tag>
            <Tag intent={'primary'} large={true}>
              {`${conditionsMap.get(condition.relation)} ${
                unaryRelations.includes(condition.relation)
                  ? ''
                  : condition.value
              }`}
            </Tag>
          </div>
        </div>
      </Card>
      <ButtonGroup vertical={true}>
        <Button
          icon={'trash'}
          loading={loadDelete}
          minimal={true}
          onClick={() => {
            onClickDelete(condition);
          }}
        />
      </ButtonGroup>
    </div>
  );
};

export default InputCondition;
