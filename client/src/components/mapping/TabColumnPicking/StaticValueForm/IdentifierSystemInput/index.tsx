import {
  Button,
  Checkbox,
  ControlGroup,
  InputGroup,
  Popover,
  Position
} from '@blueprintjs/core';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { IReduxStore } from 'types';

import { Attribute } from '@arkhn/fhir.ts';

import SourceSelect from 'components/selects/sourceSelect';
import ResourceSelect from 'components/selects/resourceSelect';

import { Resource } from 'types';

interface Props {
  attribute: Attribute;
  sources: Source[];
  creatingStaticInput: boolean;
  addStaticValue: (value: string) => Promise<void>;
}

interface Source {
  id: string;
  name: string;
  template: {
    name: string;
  };
  resources: Resource[];
}

const IdentifierSystemInput = ({
  attribute,
  sources,
  creatingStaticInput,
  addStaticValue
}: Props): React.ReactElement => {
  // If the current attribute is the identifier of the resource and not a Reference identifier
  const isRootIdentifierSystem = !attribute.parent?.parent;

  const { source, resource } = useSelector(
    (state: IReduxStore) => state.selectedNode
  );

  const [staticValue, setStaticValue] = useState('');
  const [customSystem, setCustomSystem] = useState(false);
  const [selectedSource, setSelectedSource] = useState(
    undefined as Source | undefined
  );
  const [selectedResource, setSelectedResource] = useState(
    undefined as Resource | undefined
  );

  useEffect(() => {
    if (isRootIdentifierSystem) {
      setSelectedSource(source);
      setSelectedResource(resource);
    } else {
      setSelectedSource(undefined);
      setSelectedResource(undefined);
    }
  }, [attribute, source, resource]);

  const handleSourceSelect = (source: Source): void => {
    setSelectedSource(source);
    setSelectedResource(undefined);
  };
  const handleResourceSelect = (resource: Resource): void => {
    setSelectedResource(resource);
  };

  return (
    <ControlGroup>
      {customSystem ? (
        <>
          <SourceSelect
            items={sources}
            onChange={handleSourceSelect}
            inputItem={selectedSource || ({} as Source)}
            disabled={isRootIdentifierSystem}
          />
          <ResourceSelect
            items={selectedSource?.resources || []}
            onChange={handleResourceSelect}
            inputItem={selectedResource || ({} as Resource)}
            disabled={selectedSource === undefined || isRootIdentifierSystem}
          />
        </>
      ) : (
        <InputGroup
          onChange={(event: React.FormEvent<HTMLElement>): void => {
            const target = event.target as HTMLInputElement;
            setStaticValue(target.value);
          }}
          placeholder="Static input"
          value={staticValue}
        />
      )}
      <Button
        disabled={
          (customSystem && selectedResource === undefined) ||
          (!customSystem && staticValue.length === 0)
        }
        icon={'add'}
        loading={creatingStaticInput}
        onClick={() =>
          addStaticValue(
            `http://terminology.arkhn.org/${selectedSource!.id}/${
              selectedResource!.id
            }`
          )
        }
      />
      <Checkbox
        className="custom-checkbox"
        checked={customSystem}
        label="Custom system"
        onChange={(): void => setCustomSystem(!customSystem)}
      />
      <Popover
        interactionKind="hover"
        boundary="viewport"
        className="help-popover"
        position={Position.BOTTOM_RIGHT}
      >
        <Button icon="help" minimal={true} small={true} />
        {
          <div>
            <p className="text">
              The identifier system is a URI that defines a set of identifiers
              (i.e. how the value is made unique). For istance, we use
              "http://hl7.org/fhir/sid/us-ssn" for United States Social Security
              Number (SSN) identifier values. Sometimes, the identifiers are not
              a recognized standard so we need to use a custom system. Pyrog's
              custom systems have the form
              "http://terminology.arkhn.org/sourceId/resourceId".
            </p>
          </div>
        }
      </Popover>
    </ControlGroup>
  );
};

export default IdentifierSystemInput;
