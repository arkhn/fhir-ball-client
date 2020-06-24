import {
  Button,
  FileInput,
  FormGroup,
  InputGroup,
  IToastProps,
  ProgressBar,
  HTMLSelect,
  Icon
} from '@blueprintjs/core';
import axios from 'axios';
import React, { useState } from 'react';
import { useApolloClient, useQuery, useMutation } from '@apollo/react-hooks';
import { useSelector } from 'react-redux';
import useReactRouter from 'use-react-router';
import { loader } from 'graphql.macro';

import Navbar from 'components/navbar';
import { onError } from 'services/apollo';

import { FHIR_API_URL, PAGAI_URL } from '../../constants';
import { ITemplate, IReduxStore } from 'types';

import './style.scss';

// GRAPHQL OPERATIONS
const qSourceAndTemplateNames = loader(
  'src/graphql/queries/sourceAndTemplateNames.graphql'
);
const mCreateTemplate = loader('src/graphql/mutations/createTemplate.graphql');
const mCreateSource = loader('src/graphql/mutations/createSource.graphql');
const mUpsertCredential = loader(
  'src/graphql/mutations/upsertCredential.graphql'
);

const models = ['POSTGRES', 'ORACLE'];

const NewSourceView = (): React.ReactElement => {
  const client = useApolloClient();
  const { history } = useReactRouter();

  const toaster = useSelector((state: IReduxStore) => state.toaster);

  const [templateName, setTemplateName] = useState('');
  const [templateExists, setTemplateExists] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [mappingFile, setMappingFile] = useState(undefined as File | undefined);
  const [fhirBundleFile, setFhirBundleFile] = useState(
    undefined as File | undefined
  );
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState('');
  const [login, setLogin] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [database, setDatabase] = React.useState('');
  const [model, setModel] = React.useState(models[0]);
  const [availableOwners, setAvailableOwners] = React.useState(
    null as string[] | null
  );

  const { data: dataNames } = useQuery(qSourceAndTemplateNames, {
    fetchPolicy: 'network-only'
  });

  // Build a map where keys are template names
  // and values are lists of source names for each template
  const mapTemplateToSourceNames = dataNames
    ? dataNames.templates.reduce(
        (map: Record<string, string[]>, template: ITemplate) => ({
          ...map,
          [template.name]: template.sources.map(s => s.name)
        }),
        {}
      )
    : {};

  const renderToastProps = ({
    action,
    uploadProgress,
    success,
    message
  }: any): IToastProps => {
    return {
      action,
      icon: 'cloud-upload',
      intent:
        typeof uploadProgress !== 'undefined'
          ? undefined
          : success
          ? 'success'
          : 'danger',
      message: uploadProgress ? (
        <ProgressBar
          intent={uploadProgress < 1 ? 'primary' : 'success'}
          value={uploadProgress}
        />
      ) : (
        message
      ),
      timeout: uploadProgress < 1 ? 0 : 2500
    };
  };

  const createTemplate = () =>
    client.mutate({
      mutation: mCreateTemplate,
      variables: {
        name: templateName
      }
    });

  const createSource = async (): Promise<any> => {
    if (mappingFile) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(mappingFile);
        reader.onload = async (e: ProgressEvent<FileReader>): Promise<void> => {
          const mapping = e.target?.result;
          if (!mapping) {
            reject(e.target?.error);
          }
          try {
            JSON.parse(mapping as string);
          } catch (e) {
            reject(new Error(`could not parse ${mappingFile.name} as JSON`));
          }
          try {
            const { data } = await client.mutate({
              mutation: mCreateSource,
              variables: {
                templateName,
                mapping,
                credentialId: null,
                name: sourceName
              }
            });
            resolve(data.createSource);
          } catch (err) {
            reject(
              new Error(
                `error while creating resource: ${err.graphQLErrors[0].message}`
              )
            );
          }
        };
        reader.onerror = (e: ProgressEvent<FileReader>): void => reject(e);
      });
    } else {
      const { data } = await client.mutate({
        mutation: mCreateSource,
        variables: {
          templateName,
          name: sourceName,
          credentialId: null
        }
      });
      return data.createSource;
    }
  };

  const uploadFhirBundle = async (): Promise<void> => {
    if (!fhirBundleFile) return;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(fhirBundleFile!);
      reader.onload = async (e: ProgressEvent<FileReader>): Promise<void> => {
        const bundle = e.target?.result;
        let bundleJson: any;
        if (!bundle) {
          reject(e.target?.error);
        }
        try {
          bundleJson = JSON.parse(bundle as string);
        } catch (e) {
          reject(new Error(`could not parse ${fhirBundleFile!.name} as JSON`));
        }
        // Check that we only have StructureDefinitions, ConceptMaps,
        // or CodeSystems in the bundle
        const authorizedTypes = [
          'StructureDefinition',
          'ConceptMap',
          'CodeSystem'
        ];
        const resourceTypes = bundleJson.entry.map(
          (entry: any) => entry.resource.resourceType
        );
        if (
          resourceTypes.some((type: string) => !authorizedTypes.includes(type))
        )
          reject(
            new Error(
              `Source created but failed while trying to upload a bundle with 
              resource which type is not
              StructureDefinition, ConceptMap, nor CodeSystem`
            )
          );
        // Upload the bundle
        await axios.post(`${FHIR_API_URL}/upload-bundle`, bundleJson);
        resolve();
      };
      reader.onerror = (e: ProgressEvent<FileReader>): void => reject(e);
    });
  };

  const fetchAvailableOwners = async (credentials: {
    model: string;
    host: string;
    port: string;
    database: string;
    login: string;
    password: string;
  }) => {
    try {
      const { data } = await axios.post(`${PAGAI_URL}/get_owners`, credentials);
      setAvailableOwners(data);
    } catch (err) {
      setAvailableOwners(null);
      toaster.show({
        message: `Could not fetch available database owners: ${
          err.response ? err.response.data.error : err.message
        }`,
        intent: 'danger',
        icon: 'warning-sign',
        timeout: 5000
      });
    }
  };

  const submitCredentials = async (source: { id: string }) => {
    await upsertCredential({
      variables: {
        host,
        port,
        login,
        database,
        owner,
        password,
        model,
        sourceId: source.id
      }
    });
  };

  const [upsertCredential] = useMutation(mUpsertCredential, {
    onError: onError(toaster)
  });

  const onFormSubmit = async (e: any): Promise<void> => {
    e.preventDefault();

    const toastID = toaster.show(
      renderToastProps({
        action: {
          text: 'Interrompre'
        },
        uploadProgress: 0
      })
    );

    try {
      // Create new template in Graphql if it doesn't exist
      if (!templateExists) {
        await createTemplate();
      }
      // Create new source
      const source = await createSource();

      // create database credentials
      await submitCredentials(source);

      // Upload bundle
      await uploadFhirBundle();
      // After source is created,
      // redirect to /sources page.
      toaster.show(
        renderToastProps({
          message: `Source ${sourceName} was created`,
          success: true
        }),
        toastID
      );
      history.push('/');
    } catch (e) {
      toaster.show(
        renderToastProps({
          message: e.message,
          success: false
        }),
        toastID
      );
    }
  };

  return (
    <div>
      <Navbar />
      <div id="main-container-newsource">
        <form onSubmit={onFormSubmit}>
          <h1>Nom du template</h1>
          <InputGroup
            onChange={(event: React.FormEvent<HTMLElement>) => {
              const target = event.target as HTMLInputElement;
              setTemplateName(target.value);
              setTemplateExists(
                !!target.value && target.value in mapTemplateToSourceNames
              );
            }}
            name={'templateName'}
            placeholder="Nom du template..."
            value={templateName}
          />
          <h1>Nom de la source</h1>
          <FormGroup
            helperText={
              templateName &&
              templateName in mapTemplateToSourceNames &&
              mapTemplateToSourceNames[templateName].indexOf(sourceName) >=
                0 ? (
                <p className={'warning'}>
                  Ce nom existe déjà pour ce template et n'est pas disponible.
                </p>
              ) : null
            }
          >
            <InputGroup
              onChange={(event: React.FormEvent<HTMLElement>): void => {
                const target = event.target as HTMLInputElement;
                setSourceName(target.value);
              }}
              name={'sourceName'}
              placeholder="Nom de la source..."
              value={sourceName}
            />
          </FormGroup>
          <h1>Importer un mapping existant (optionnel)</h1>
          <FileInput
            fill
            inputProps={{
              onChange: (event: React.FormEvent<HTMLInputElement>): void => {
                const target = event.target as any;
                setMappingFile(target.files[0]);
              },
              name: 'mapping'
            }}
            text={
              mappingFile ? (
                mappingFile.name
              ) : (
                <p className="disabled-text">Importer un mapping...</p>
              )
            }
          />
          <h1>Importer des ressources fhir (optionnel)</h1>
          <FileInput
            fill
            inputProps={{
              onChange: (event: React.FormEvent<HTMLInputElement>): void => {
                const target = event.target as any;
                setFhirBundleFile(target.files[0]);
              },
              name: 'bundle'
            }}
            text={
              fhirBundleFile ? (
                fhirBundleFile.name
              ) : (
                <p className="disabled-text">Importer un bundle fhir...</p>
              )
            }
          />
          <h1>Database Credentials</h1>
          <div>
            <div className="db-credential-container">
              <InputGroup
                className="credential-field"
                value={host}
                leftIcon={'desktop'}
                onChange={(event: any): void => {
                  setHost(event.target.value);
                }}
                placeholder={'Host'}
              />
              <InputGroup
                className="credential-field"
                value={port}
                leftIcon={'numerical'}
                onChange={(event: any): void => {
                  setPort(event.target.value);
                }}
                placeholder={'Port'}
              />
              <InputGroup
                className="credential-field"
                value={database}
                leftIcon={'database'}
                onChange={(event: any): void => {
                  setDatabase(event.target.value);
                }}
                placeholder={'Database name'}
              />
              <InputGroup
                className="credential-field"
                value={login}
                leftIcon={'user'}
                onChange={(event: any): void => {
                  setLogin(event.target.value);
                }}
                placeholder={'Login'}
              />
              <InputGroup
                className="credential-field"
                value={password}
                leftIcon={'key'}
                onChange={(event: any): void => {
                  setPassword(event.target.value);
                }}
                placeholder={'Password'}
                type={'password'}
              />
            </div>
            <div className="db-credential-container">
              <FormGroup
                label="Database model"
                labelFor="text-input"
                className="credential-field"
              >
                <HTMLSelect
                  options={models || []}
                  onChange={ev => {
                    setModel(ev.currentTarget.value);
                  }}
                />
              </FormGroup>
              <FormGroup
                label="Database owner"
                labelFor="text-input"
                className="credential-field"
              >
                <HTMLSelect
                  disabled={!availableOwners}
                  options={availableOwners || []}
                  onChange={ev => {
                    setOwner(ev.currentTarget.value);
                  }}
                />
              </FormGroup>
            </div>
            {!availableOwners && (
              <Button
                intent="primary"
                disabled={
                  !(host && port && database && login && password && model)
                }
                icon={<Icon intent={'success'} icon={'link'} />}
                onClick={() =>
                  fetchAvailableOwners({
                    host,
                    port,
                    database,
                    login,
                    password,
                    model
                  })
                }
              >
                Connect database
              </Button>
            )}
          </div>
          <div className="align-right">
            <Button
              disabled={
                !(
                  templateName &&
                  sourceName &&
                  host &&
                  port &&
                  database &&
                  login &&
                  password &&
                  model &&
                  owner
                ) ||
                (templateName in mapTemplateToSourceNames &&
                  mapTemplateToSourceNames[templateName].indexOf(sourceName) >=
                    0)
              }
              intent="primary"
              large
              type="submit"
            >
              Ajouter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSourceView;
