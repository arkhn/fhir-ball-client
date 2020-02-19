import React from 'react';
import { useQuery } from '@apollo/react-hooks';
import { useSelector, useDispatch } from 'react-redux';

// ACTIONS
import { updateFhirAttribute } from 'services/selectedNode/actions';

// COMPONENTS
import AddResource from './AddResource';
import FhirResourceTree from './FhirResourceTree';
import ResourceSelector from './ResourceSelector';

import { IReduxStore } from 'types';

import { loader } from 'graphql.macro';
import { Node } from 'components/mapping/FhirMappingPanel/FhirResourceTree/node';

// GRAPHQL
const qResourcesForSource = loader(
  'src/graphql/queries/resourcesForSource.graphql'
);

const FhirMappingPanel = () => {
  const dispatch = useDispatch();
  const { source, resource } = useSelector(
    (state: IReduxStore) => state.selectedNode
  );

  const [createdResources, setCreatedResources] = React.useState(0);

  const { data: dataResources, loading: loadingResources } = useQuery(
    qResourcesForSource,
    {
      variables: {
        sourceId: source ? source.id : null
      },
      skip: !source
    }
  );

  const renderResourceTree = () => {
    return (
      <div id="fhir-resource-tree">
        <FhirResourceTree
          onClickCallback={(nodeData: Node) => {
            dispatch(updateFhirAttribute(nodeData));
          }}
        />
      </div>
    );
  };

  return (
    <>
      <div id="fhir-attributes">
        <div id="resource-selector">
          <ResourceSelector
            resources={
              loadingResources || !dataResources
                ? []
                : dataResources.source.resources
            }
            loading={loadingResources}
            deleteResourceCallback={() => {
              setCreatedResources(createdResources - 1);
            }}
          />
        </div>
        {resource && renderResourceTree()}
      </div>
      <div id="resource-add">
        <AddResource
          callback={() => {
            setCreatedResources(createdResources + 1);
          }}
        />
      </div>
    </>
  );
};

export default FhirMappingPanel;
