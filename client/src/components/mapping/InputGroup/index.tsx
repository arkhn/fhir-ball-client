import React from 'react';
import { Button, Tag } from '@blueprintjs/core';
import { useMutation } from '@apollo/react-hooks';
import { useSelector } from 'react-redux';
import { onError } from 'services/apollo';
import { loader } from 'graphql.macro';

import ScriptSelect from 'components/selects/scriptSelect';
import InputColumn from '../InputColumn';
import InputCondition from '../InputCondition';

import { IReduxStore } from 'types';

// GRAPHQL
const mUpdateInputGroup = loader(
  'src/graphql/mutations/updateInputGroup.graphql'
);
const mCreateCondition = loader(
  'src/graphql/mutations/addConditionToInputGroup.graphql'
);

interface Props {
  inputGroup: any;
}

const InputGroup = ({ inputGroup }: Props) => {
  const toaster = useSelector((state: IReduxStore) => state.toaster);
  const { attribute, selectedInputGroup } = useSelector(
    (state: IReduxStore) => state.selectedNode
  );
  const attributesForResource = useSelector(
    (state: IReduxStore) => state.resourceInputs.attributesMap
  );

  const path = attribute.path;
  let inputGroupId = attributesForResource[path].inputGroups[selectedInputGroup].id;

  const [
    updateInputGroup,
    { loading: loadingMutation }
  ] = useMutation(mUpdateInputGroup, { onError: onError(toaster) });
  const [createCondition] = useMutation(mCreateCondition, {
    onError: onError(toaster)
  });

  const onChangeMergingScript = (script: string) => {
    updateInputGroup({
      variables: {
        inputGroupId,
        mergingScript: script
      }
    });
  };

  const onClearMergingScript = (): any => {
    updateInputGroup({
      variables: {
        inputGroupId,
        mergingScript: null
      }
    });
  };

  return (
    <React.Fragment>
      {inputGroup.conditions.map(
        (condition: any, index: number) =>
          condition && <InputCondition key={index} condition={condition} />
      )}
      <Button
        icon={'add'}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          createCondition({
            variables: {
              inputGroupId: inputGroup.id
            }
          });
        }}
      >
        Add condition
      </Button>
      <div id="input-columns">
        <div id="input-column-rows">
          {inputGroup.inputs.map(
            (input: any, index: number) =>
              input && <InputColumn key={index} input={input} />
          )}
        </div>
        {inputGroup.inputs.length > 1 ? (
          <div id="input-column-merging-script">
            <div className="stacked-tags" onClick={e => e.stopPropagation()}>
              <Tag>SCRIPT</Tag>
              <ScriptSelect
                loading={loadingMutation}
                selectedScript={inputGroup.mergingScript}
                onChange={onChangeMergingScript}
                onClear={onClearMergingScript}
              />
            </div>
          </div>
        ) : null}
      </div>
    </React.Fragment>
  );
};

export default InputGroup;
