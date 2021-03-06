import { FormGroup, ControlGroup, Button } from '@blueprintjs/core';
import React from 'react';
import { useApolloClient } from '@apollo/react-hooks';
import { useSelector, useDispatch } from 'react-redux';

import { loader } from 'graphql.macro';

import { changeSelectedResource } from 'services/selectedNode/actions';
import { initAttributesMap } from 'services/resourceAttributes/actions';
import { IReduxStore, Resource } from 'types';

import Drawer from './Drawer';
import ResourceSelect from 'components/selects/resourceSelect';

interface Props {
  resources: Resource[];
  loading: boolean;
}

const qResourceAttributes = loader(
  'src/graphql/queries/resourceAttributes.graphql'
);

const ResourceSelector = ({ resources, loading }: Props) => {
  const client = useApolloClient();
  const dispatch = useDispatch();
  const { source, resource } = useSelector(
    (state: IReduxStore) => state.selectedNode
  );
  const [drawerIsOpen, setDrawerIsOpen] = React.useState(false);

  const onClickedResource = async (clickedResource: any) => {
    // Query attributes for corresponding resource
    const {
      data: {
        resource: { attributes }
      }
    } = await client.query({
      query: qResourceAttributes,
      variables: { resourceId: clickedResource.id }
    });

    // Update Redux store
    dispatch(initAttributesMap(attributes));
    dispatch(changeSelectedResource(clickedResource));
  };

  return (
    <>
      <FormGroup>
        <ControlGroup>
          <ResourceSelect
            disabled={!source}
            icon={'layout-hierarchy'}
            inputItem={
              !resource
                ? ({} as Resource)
                : resources.find(r => r.id === resource.id) || ({} as Resource)
            }
            intent={'primary'}
            items={resources}
            loading={loading}
            onChange={onClickedResource}
          />
        </ControlGroup>
        <Button
          icon="more"
          disabled={!resource}
          minimal
          onClick={() => {
            setDrawerIsOpen(true);
          }}
        />
      </FormGroup>
      {resource && (
        <Drawer
          isOpen={drawerIsOpen}
          onCloseCallback={() => {
            setDrawerIsOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ResourceSelector;
